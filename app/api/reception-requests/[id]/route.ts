import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import ReceptionRequest from "@/lib/models/reception-request"
import { validateSession } from "@/lib/auth"

// PUT - approve or deny a request (admin only)
export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params
    const decoded = await validateSession(request)
    await connectDB()

    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    const { status, reviewNote } = await request.json()
    if (!["approved", "denied"].includes(status)) {
      return NextResponse.json({ message: "Status must be 'approved' or 'denied'" }, { status: 400 })
    }

    const updated = await ReceptionRequest.findByIdAndUpdate(
      params.id,
      { status, reviewNote: reviewNote || "", reviewedBy: decoded.id },
      { new: true }
    )

    if (!updated) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 })
    }

    return NextResponse.json({ message: `Request ${status}`, request: { ...updated.toObject(), _id: updated._id.toString() } })
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: error.message || "Failed to update request" }, { status })
  }
}
