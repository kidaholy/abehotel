import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import ReceptionRequest from "@/lib/models/reception-request"
import { validateSession } from "@/lib/auth"

// GET all requests (cashier with privilege or admin)
export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)
    await connectDB()

    // Import User model to check privilege
    const User = (await import("@/lib/models/user")).default
    const requestingUser = await User.findById(decoded.id).lean()

    const isAdmin = decoded.role === "admin"
    const isCashierWithPrivilege = decoded.role === "cashier" && (requestingUser as any)?.canManageReception

    if (!isAdmin && !isCashierWithPrivilege) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const requests = await ReceptionRequest.find({}).sort({ createdAt: -1 }).lean()
    return NextResponse.json(requests.map(r => ({ ...r, _id: r._id?.toString() })))
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: error.message || "Failed to get requests" }, { status })
  }
}

// POST - reception staff submits a new request
export async function POST(request: Request) {
  try {
    const decoded = await validateSession(request)
    if (!["reception", "admin"].includes(decoded.role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    const body = await request.json()
    const { guestName, phone, roomNumber, inquiryType, checkIn, checkOut, guests, notes } = body

    if (!guestName || !inquiryType) {
      return NextResponse.json({ message: "Guest name and inquiry type are required" }, { status: 400 })
    }

    const doc = await ReceptionRequest.create({
      guestName, phone, roomNumber, inquiryType, checkIn, checkOut, guests, notes,
      status: "pending",
      submittedBy: decoded.id
    })

    return NextResponse.json({ message: "Request submitted", request: { ...doc.toObject(), _id: doc._id.toString() } })
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: error.message || "Failed to submit request" }, { status })
  }
}
