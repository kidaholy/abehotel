const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: require("path").join(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not found in .env.local");
  process.exit(1);
}

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  plainPassword: String,
  role: { type: String, enum: ["admin", "cashier", "chef", "waiter"], default: "cashier" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

async function seed() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB.");

    const email = "kidayos2014@gmail.com";
    const password = "123456";
    const hashedPassword = await bcrypt.hash(password, 10);

    const existing = await User.findOne({ email });
    if (existing) {
      existing.name = "Super Admin";
      existing.password = hashedPassword;
      existing.plainPassword = password;
      existing.role = "admin";
      existing.isActive = true;
      await existing.save();
      console.log("✅ Admin user updated successfully.");
    } else {
      await User.create({
        name: "Super Admin",
        email,
        password: hashedPassword,
        plainPassword: password,
        role: "admin",
        isActive: true,
      });
      console.log("✅ Admin user created successfully.");
    }

    console.log("🎉 Done!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed:", error);
    process.exit(1);
  }
}

seed();
