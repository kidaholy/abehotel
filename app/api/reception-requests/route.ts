import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import ReceptionRequest from "@/lib/models/reception-request"
import { validateSession } from "@/lib/auth"

// GET all requests (admin) or own submissions (reception)
export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)
    
    try {
      await connectDB()
    } catch (dbError: any) {
      // Database unreachable - return empty array with 200 status
      console.warn("⚠️ Reception requests - DB unreachable, returning empty array")
      return NextResponse.json([])
    }

    let requests
    if (decoded.role === "admin") {
      requests = await ReceptionRequest.find({}).sort({ createdAt: -1 }).lean()
    } else if (decoded.role === "reception") {
      // Reception staff sees all approved guests + their own submissions
      requests = await ReceptionRequest.find({
        $or: [
          { submittedBy: decoded.id },
          { status: "approved" }
        ]
      }).sort({ createdAt: -1 }).lean()
    } else {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(requests.map(r => ({ ...r, _id: r._id?.toString() })))
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

    const doc = await ReceptionRequest.create({
      guestName, faydaId, phone, idPhotoFront, idPhotoBack, photoUrl, floorId, roomNumber, roomPrice,
      inquiryType, checkIn, checkOut, checkInTime, checkOutTime, guests, paymentMethod, chequeNumber, paymentReference, transactionUrl, notes,
      status: "pending",
      submittedBy: decoded.id
    })

    return NextResponse.json({ message: "Request submitted", request: { ...doc.toObject(), _id: doc._id.toString() } })
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: "Failed to submit request" }, { status })
  }
}
