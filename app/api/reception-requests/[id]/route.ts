import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import ReceptionRequest from "@/lib/models/reception-request"
import { validateSession } from "@/lib/auth"

// PUT - admin approves/denies OR reception requests extension
export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params
    const decoded = await validateSession(request)
    await connectDB()

    const body = await request.json()
    const { status, reviewNote, checkOut } = body

    // Reception staff can submit an extension request (resets to pending with new checkOut)
    if (decoded.role === "reception") {
      if (status !== "pending") {
        return NextResponse.json({ message: "Reception can only submit extension requests" }, { status: 403 })
      }
      const updated = await ReceptionRequest.findByIdAndUpdate(
        params.id,
        { status: "pending", reviewNote: reviewNote || "", checkOut: checkOut || undefined },
        { new: true }
      )
      if (!updated) return NextResponse.json({ message: "Request not found" }, { status: 404 })
      return NextResponse.json({ message: "Extension requested", request: { ...updated.toObject(), _id: updated._id.toString() } })
    }

    // Admin approve/deny
    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    if (!["approved", "denied"].includes(status)) {
      return NextResponse.json({ message: "Status must be 'approved' or 'denied'" }, { status: 400 })
    }

    const updated = await ReceptionRequest.findByIdAndUpdate(
      params.id,
      { status, reviewNote: reviewNote || "", reviewedBy: decoded.id },
      { new: true }
    )

    if (!updated) return NextResponse.json({ message: "Request not found" }, { status: 404 })

    return NextResponse.json({ message: `Request ${status}`, request: { ...updated.toObject(), _id: updated._id.toString() } })
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: error.message || "Failed to update request" }, { status })
  }
}
