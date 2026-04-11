const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');
const https = require('https');

// Robust DoH Fallback Logic
const dnsCache = {};
const CACHE_TTL = 300000;

function getCached(key) {
    const cached = dnsCache[key];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) return cached.data;
    return null;
}

function setCache(key, data) {
    dnsCache[key] = { data, timestamp: Date.now() };
}

async function fetchDoH(name, type = 'A') {
    const cacheKey = `${name}:${type}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    return new Promise((resolve, reject) => {
        const url = `https://8.8.8.8/resolve?name=${name}&type=${type}`;
        const options = { headers: { 'Host': 'dns.google' }, rejectUnauthorized: false };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.Status === 0 && json.Answer) {
                        setCache(cacheKey, json.Answer);
                        resolve(json.Answer);
                    } else resolve([]);
                } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

const originalLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
    if (typeof options === 'function') { callback = options; options = {}; }
    if (!hostname || hostname === 'localhost') return originalLookup(hostname, options, callback);

    fetchDoH(hostname, 'A').then(answers => {
        const ip = answers.find(a => a.type === 1)?.data;
        if (ip) {
            if (options.all) callback(null, [{ address: ip, family: 4 }]);
            else callback(null, ip, 4);
        } else originalLookup(hostname, options, callback);
    }).catch(() => originalLookup(hostname, options, callback));
};

const originalPromisesResolveSrv = dns.promises.resolveSrv;
dns.promises.resolveSrv = async function (hostname) {
    try {
        return await Promise.race([
            originalPromisesResolveSrv(hostname),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500))
        ]);
    } catch (err) {
        const answers = await fetchDoH(hostname, 'SRV');
        const srvRecords = answers.filter(a => a.type === 33).map(a => {
            const parts = a.data.split(' ');
            return { priority: parseInt(parts[0]), weight: parseInt(parts[1]), port: parseInt(parts[2]), name: parts[3].replace(/\.$/, '') };
        });
        if (srvRecords.length > 0) return srvRecords;
        throw err;
    }
};

const originalPromisesResolveTxt = dns.promises.resolveTxt;
dns.promises.resolveTxt = async function (hostname) {
    try {
        return await Promise.race([
            originalPromisesResolveTxt(hostname),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 500))
        ]);
    } catch (err) {
        const answers = await fetchDoH(hostname, 'TXT');
        const txtRecords = answers.filter(a => a.type === 16).map(a => [a.data.replace(/^"|"$/g, '')]);
        if (txtRecords.length > 0) return txtRecords;
        throw err;
    }
};

dotenv.config({ path: path.join(__dirname, '.env.local') });
const MONGODB_URI = process.env.MONGODB_URI;

async function inspect() {
    try {
        console.log('Connecting to MongoDB...');
        // Increased timeout and buffer for fragile connections
        await mongoose.connect(MONGODB_URI, { 
            serverSelectionTimeoutMS: 60000,
            connectTimeoutMS: 60000,
            socketTimeoutMS: 60000
        });
        console.log('Connected to MongoDB');

        const ReceptionRequest = mongoose.model('ReceptionRequest', new mongoose.Schema({}, { strict: false }), 'receptionrequests');
        
        const count = await ReceptionRequest.countDocuments();
        console.log(`Total documents: ${count}`);

        const revenueAll = await ReceptionRequest.aggregate([
            { $group: { 
                _id: "$status", 
                totalPrice: { $sum: "$roomPrice" }, 
                count: { $sum: 1 },
                sampleInquiryTypes: { $addToSet: "$inquiryType" }
            } }
        ]);
        console.log('Revenue by status:', JSON.stringify(revenueAll, null, 2));

        const inquiryAnalysis = await ReceptionRequest.aggregate([
            { $group: { 
                _id: "$inquiryType", 
                totalPrice: { $sum: "$roomPrice" }, 
                count: { $sum: 1 }
            } }
        ]);
        console.log('Revenue by inquiryType:', JSON.stringify(inquiryAnalysis, null, 2));

        const recent = await ReceptionRequest.find().sort({ createdAt: -1 }).limit(10).lean();
        console.log('Last 10 reception requests:', recent.map(r => ({ 
            guest: r.guestName, 
            status: r.status, 
            inquiry: r.inquiryType,
            price: r.roomPrice, 
            created: r.createdAt 
        })));

        process.exit(0);
    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    }
}

inspect();
