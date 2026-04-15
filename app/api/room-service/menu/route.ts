import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import MenuItem from "@/lib/models/menu-item"
import Vip1MenuItem from "@/lib/models/vip1-menu-item"
import Vip2MenuItem from "@/lib/models/vip2-menu-item"
import Room from "@/lib/models/room"
import Floor from "@/lib/models/floor"

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const roomNumber = searchParams.get("roomNumber")

    await connectDB()

    let menuTier = 'standard'

    if (roomNumber) {
        const room = await (Room as any).findOne({ roomNumber }).lean()
        if (room) {
            menuTier = room.roomServiceMenuTier || 'standard'
        }
    }

    let items = []
    if (menuTier === 'vip1') {
        items = await (Vip1MenuItem as any).find({ available: true }).lean()
    } else if (menuTier === 'vip2') {
        items = await (Vip2MenuItem as any).find({ available: true }).lean()
    } else {
        const allItems = await (MenuItem as any).find({ available: true }).lean()
        // Filter out VIP items from standard collection just in case
        items = allItems.filter((item: any) => {
            const isVipCat = item.category && item.category.toLowerCase().includes('vip')
            const isVipName = item.name && item.name.toLowerCase().includes('vip')
            return !isVipCat && !isVipName && item.isVIP !== true
        })
    }
    
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
    console.error("❌ Room Service Get menu items error:", error)
    return NextResponse.json({ message: "Failed to get menu items" }, { status: 500 })
  }
}
