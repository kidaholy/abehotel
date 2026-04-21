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
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")

    const now = new Date()
    let startDate: Date
    let endDate: Date | null = null

    if (startDateParam) {
      // Explicit date range (custom)
      startDate = new Date(startDateParam)
      endDate = endDateParam ? new Date(endDateParam) : null
    } else if (period === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    } else if (period === "week") {
      startDate = new Date(now); startDate.setDate(now.getDate() - 7)
    } else if (period === "year") {
      startDate = new Date(now.getFullYear(), 0, 1)
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    }

    const dateFilter: any = { $gte: startDate }
    if (endDate) dateFilter.$lte = endDate

    const bookings = await ReceptionRequest.find({
      status: { $in: [
        // Canonical statuses
        "CHECKIN_APPROVED",
        "ACTIVE",
        "CHECKOUT_PENDING",
        "CHECKOUT_APPROVED",
        "CHECKED_OUT",
        // Legacy statuses
        "guests",
        "check_in",
        "check_out",
      ]},
      inquiryType: { $in: ["check_in", "check_out", "reservation"] },
      createdAt: dateFilter,
    }).lean()

    // Helper: calculate nights between checkIn and checkOut strings
    const calcNights = (checkIn?: string, checkOut?: string): number => {
      if (!checkIn || !checkOut) return 1
      const msPerDay = 1000 * 60 * 60 * 24
      const diff = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / msPerDay)
      return diff > 0 ? diff : 1
    }

    const totalRevenue = bookings.reduce((sum, b) => {
      const nights = calcNights(b.checkIn as string | undefined, b.checkOut as string | undefined)
      return sum + (Number(b.roomPrice) || 0) * nights
    }, 0)
    const totalBookings = bookings.length

    const byRoom = bookings.reduce((acc: any, b) => {
      const key = b.roomNumber || "Unknown"
      const nights = calcNights(b.checkIn as string | undefined, b.checkOut as string | undefined)
      if (!acc[key]) acc[key] = { roomNumber: key, bookings: 0, revenue: 0 }
      acc[key].bookings++
      acc[key].revenue += (Number(b.roomPrice) || 0) * nights
      return acc
    }, {})

    const byPayment = bookings.reduce((acc: any, b) => {
      const key = b.paymentMethod || "cash"
      const nights = calcNights(b.checkIn as string | undefined, b.checkOut as string | undefined)
      if (!acc[key]) acc[key] = { method: key, count: 0, revenue: 0 }
      acc[key].count++
      acc[key].revenue += (Number(b.roomPrice) || 0) * nights
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
        checkIn: b.checkIn,
        checkOut: b.checkOut,
        nights: calcNights(b.checkIn as string | undefined, b.checkOut as string | undefined),
        totalAmount: (Number(b.roomPrice) || 0) * calcNights(b.checkIn as string | undefined, b.checkOut as string | undefined),
        paymentMethod: b.paymentMethod,
        createdAt: b.createdAt,
      }))
    })
  } catch (error: any) {
    return NextResponse.json({ message: "Failed" }, { status: 500 })
  }
}
