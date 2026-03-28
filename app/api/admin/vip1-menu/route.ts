import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Vip1MenuItem from "@/lib/models/vip1-menu-item"
import { validateSession } from "@/lib/auth"

// Get all VIP 1 menu items
export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    const items = await (Vip1MenuItem as any).find({})
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
    console.error("❌ Get VIP 1 menu items error:", error)
    return NextResponse.json({ message: error.message || "Failed to get items" }, { status: 500 })
  }
}

// Create new VIP 1 menu item
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

    // Auto-generate menuId if not provided (Base it on its own collection)
    let finalMenuId = data.menuId ? data.menuId.toString().trim() : ""
    if (!finalMenuId) {
      const allItems = await (Vip1MenuItem as any).find({}, { menuId: 1 }).lean()
      let maxId = 0
      allItems.forEach((item: any) => {
        if (item.menuId) {
          const num = parseInt(item.menuId, 10)
          if (!isNaN(num) && num > maxId) maxId = num
        }
      })
      finalMenuId = `V1-${(maxId + 1).toString().padStart(3, '0')}` // Prefix to avoid collisions and clarify
      
      // Let's check standard integer first if they want simple numbers
      // Actually standard integer is better if they prefer it. Let's see if old was simple.
      // Old was maxId + 1. Let's just use numeric to keep it consistent with their preference.
      finalMenuId = (maxId + 1).toString()
    }

    const newItem = new Vip1MenuItem({
      menuId: finalMenuId,
      name: data.name.trim(),
      mainCategory: data.mainCategory || 'Food',
      category: data.category?.trim() || 'VIP 1 Special',
      price: Number(data.price),
      description: data.description?.trim(),
      image: data.image,
      preparationTime: data.preparationTime ? Number(data.preparationTime) : 10,
      available: data.available !== false,
      recipe: data.recipe || [],
      reportUnit: data.reportUnit || 'piece',
      reportQuantity: data.reportQuantity ? Number(data.reportQuantity) : 0,
      distributions: data.distributions || []
    })
    
    await newItem.save()

    return NextResponse.json({
      message: "VIP 1 Menu item created successfully",
      item: newItem
    })
  } catch (error: any) {
    console.error("❌ Create VIP 1 menu item error:", error)
    return NextResponse.json({ message: error.message || "Failed to create item" }, { status: 500 })
  }
}
