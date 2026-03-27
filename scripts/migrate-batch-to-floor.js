const mongoose = require("mongoose");
const dns = require("dns");
require("dotenv").config({ path: ".env" });

const originalLookup = dns.lookup;
dns.setServers(['192.168.8.1', '192.168.1.1', '1.1.1.1', '8.8.8.8']);

async function recursiveHybridResolve(hostname) {
    try {
        const addresses = await new Promise((resolve, reject) => {
            dns.resolve4(hostname, (err, data) => err ? reject(err) : resolve(data));
        });
        if (addresses && addresses.length > 0) return { address: addresses[0], family: 4 };
    } catch (e) {}

    const awsMatch = hostname.match(/^ec2-([0-9-]+)\./);
    if (awsMatch) return { address: awsMatch[1].replace(/-/g, '.'), family: 4 };

    try {
        const cnames = await new Promise((resolve, reject) => {
            dns.resolveCname(hostname, (err, data) => err ? reject(err) : resolve(data));
        });
        if (cnames && cnames.length > 0) return await recursiveHybridResolve(cnames[0]);
    } catch (e) {}

    throw new Error(`Failed to resolve ${hostname}`);
}

dns.lookup = function (hostname, options, callback) {
    if (typeof options === 'function') { callback = options; options = {}; }
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return originalLookup(hostname, options, callback);
    }
    recursiveHybridResolve(hostname)
        .then(res => {
            if (options.all) callback(null, [{ address: res.address, family: res.family }]);
            else callback(null, res.address, res.family);
        })
        .catch(() => originalLookup(hostname, options, callback));
};

const MONGODB_URI = process.env.MONGODB_URI;

async function migrateData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB! (DNS Fixed)");

    const db = mongoose.connection.db;

    const batches = await db.collection("batches").find({}).toArray();
    console.log(`📌 Found ${batches.length} batches to migrate.`);

    if (batches.length > 0) {
      const floors = batches.map(batch => ({
        _id: batch._id,
        floorNumber: batch.batchNumber, // Rename 'batchNumber' to 'floorNumber'
        description: batch.description || "",
        order: batch.order || 0,
        isActive: batch.isActive !== undefined ? batch.isActive : true,
        createdAt: batch.createdAt || new Date(),
        updatedAt: batch.updatedAt || new Date()
      }));

      for (const floor of floors) {
        await db.collection("floors").updateOne({ _id: floor._id }, { $set: floor }, { upsert: true });
      }
      console.log(`✅ Migrated ${batches.length} batches to floors.`);
    }

    const tableUpdateResult = await db.collection("tables").updateMany({ batchId: { $exists: true } }, [{ $set: { floorId: "$batchId" } }, { $unset: "batchId" }]);
    console.log(`✅ Updated ${tableUpdateResult.modifiedCount} tables.`);

    const userUpdateResult = await db.collection("users").updateMany({ batchId: { $exists: true } }, [{ $set: { floorId: "$batchId" } }, { $unset: "batchId" }]);
    console.log(`✅ Updated ${userUpdateResult.modifiedCount} users.`);

    const orderUpdateResult = await db.collection("orders").updateMany({ $or: [{ batchId: { $exists: true } }, { batchNumber: { $exists: true } }] }, [{ $set: { floorId: "$batchId", floorNumber: "$batchNumber" } }, { $unset: ["batchId", "batchNumber"] }]);
    console.log(`✅ Updated ${orderUpdateResult.modifiedCount} orders.`);

    console.log("✨ Data migration complete!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected.");
  }
}

migrateData();
