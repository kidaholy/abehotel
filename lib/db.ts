import mongoose from "mongoose"
import "./dns-fix"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/restaurant-management"

let cached = (global as any).mongoose
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  // If we have a live, connected connection — reuse it
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn
  }

  // If the connection is broken/disconnected, reset so we reconnect fresh
  if (cached.conn && mongoose.connection.readyState !== 1) {
    cached.conn = null
    cached.promise = null
  }

  if (!cached.promise) {
    console.log("🔄 Initializing new MongoDB connection...")
    cached.promise = mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      bufferCommands: false,
      family: 4,
    }).then(async (m) => {
      console.log("✅ MongoDB connected successfully")
      await Promise.all([
        import("./models/user"),
        import("./models/table"),
        import("./models/floor"),
        import("./models/order"),
        import("./models/menu-item"),
        import("./models/vip1-menu-item"),
        import("./models/vip2-menu-item"),
        import("./models/stock"),
        import("./models/category"),
        import("./models/reception-request"),
        import("./models/service"),
      ])
      console.log("📦 All Mongoose models registered")
      return m
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e: any) {
    // Always reset on failure so next request retries fresh
    cached.promise = null
    cached.conn = null
    console.error("❌ MongoDB connection error:", e.message)
    throw e
  }

  return cached.conn
}
