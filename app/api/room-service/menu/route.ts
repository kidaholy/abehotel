import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import MenuItem from "@/lib/models/menu-item"

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await connectDB()

    const allItems = await (MenuItem as any).find({ available: true }).lean()
    
    // Filter out VIP items naturally without expensive db queries protecting logic
    const menuItems = allItems.filter((item: any) => {
        const isVipCat = item.category && item.category.toLowerCase().includes('vip')
        const isVipName = item.name && item.name.toLowerCase().includes('vip')
        return !isVipCat && !isVipName && item.isVIP !== true
    })

    const serializedItems = menuItems.map((item: any) => ({
      ...item,
      _id: item._id.toString()
    })).sort((a: any, b: any) => {
      const idA = a.menuId || ""
      const idB = b.menuId || ""
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
    })

    return NextResponse.json(serializedItems)
  } catch (error: any) {
    console.error("❌ Room Service Get menu items error:", error)
    return NextResponse.json({ message: "Failed to get menu items" }, { status: 500 })
  }
}
