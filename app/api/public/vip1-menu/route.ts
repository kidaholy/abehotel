import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Vip1MenuItem from "@/lib/models/vip1-menu-item"
import Stock from "@/lib/models/stock"

export async function GET() {
  try {
    await connectDB()
    console.log("Public VIP1 menu fetch")

    const menuItems = await Vip1MenuItem.find({ available: true })
      .sort({ menuId: 1 })
      .populate('stockItemId')
      .lean()

    // Filter out items where linked stock is finished
    const filteredItems = menuItems.filter((item: any) => {
      if (item.stockItemId && item.stockItemId.status === 'finished') {
        return false
      }
      return true
    })

    const serializedItems = filteredItems.map((item: any) => ({
      _id: item._id.toString(),
      menuId: item.menuId,
      name: item.name,
      description: item.description,
      mainCategory: item.mainCategory || 'Food',
      category: item.category,
      price: item.price,
      image: item.image,
      preparationTime: item.preparationTime,
    })).sort((a: any, b: any) => {
      const idA = a.menuId || ""
      const idB = b.menuId || ""
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
    })

    return NextResponse.json(serializedItems)
  } catch (error: any) {
    console.error("Public VIP1 menu error:", error)
    return NextResponse.json({ message: "Failed to load VIP1 menu" }, { status: 500 })
  }
}
