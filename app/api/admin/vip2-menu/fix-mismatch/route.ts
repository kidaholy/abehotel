import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import MenuItem from "@/lib/models/menu-item"
import Vip1MenuItem from "@/lib/models/vip1-menu-item"
import Vip2MenuItem from "@/lib/models/vip2-menu-item"
import { validateSession } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    
    // This route is specifically for VIP 2
    // We look for any VIP 2 tagged items in the STANDARD menu collection 
    // and move them to the VIP 2 collection
    
    const itemsInStandard = await MenuItem.find({ 
      $or: [
        { category: /VIP 2/i }
      ]
    }).lean()

    let migratedCount = 0
    for (const item of itemsInStandard) {
        // Double check it doesn't already exist in VIP 2 or VIP 1
        const exists1 = await (Vip1MenuItem as any).findOne({ menuId: item.menuId })
        const exists2 = await (Vip2MenuItem as any).findOne({ menuId: item.menuId })
        
        if (!exists1 && !exists2) {
            const newItem = new Vip2MenuItem({
                ...item,
                _id: item._id
            })
            await (newItem as any).save()
            // Delete from standard
            await MenuItem.findByIdAndDelete(item._id)
            migratedCount++
        }
    }

    return NextResponse.json({ 
        message: `Successfully migrated ${migratedCount} items to VIP 2 collection.`,
        migratedCount 
    })
  } catch (error: any) {
    console.error("❌ VIP 2 fix error:", error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
