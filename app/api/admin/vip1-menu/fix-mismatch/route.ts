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
    
    // This route is specifically for VIP 1
    // We look for any VIP 1 tagged items in the STANDARD menu collection 
    // and move them to the VIP 1 collection
    
    // Note: Since we recently decoupled, items might still be in MenuItem with an isVip flag 
    // or category name matching VIP 1.
    
    const itemsInStandard = await MenuItem.find({ 
      $or: [
        { category: /VIP 1/i },
        { isVIP: true } // Legacy flag
      ]
    }).lean()

    let migratedCount = 0
    for (const item of itemsInStandard) {
        // Double check it doesn't already exist in VIP 1 by menuId
        const exists = await (Vip1MenuItem as any).findOne({ menuId: item.menuId })
        if (!exists) {
            const newItem = new Vip1MenuItem({
                ...item,
                _id: item._id // Keep same ID to avoid breaking UI references
            })
            await (newItem as any).save()
            // Delete from standard
            await MenuItem.findByIdAndDelete(item._id)
            migratedCount++
        }
    }

    return NextResponse.json({ 
        message: `Successfully migrated ${migratedCount} items to VIP 1 collection.`,
        migratedCount 
    })
  } catch (error: any) {
    console.error("❌ VIP 1 fix error:", error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
