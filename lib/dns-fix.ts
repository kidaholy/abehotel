const dns = require("dns");
import https from "https";

/**
 * DNS-over-HTTPS (DoH) fallback using Google DNS
 */
async function fetchDoH(name: string, type: string = 'A'): Promise<any[]> {
    return new Promise((resolve, reject) => {
        // Use IP directly to avoid infinite recursion when dns.lookup is patched
        const url = `https://8.8.8.8/resolve?name=${name}&type=${type}`;
        const options = {
            headers: { 'Host': 'dns.google' },
            rejectUnauthorized: false // Skip cert check for IP-based request to dns.google helper
        };
        https.get(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.Status === 0 && json.Answer) {
                        resolve(json.Answer);
                    } else {
                        resolve([]);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

function processSrvAnswers(answers: any[]): any[] {
    return answers
        .filter(a => a.type === 33)
        .map(a => {
            const parts = a.data.split(' ');
            return {
                priority: parseInt(parts[0]),
                weight: parseInt(parts[1]),
                port: parseInt(parts[2]),
                name: parts[3].replace(/\.$/, '')
            };
        });
}

/**
 * Robust DNS Fix for Environments with Broken OS DNS
 * This utility:
 * 1. Sets Google DNS as the preferred resolver for Node.js `dns.resolve*` calls.
 * 2. Overrides the global `dns.lookup` used by MongoDB/Mongoose.
 * 3. Overrides `dns.resolveSrv` for MongoDB SRV resolution.
 * 4. Recursively follows CNAME chains.
 * 5. Extracts IP addresses from AWS `ec2-x-y-z-w` hostnames if resolution fails.
 */

const originalLookup = dns.lookup;
const originalResolve = dns.resolve;
const originalResolve4 = dns.resolve4;
const originalResolveCname = dns.resolveCname;
const originalResolveSrv = dns.resolveSrv;
const originalResolveTxt = dns.resolveTxt;
const dnsPromises = dns.promises || (require('dns').promises);
const originalPromisesResolveSrv = dnsPromises.resolveSrv;
const originalPromisesResolveTxt = dnsPromises.resolveTxt;

// Use reliable public DNS to prevent 15 second UDP timeouts on unreachable local networks
dns.setServers(['8.8.8.8', '1.1.1.1']);

async function recursiveHybridResolve(hostname: string): Promise<{ address: string, family: number }> {
    // 1. Try A record resolution via Google DNS
    try {
        const addresses = await new Promise<string[]>((resolve, reject) => {
            dns.resolve4(hostname, (err, data) => err ? reject(err) : resolve(data));
        });
        if (addresses && addresses.length > 0) {
            return { address: addresses[0], family: 4 };
        }
    } catch (e) {
        // Fallback 1.5: Try DoH for A record
        try {
            const answers = await fetchDoH(hostname, 'A');
            if (answers.length > 0) {
                const ip = answers.find(a => a.type === 1)?.data;
                if (ip) {
                    console.log(`🌐 DNS Fix: Resolved via DoH (A) ${hostname} -> ${ip}`);
                    return { address: ip, family: 4 };
                }
            }
        } catch (dohErr) {
            // Ignore DoH error and proceed to other fallbacks
        }
    }

    // 2. AWS EC2 Pattern fallback (e.g. ec2-159-41-77-250.me-south-1.compute.amazonaws.com)
    // Extract IP directly from hostname if it follows the EC2 convention
    const awsMatch = hostname.match(/^ec2-([0-9-]+)\./);
    if (awsMatch) {
        const ip = awsMatch[1].replace(/-/g, '.');
        console.log(`🌐 DNS Fix: Extracted IP from AWS host ${hostname} -> ${ip}`);
        return { address: ip, family: 4 };
    }

    // 3. Try CNAME resolution and recurse
    try {
        const cnames = await new Promise<string[]>((resolve, reject) => {
            dns.resolveCname(hostname, (err, data) => err ? reject(err) : resolve(data));
        });
        if (cnames && cnames.length > 0) {
            return await recursiveHybridResolve(cnames[0]);
        }
    } catch (e) {
        // Ignore and let it fall through to original lookup
    }

    throw new Error(`Failed to resolve ${hostname}`);
}

// Apply the global override
// @ts-ignore - overriding internal node dns function
dns.lookup = function (hostname: any, options: any, callback: any) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    console.log(`🌐 DNS Fix:lookup called for ${hostname}`);

    // Always use original lookup for localhost and DNS servers
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '8.8.8.8' || hostname === '1.1.1.1' || hostname === 'dns.google') {
        return originalLookup(hostname, options, callback);
    }

    recursiveHybridResolve(hostname)
        .then(res => {
            if (options.all) {
                callback(null, [{ address: res.address, family: res.family }]);
            } else {
                callback(null, res.address, res.family);
            }
        })
        .catch(() => {
            // Final fallback to original OS lookup
            originalLookup(hostname, options, callback);
        });
};

// @ts-ignore
dns.resolve = function (hostname: string, typeOrCallback: any, callback: any) {
    let type = 'A';
    let realCallback = callback;
    if (typeof typeOrCallback === 'function') {
        realCallback = typeOrCallback;
    } else if (typeof typeOrCallback === 'string') {
        type = typeOrCallback;
    }

    let called = false;
    const timeout = setTimeout(() => {
        if (called) return;
        called = true;
        fetchDoH(hostname, type)
            .then(answers => {
                if (answers.length > 0) {
                    const results = answers.map(a => a.data);
                    console.log(`🌐 DNS Fix: Resolved via DoH (resolve:${type} - TIMEOUT FALLBACK) ${hostname}`);
                    realCallback(null, results);
                } else {
                    realCallback(new Error(`DoH resolution failed for ${type}`), []);
                }
            })
            .catch(dohErr => realCallback(dohErr, []));
    }, 2000);

    originalResolve(hostname, type, (err, records) => {
        if (called) return;
        called = true;
        clearTimeout(timeout);
        if (!err && records && (records as any).length > 0) {
            return realCallback(null, records);
        }

        // Immediate fallback if error occurred before timeout
        fetchDoH(hostname, type)
            .then(answers => {
                if (answers.length > 0) {
                    const results = answers.map(a => {
                        // For TXT records, DoH returns strings that might need to be split/wrapped
                        if (type === 'TXT') {
                            return [a.data.replace(/^"|"$/g, '')];
                        }
                        return a.data;
                    });
                    console.log(`🌐 DNS Fix: Resolved via DoH (resolve:${type} - ERROR FALLBACK) ${hostname}`);
                    realCallback(null, results);
                } else {
                    realCallback(err || new Error(`DoH resolution failed for ${type}`), records);
                }
            })
            .catch(dohErr => realCallback(err || dohErr, records));
    });
};

// Override resolveTxt
// @ts-ignore
dns.resolveTxt = function (hostname: string, callback: any) {
    dns.resolve(hostname, 'TXT', callback);
};

// Override resolveSrv for MongoDB Atlas SRV resolution
// @ts-ignore
dns.resolve4 = function (hostname: string, callback: any) {
    dns.resolve(hostname, 'A', (err, results) => {
        if (err) callback(err, results);
        else callback(null, results);
    });
};

// @ts-ignore
dns.resolveCname = function (hostname: string, callback: any) {
    dns.resolve(hostname, 'CNAME', callback);
};

// Override resolveSrv for MongoDB Atlas SRV resolution
// @ts-ignore
dns.resolveSrv = function (hostname: string, callback: any) {
    console.log(`🌐 DNS Fix:resolveSrv called for ${hostname}`);
    let called = false;
    const timeout = setTimeout(() => {
        if (called) return;
        called = true;
        fetchDoH(hostname, 'SRV')
            .then(answers => {
                const srvRecords = processSrvAnswers(answers);
                if (srvRecords.length > 0) {
                    console.log(`🌐 DNS Fix: Resolved via DoH (SRV - TIMEOUT FALLBACK) ${hostname}`);
                    callback(null, srvRecords);
                } else {
                    callback(new Error('SRV resolution failed'), []);
                }
            })
            .catch(dohErr => callback(dohErr, []));
    }, 2000);

    originalResolveSrv(hostname, (err, records) => {
        if (called) return;
        called = true;
        clearTimeout(timeout);
        if (!err && records && (records as any).length > 0) {
            return callback(null, records);
        }

        // Immediate fallback
        fetchDoH(hostname, 'SRV')
            .then(answers => {
                const srvRecords = processSrvAnswers(answers);
                if (srvRecords.length > 0) {
                    console.log(`🌐 DNS Fix: Resolved via DoH (SRV - ERROR FALLBACK) ${hostname}`);
                    callback(null, srvRecords);
                } else {
                    callback(err || new Error('SRV resolution failed'), records);
                }
            })
            .catch(dohErr => callback(err || dohErr, records));
    });
};

// Override dns.promises versions
// @ts-ignore
dnsPromises.resolveSrv = async function (hostname: string) {
    console.log(`🌐 DNS Fix:promises.resolveSrv called for ${hostname}`);
    try {
        // Race original against a 2s timeout
        return await Promise.race([
            originalPromisesResolveSrv(hostname),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
    } catch (err) {
        const answers = await fetchDoH(hostname, 'SRV');
        const srvRecords = processSrvAnswers(answers);

        if (srvRecords.length > 0) {
            console.log(`🌐 DNS Fix: Resolved via DoH (promises.SRV) ${hostname} -> ${srvRecords.length} nodes`);
            return srvRecords;
        }
        throw err;
    }
};

// @ts-ignore
dnsPromises.resolveTxt = async function (hostname: string) {
    console.log(`🌐 DNS Fix:promises.resolveTxt called for ${hostname}`);
    try {
        return await Promise.race([
            originalPromisesResolveTxt(hostname),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]);
    } catch (err) {
        const answers = await fetchDoH(hostname, 'TXT');
        const txtRecords = answers.filter(a => a.type === 16).map(a => [a.data.replace(/^"|"$/g, '')]);
        if (txtRecords.length > 0) {
            console.log(`🌐 DNS Fix: Resolved via DoH (promises.TXT) ${hostname}`);
            return txtRecords;
        }
        throw err;
    }
};

// @ts-ignore
dnsPromises.lookup = async function (hostname: string, options: any) {
    return new Promise((resolve, reject) => {
        dns.lookup(hostname, options, (err, address, family) => {
            if (err) reject(err);
            else {
                // Return format depends on options.all
                if (options && options.all) {
                    resolve([{ address, family: family || 4 }]);
                } else {
                    resolve({ address, family: family || 4 });
                }
            }
        });
    });
};

console.log("🚀 Robust DNS Fix initialized (Google DNS + Recursive CNAME Follower)");
