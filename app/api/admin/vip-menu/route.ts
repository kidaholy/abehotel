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
    const items = await (VipMenuItem as any).find({})
      .populate('recipe.stockItemId')
      .lean()
    
    const serializedItems = items.map((item: any) => ({
      ...item,
      _id: item._id.toString()
    })).sort((a: any, b: any) => {
      const idA = a.menuId || ""
      const idB = b.menuId || ""
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
    })

    return NextResponse.json(serializedItems)
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

    // Auto-generate menuId if not provided
    let finalMenuId = data.menuId ? data.menuId.toString().trim() : ""
    if (!finalMenuId) {
      const allItems = await (VipMenuItem as any).find({}, { menuId: 1 }).lean()
      let maxId = 0
      allItems.forEach((item: any) => {
        if (item.menuId) {
          const num = parseInt(item.menuId, 10)
          if (!isNaN(num) && num > maxId) maxId = num
        }
      })
      finalMenuId = (maxId + 1).toString()
    }

    const newItem = new VipMenuItem({
      menuId: finalMenuId,
      name: data.name.trim(),
      mainCategory: data.mainCategory || 'Food',
      category: data.category?.trim() || 'VIP Special',
      price: Number(data.price),
      description: data.description?.trim(),
      image: data.image,
      preparationTime: data.preparationTime ? Number(data.preparationTime) : 10,
      available: data.available !== false,
      recipe: data.recipe || [],
      reportUnit: data.reportUnit || 'piece',
      reportQuantity: data.reportQuantity ? Number(data.reportQuantity) : 0,
      distributions: data.distributions || [],
      vipLevel: data.vipLevel || 1
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
