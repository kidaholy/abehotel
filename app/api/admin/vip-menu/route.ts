import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import VipMenuItem from "@/lib/models/vip-menu-item"
import { validateSession } from "@/lib/auth"

// Get all VIP menu items
export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    const items = await VipMenuItem.find({}).sort({ createdAt: -1 }).lean()
    
    return NextResponse.json(items)
  } catch (error: any) {
    console.error("❌ Get VIP menu items error:", error)
    return NextResponse.json({ message: error.message || "Failed to get items" }, { status: 500 })
  }
}

// Create new VIP menu item
export async function POST(request: Request) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    const data = await request.json()
    
    if (!data.name || !data.price) {
      return NextResponse.json({ message: "Name and price are required" }, { status: 400 })
    }

    const newItem = new VipMenuItem({
      name: data.name.trim(),
      category: data.category?.trim() || 'VIP Special',
      price: Number(data.price),
      description: data.description?.trim(),
      image: data.image,
      available: data.available !== false,
    })
    
    await newItem.save()

    return NextResponse.json({
      message: "VIP Menu item created successfully",
      item: newItem
    })
  } catch (error: any) {
    console.error("❌ Create VIP menu item error:", error)
    return NextResponse.json({ message: error.message || "Failed to create item" }, { status: 500 })
  }
}
