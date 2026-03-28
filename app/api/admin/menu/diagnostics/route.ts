import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import MenuItem from "@/lib/models/menu-item"
import Vip1MenuItem from "@/lib/models/vip1-menu-item"
import Vip2MenuItem from "@/lib/models/vip2-menu-item"
import { validateSession } from "@/lib/auth"

// GET: Show how many items are in each collection
export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()

    const [standardCount, vip1Count, vip2Count] = await Promise.all([
      (MenuItem as any).countDocuments(),
      (Vip1MenuItem as any).countDocuments(),
      (Vip2MenuItem as any).countDocuments()
    ])

    return NextResponse.json({
      collections: {
        "menuitems (Standard)": standardCount,
        "vip1menuitems (VIP 1)": vip1Count,
        "vip2menuitems (VIP 2)": vip2Count
      }
    })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

// DELETE: Wipe all items from a specific VIP collection
export async function DELETE(request: Request) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const target = searchParams.get('target') // 'vip1' or 'vip2'

    await connectDB()

    if (target === 'vip1') {
      const result = await (Vip1MenuItem as any).deleteMany({})
      console.log(`[CLEAR] Deleted ${result.deletedCount} items from vip1menuitems`)
      return NextResponse.json({ message: `Cleared ${result.deletedCount} items from vip1menuitems` })
    }

    if (target === 'vip2') {
      const result = await (Vip2MenuItem as any).deleteMany({})
      console.log(`[CLEAR] Deleted ${result.deletedCount} items from vip2menuitems`)
      return NextResponse.json({ message: `Cleared ${result.deletedCount} items from vip2menuitems` })
    }

    return NextResponse.json({ message: "Invalid target. Use ?target=vip1 or ?target=vip2" }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
