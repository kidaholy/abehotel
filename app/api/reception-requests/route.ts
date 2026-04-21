import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import ReceptionRequest from "@/lib/models/reception-request"
import { validateSession } from "@/lib/auth"

// GET all requests (admin) or own submissions (reception)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(Number(searchParams.get('limit')) || 100, 500) // Max 500
    const skip = Number(searchParams.get('skip')) || 0
    const status = searchParams.get('status') // Filter by status
    const searchTerm = searchParams.get('search') // Search by name/phone/room
    
    const decoded = await validateSession(request)
    
    try {
      await connectDB()
    } catch (dbError: any) {
      console.warn("⚠️ Reception requests - DB unreachable, returning empty array")
      return NextResponse.json([])
    }

    let query: any = {}
    
    // Build query based on role
    if (decoded.role === "admin") {
      // Admin sees all requests
      if (status && status !== "all") {
        if (status === "pending") {
          query.status = { $in: ["CHECKIN_PENDING", "CHECKOUT_PENDING", "EXTEND_PENDING", "pending"] }
        } else if (status === "check_in") {
          // Canonical "checked in" bucket
          query.status = { $in: ["CHECKIN_APPROVED", "check_in", "ACTIVE", "guests"] }
        } else if (status === "guests") {
          // Legacy tab name - still map to checked-in guests
          query.status = { $in: ["CHECKIN_APPROVED", "check_in", "ACTIVE", "guests"] }
        } else if (status === "check_out") {
          query.status = { $in: ["CHECKED_OUT", "CHECKOUT_APPROVED", "check_out"] }
        } else if (status === "rejected") {
          query.status = { $in: ["REJECTED", "rejected"] }
        } else {
          query.status = status
        }
      }
    } else if (decoded.role === "reception") {
      // Reception staff sees all approved guests + their own submissions
      query.$or = [
        { submittedBy: decoded.id },
        // Reception staff needs visibility into the lifecycle buckets
        { status: { $in: ["CHECKIN_APPROVED", "CHECKOUT_PENDING", "CHECKED_OUT", "CHECKOUT_APPROVED", "ACTIVE", "guests", "check_in", "check_out", "REJECTED", "rejected"] } },
      ]
      if (status && status !== "all") {
        if (status === "pending") {
           query.status = { $in: ["CHECKIN_PENDING", "CHECKOUT_PENDING", "EXTEND_PENDING", "pending"] }
        } else if (status === "check_in") {
           query.status = { $in: ["CHECKIN_APPROVED", "check_in", "ACTIVE", "guests"] }
        } else if (status === "guests") {
           query.status = { $in: ["CHECKIN_APPROVED", "check_in", "ACTIVE", "guests"] }
        } else if (status === "check_out") {
           query.status = { $in: ["CHECKED_OUT", "CHECKOUT_APPROVED", "check_out"] }
        } else {
           query.status = status
        }
      }
    } else {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    // Search filter
    if (searchTerm) {
      const searchRegex = new RegExp(searchTerm, 'i')
      query.$or = [
        ...(query.$or || []),
        { guestName: searchRegex },
        { phone: searchRegex },
        { roomNumber: searchRegex },
        { faydaId: searchRegex }
      ]
    }

    // Execute query with pagination
    const requests = await ReceptionRequest.find(query)
      .select('-idPhotoFront -idPhotoBack') // Exclude large photo fields from list
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean()

    // Get total count for pagination
    const total = await ReceptionRequest.countDocuments(query)

    // Calculate global overdue count (across all tabs, specifically for 'guests' status)
    const todayStr = new Date().toISOString().split('T')[0]
    const overdueCount = await ReceptionRequest.countDocuments({
      status: { $in: ["CHECKIN_APPROVED", "ACTIVE", "guests", "check_in"] },
      checkOut: { $lt: todayStr }
    })

    return NextResponse.json({
      data: requests.map(r => ({ ...r, _id: r._id?.toString() })),
      total,
      overdueCount,
      limit,
      skip,
      hasMore: skip + limit < total
    })
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: "Failed to get requests" }, { status })
  }
}

// POST - reception staff submits a new request
export async function POST(request: Request) {
  try {
    const decoded = await validateSession(request)
    if (!["reception", "admin"].includes(decoded.role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    try {
      await connectDB()
    } catch (dbError: any) {
      // Database unreachable - return error with 500 status
      console.warn("⚠️ Reception requests POST - DB unreachable")
      return NextResponse.json({ message: "Failed to submit request" }, { status: 500 })
    }

    const body = await request.json()
    const { guestName, faydaId, phone, idPhotoFront, idPhotoBack, photoUrl, floorId, roomNumber, roomPrice,
            inquiryType, checkIn, checkOut, checkInTime, checkOutTime, guests, paymentMethod, chequeNumber, paymentReference, transactionUrl, notes } = body

    if (!guestName || !inquiryType) {
      return NextResponse.json({ message: "Guest name and inquiry type are required" }, { status: 400 })
    }

    if (!phone || !String(phone).trim()) {
      return NextResponse.json({ message: "Phone number is required" }, { status: 400 })
    }

    if (!idPhotoFront || !idPhotoBack) {
      return NextResponse.json({ message: "Front and back guest ID photos are required" }, { status: 400 })
    }

    if (!floorId || !roomNumber) {
      return NextResponse.json({ message: "Floor and room are required" }, { status: 400 })
    }

    if (!guests) {
      return NextResponse.json({ message: "Guest number is required" }, { status: 400 })
    }

    if (!checkIn || !checkOut) {
      return NextResponse.json({ message: "Check-in and check-out dates are required" }, { status: 400 })
    }

    if (paymentMethod === "cash" && (!paymentReference || !String(paymentReference).trim())) {
      return NextResponse.json({ message: "Receipt number is required for cash payment" }, { status: 400 })
    }

    if (paymentMethod !== "cash" && (!transactionUrl || !String(transactionUrl).trim())) {
      return NextResponse.json({ message: "Receipt URL is required for non-cash payments" }, { status: 400 })
    }

    const doc = await ReceptionRequest.create({
      guestName, faydaId, phone, idPhotoFront, idPhotoBack, photoUrl, floorId, roomNumber, roomPrice,
      inquiryType, checkIn, checkOut, checkInTime, checkOutTime, guests, paymentMethod, chequeNumber, paymentReference, transactionUrl, notes,
      status: inquiryType === "check_out" ? "CHECKOUT_PENDING" : "CHECKIN_PENDING",
      submittedBy: decoded.id
    })

    return NextResponse.json({ message: "Request submitted", request: { ...doc.toObject(), _id: doc._id.toString() } })
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: "Failed to submit request" }, { status })
  }
}

// DELETE all requests (Admin only)
export async function DELETE(request: Request) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }
    
    await connectDB()
    await ReceptionRequest.deleteMany({})

    return NextResponse.json({ message: "All reception requests deleted successfully." })
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: "Failed to delete requests" }, { status })
  }
}
