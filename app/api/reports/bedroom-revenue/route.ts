import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import ReceptionRequest from "@/lib/models/reception-request"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    try {
      await connectDB()
    } catch (dbError: any) {
      // Database unreachable - return empty report with 200 status
      console.warn("⚠️ Bedroom revenue report - DB unreachable, returning empty report")
      return NextResponse.json({
        totalRevenue: 0,
        totalBookings: 0,
        byRoom: [],
        byPayment: [],
        bookings: []
      })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "month"

    const now = new Date()
    let startDate: Date
    if (period === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === "week") {
      startDate = new Date(now); startDate.setDate(now.getDate() - 7)
    } else if (period === "year") {
      startDate = new Date(now.getFullYear(), 0, 1)
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const bookings = await ReceptionRequest.find({
      status: { $in: ["pending", "guests", "check_in", "check_out"] },
      inquiryType: { $in: ["check_in", "reservation"] },
      createdAt: { $gte: startDate },
    }).lean()

    const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.roomPrice) || 0), 0)
    const totalBookings = bookings.length

    const byRoom = bookings.reduce((acc: any, b) => {
      const key = b.roomNumber || "Unknown"
      if (!acc[key]) acc[key] = { roomNumber: key, bookings: 0, revenue: 0 }
      acc[key].bookings++
      acc[key].revenue += Number(b.roomPrice) || 0
      return acc
    }, {})

    const byPayment = bookings.reduce((acc: any, b) => {
      const key = b.paymentMethod || "cash"
      if (!acc[key]) acc[key] = { method: key, count: 0, revenue: 0 }
      acc[key].count++
      acc[key].revenue += Number(b.roomPrice) || 0
      return acc
    }, {})

    return NextResponse.json({
      totalRevenue,
      totalBookings,
      byRoom: Object.values(byRoom),
      byPayment: Object.values(byPayment),
      bookings: bookings.map(b => ({
        _id: b._id?.toString(),
        guestName: b.guestName,
        roomNumber: b.roomNumber,
        roomPrice: b.roomPrice,
        paymentMethod: b.paymentMethod,
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        createdAt: b.createdAt,
      }))
    })
  } catch (error: any) {
    return NextResponse.json({ message: "Failed" }, { status: 500 })
  }
}
