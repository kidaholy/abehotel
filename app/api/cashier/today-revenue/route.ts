import { NextResponse } from "next/server"
import Order from "@/lib/models/order"
import Settings from "@/lib/models/settings"
import { connectDB } from "@/lib/db"
import { validateSession } from "@/lib/auth"
import { getStartOfTodayUTC3 } from "@/lib/time-sync"

export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "cashier") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()

    const toggle = await (Settings as any).findOne({ key: "enable_cashier_today_revenue" }).lean()
    const isEnabled = (toggle?.value || "false") === "true"
    if (!isEnabled) {
      return NextResponse.json({ enabled: false, totalRevenue: 0, totalOrders: 0 })
    }

    const todayStart = getStartOfTodayUTC3()
    const revenueOrders = await Order.find({
      createdAt: { $gte: todayStart },
      status: { $ne: "cancelled" },
      createdBy: decoded.id
    }).select("totalAmount items").lean()

    let foodRevenue = 0
    let drinksRevenue = 0
    revenueOrders.forEach((order: any) => {
      ;(order.items || []).forEach((item: any) => {
        if (item.mainCategory === 'Food') foodRevenue += (item.price * item.quantity || 0)
        else if (item.mainCategory === 'Drinks') drinksRevenue += (item.price * item.quantity || 0)
      })
    })

    const totalRevenue = revenueOrders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0)

    return NextResponse.json({
      enabled: true,
      totalRevenue,
      foodRevenue,
      drinksRevenue,
      totalOrders: revenueOrders.length
    })
  } catch (error: any) {
    console.error("Cashier today revenue error:", error)
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: "Failed to fetch today's revenue" }, { status })
  }
}
