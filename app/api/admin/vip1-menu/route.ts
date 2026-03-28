import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Vip1MenuItem from "@/lib/models/vip1-menu-item"
import { validateSession } from "@/lib/auth"

// =============================================================================
// VIP 1 MENU API — reads and writes ONLY from the `vip1menuitems` collection
// =============================================================================

export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    console.log("[VIP1] Fetching from collection: vip1menuitems")

    const items = await (Vip1MenuItem as any).find({})
      .populate('recipe.stockItemId')
      .lean()

    console.log(`[VIP1] Found ${items.length} items in vip1menuitems`)

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
    console.error("[VIP1] GET error:", error)
    return NextResponse.json({ message: error.message || "Failed to get VIP 1 items" }, { status: 500 })
  }
}

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

    // Auto-generate menuId from the vip1menuitems collection ONLY
    let finalMenuId = data.menuId ? data.menuId.toString().trim() : ""
    if (!finalMenuId) {
      const allItems = await (Vip1MenuItem as any).find({}, { menuId: 1 }).lean()
      let maxId = 0
      allItems.forEach((item: any) => {
        const num = parseInt(item.menuId, 10)
        if (!isNaN(num) && num > maxId) maxId = num
      })
      finalMenuId = (maxId + 1).toString()
    }

    console.log(`[VIP1] Creating item in vip1menuitems: ${data.name}`)

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
    console.log(`[VIP1] Created item with _id: ${newItem._id}`)

    return NextResponse.json({
      message: "VIP 1 Menu item created successfully",
      item: { ...newItem.toObject(), _id: newItem._id.toString() }
    })
  } catch (error: any) {
    console.error("[VIP1] POST error:", error)
    return NextResponse.json({ message: error.message || "Failed to create VIP 1 item" }, { status: 500 })
  }
}
