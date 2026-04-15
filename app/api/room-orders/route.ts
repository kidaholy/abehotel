import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import Floor from "@/lib/models/floor"
import { validateSession } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== 'cashier' && decoded.role !== 'admin' && decoded.role !== 'super-admin') {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    
    let query: any = { status: "unconfirmed", isDeleted: { $ne: true } }
    
    // If cashier, only fetch orders where floor.roomServiceCashierId matches their ID
    if (decoded.role === 'cashier') {
      const assignedFloors = await (Floor as any).find({ roomServiceCashierId: decoded.id }, { _id: 1 }).lean()
      const floorIds = assignedFloors.map((f: any) => f._id)
      query = { ...query, floorId: { $in: floorIds } }
    }

    const orders = await (Order as any).find(query)
      .sort({ createdAt: -1 })
      .lean()

    const floorMap = new Map()
    const floors = await Floor.find({}).lean() as any[]
    floors.forEach(f => floorMap.set(f._id.toString(), f.floorNumber))

    const serialized = orders.map((o: any) => {
      let floorNumber = o.floorNumber || floorMap.get(o.floorId?.toString()) || ""
      return { 
        ...o, 
        _id: o._id.toString(),
        floorNumber
      }
    })
    return NextResponse.json(serialized)
  } catch (error: any) {
    console.error("❌ Get room orders error:", error)
    return NextResponse.json({ message: "Failed to get room orders" }, { status: 500 })
  }
}
