import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import MenuItem from "@/lib/models/menu-item"
import Vip1MenuItem from "@/lib/models/vip1-menu-item"
import Vip2MenuItem from "@/lib/models/vip2-menu-item"
import { validateSession } from "@/lib/auth"
import mongoose from "mongoose"

export async function POST(request: Request) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    
    let migratedCount = 0
    let alreadyCorrectCount = 0

    // 1. Scan ALL collections for items that might be in the wrong place
    const collections = [
        { model: MenuItem, name: 'Standard', isVip1: false, isVip2: false },
        { model: Vip1MenuItem, name: 'VIP 1', isVip1: true, isVip2: false },
        { model: Vip2MenuItem, name: 'VIP 2', isVip1: false, isVip2: true }
    ]

    for (const source of collections) {
        const items = await (source.model as any).find({}).lean()
        
        for (const item of items) {
            // Determine where it SHOULD be based on category or name
            let targetModel = MenuItem
            const category = (item.category || "").toUpperCase()
            const name = (item.name || "").toUpperCase()
            
            if (category.includes("VIP 1") || name.includes("VIP 1")) {
                targetModel = Vip1MenuItem
            } else if (category.includes("VIP 2") || name.includes("VIP 2")) {
                targetModel = Vip2MenuItem
            } else if (item.isVIP === true) {
                targetModel = Vip1MenuItem // Legacy default
            }

            // If it's not where it should be, move it OR delete if it's a duplicate
            if (source.model.modelName !== targetModel.modelName) {
                const alreadyExistsInTarget = await (targetModel as any).findById(item._id)
                
                if (alreadyExistsInTarget) {
                    // It exists in two places! The current source is wrong, delete it.
                    console.log(`[DE-DUPE] Deleting ${item.name} from ${source.model.modelName} (already in ${targetModel.modelName})`)
                    await (source.model as any).findByIdAndDelete(item._id)
                    migratedCount++ // Technically a "fixed" item
                } else {
                    // Move it
                    console.log(`[MOVE] Moving ${item.name} from ${source.model.modelName} to ${targetModel.modelName}`)
                    await new targetModel({ ...item }).save()
                    await (source.model as any).findByIdAndDelete(item._id)
                    migratedCount++
                }
            } else {
                alreadyCorrectCount++
            }
        }
    }

    // 2. EXPLICIT PURGE: Find any remaining item in Standard table that belongs to VIP and DELETE IT
    // This addresses the user's issue where "deleted VIP table data but still see items" 
    // because they are being leaked from the standard table.
    const lingeringVipInStandard = await MenuItem.find({
        $or: [
            { category: /VIP/i },
            { name: /VIP/i },
            { isVIP: true }
        ]
    })
    
    let purgedCount = 0
    for (const item of lingeringVipInStandard) {
        await MenuItem.findByIdAndDelete(item._id)
        purgedCount++
    }

    return NextResponse.json({ 
        message: `Database scan complete. Fixed/Migrated ${migratedCount} items. Purged ${purgedCount} legacy VIP items from Standard table. ${alreadyCorrectCount} items were already correct.`,
        migratedCount,
        purgedCount,
        alreadyCorrectCount
    })
  } catch (error: any) {
    console.error("❌ Global repair error:", error)
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
