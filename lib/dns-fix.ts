import dns from "dns";
import https from "https";

/**
 * DNS-over-HTTPS (DoH) fallback using Google DNS
 */

// In-memory cache for DNS records to avoid redundant DoH calls
const dnsCache: { [key: string]: { data: any, timestamp: number } } = {};
const CACHE_TTL = 300000; // 5 minutes

function getCached(key: string) {
    const cached = dnsCache[key];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data;
    }
    return null;
}

function setCache(key: string, data: any) {
    dnsCache[key] = { data, timestamp: Date.now() };
}

async function fetchDoH(name: string, type: string = 'A'): Promise<any[]> {
    const cacheKey = `${name}:${type}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

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
                        setCache(cacheKey, json.Answer);
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
 */

const originalLookup = dns.lookup;
const originalResolve = dns.resolve;
const originalResolveSrv = dns.resolveSrv;
const originalResolveTxt = dns.resolveTxt;
// @ts-ignore
const dnsPromises = dns.promises || (dns.promises);
const originalPromisesResolveSrv = dnsPromises.resolveSrv;
const originalPromisesResolveTxt = dnsPromises.resolveTxt;

// Use reliable public DNS to prevent 15 second UDP timeouts on unreachable local networks
dns.setServers(['8.8.8.8', '1.1.1.1']);

const FALLBACK_TIMEOUT = 500; // ms - reduced from 2000 for faster recovery

async function recursiveHybridResolve(hostname: string): Promise<{ address: string, family: number }> {
    const cacheKey = `${hostname}:LOOKUP`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    // 1. Try A record resolution via Google DNS
    try {
        const addresses = await new Promise<string[]>((resolve, reject) => {
            dns.resolve4(hostname, (err, data) => err ? reject(err) : resolve(data));
        });
        if (addresses && addresses.length > 0) {
            const res = { address: addresses[0], family: 4 };
            setCache(cacheKey, res);
            return res;
        }
    } catch (e) {
        // Fallback 1.5: Try DoH for A record
        try {
            const answers = await fetchDoH(hostname, 'A');
            if (answers.length > 0) {
                const ip = answers.find(a => a.type === 1)?.data;
                if (ip) {
                    console.log(`🌐 DNS Fix: Resolved via DoH (A) ${hostname} -> ${ip}`);
                    const res = { address: ip, family: 4 };
                    setCache(cacheKey, res);
                    return res;
                }
            }
        } catch (dohErr) {
            // Ignore DoH error and proceed to other fallbacks
        }
    }

    // 2. AWS EC2 Pattern fallback
    const awsMatch = hostname.match(/^ec2-([0-9-]+)\./);
    if (awsMatch) {
        const ip = awsMatch[1].replace(/-/g, '.');
        console.log(`🌐 DNS Fix: Extracted IP from AWS host ${hostname} -> ${ip}`);
        const res = { address: ip, family: 4 };
        setCache(cacheKey, res);
        return res;
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
// @ts-ignore
dns.lookup = function (hostname: any, options: any, callback: any) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    if (!hostname) return originalLookup(hostname, options, callback);

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
                    let results: any[] = [];
                    if (type === 'A') {
                        results = answers.filter(a => a.type === 1).map(a => a.data);
                    } else if (type === 'AAAA') {
                        results = answers.filter(a => a.type === 28).map(a => a.data);
                    } else if (type === 'TXT') {
                        results = answers.filter(a => a.type === 16).map(a => [a.data.replace(/^"|"$/g, '')]);
                    } else {
                        results = answers.map(a => a.data);
                    }
                    
                    if (results.length > 0) {
                        console.log(`🌐 DNS Fix: Resolved via DoH (resolve:${type} - TIMEOUT FALLBACK) ${hostname}`);
                        realCallback(null, results);
                    } else {
                        realCallback(new Error(`No ${type} records found via DoH`), []);
                    }
                } else {
                    realCallback(new Error(`DoH resolution failed for ${type}`), []);
                }
            })
            .catch(dohErr => realCallback(dohErr, []));
    }, FALLBACK_TIMEOUT);

    originalResolve(hostname, type, (err, records) => {
        if (called) return;
        called = true;
        clearTimeout(timeout);
        if (!err && records && (records as any).length > 0) {
            return realCallback(null, records);
        }

        fetchDoH(hostname, type)
            .then(answers => {
                if (answers.length > 0) {
                    let results: any[] = [];
                    if (type === 'A') {
                        results = answers.filter(a => a.type === 1).map(a => a.data);
                    } else if (type === 'AAAA') {
                        results = answers.filter(a => a.type === 28).map(a => a.data);
                    } else if (type === 'TXT') {
                        results = answers.filter(a => a.type === 16).map(a => [a.data.replace(/^"|"$/g, '')]);
                    } else {
                        results = answers.map(a => a.data);
                    }

                    if (results.length > 0) {
                        console.log(`🌐 DNS Fix: Resolved via DoH (resolve:${type} - ERROR FALLBACK) ${hostname}`);
                        realCallback(null, results);
                    } else {
                        realCallback(err || new Error(`No ${type} records found via DoH`), records);
                    }
                } else {
                    realCallback(err || new Error(`DoH resolution failed for ${type}`), records);
                }
            })
            .catch(dohErr => realCallback(err || dohErr, records));
    });
};

// @ts-ignore
dns.resolveTxt = function (hostname: string, callback: any) {
    dns.resolve(hostname, 'TXT', callback);
};

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

// @ts-ignore
dns.resolveSrv = function (hostname: string, callback: any) {
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
    }, FALLBACK_TIMEOUT);

    originalResolveSrv(hostname, (err, records) => {
        if (called) return;
        called = true;
        clearTimeout(timeout);
        if (!err && records && (records as any).length > 0) {
            return callback(null, records);
        }

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

// @ts-ignore
dnsPromises.resolveSrv = async function (hostname: string) {
    const cacheKey = `${hostname}:SRV`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        const res = await Promise.race([
            originalPromisesResolveSrv(hostname),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), FALLBACK_TIMEOUT))
        ]);
        setCache(cacheKey, res);
        return res;
    } catch (err) {
        const answers = await fetchDoH(hostname, 'SRV');
        const srvRecords = processSrvAnswers(answers);

        if (srvRecords.length > 0) {
            console.log(`🌐 DNS Fix: Resolved via DoH (promises.SRV) ${hostname} -> ${srvRecords.length} nodes`);
            setCache(cacheKey, srvRecords);
            return srvRecords;
        }
        throw err;
    }
};

// @ts-ignore
dnsPromises.resolveTxt = async function (hostname: string) {
    const cacheKey = `${hostname}:TXT`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
        const res = await Promise.race([
            originalPromisesResolveTxt(hostname),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), FALLBACK_TIMEOUT))
        ]);
        setCache(cacheKey, res);
        return res;
    } catch (err) {
        const answers = await fetchDoH(hostname, 'TXT');
        const txtRecords = answers.filter(a => a.type === 16).map(a => [a.data.replace(/^"|"$/g, '')]);
        if (txtRecords.length > 0) {
            console.log(`🌐 DNS Fix: Resolved via DoH (promises.TXT) ${hostname}`);
            setCache(cacheKey, txtRecords);
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
                if (options && options.all) {
                    resolve([{ address, family: family || 4 }]);
                } else {
                    resolve({ address, family: family || 4 });
                }
            }
        });
    });
};

console.log("🚀 Robust DNS Fix optimized (with Caching and 500ms Fallback)");
