import "./dns-fix"
import mongoose from "mongoose"

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://lidiyagizaw2007:holyunion@cluster0.lhifyl9.mongodb.net/abehotel"

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
    console.log("🔄 Initializing MongoDB connection...")
    
    cached.promise = mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000,
      heartbeatFrequencyMS: 10000,
      bufferCommands: false,
    }).then(async (m) => {
      console.log("✅ MongoDB connected successfully")
      await loadModels()
      return m
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e: any) {
    cached.promise = null
    cached.conn = null
    // Silently fail - app handles with JWT fallback
    throw e
  }

  return cached.conn
}

/**
 * Load all Mongoose models
 */
async function loadModels() {
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
}
