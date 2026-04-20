import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import ReceptionRequest from "@/lib/models/reception-request"
import Room from "@/lib/models/room"
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

    if (!["guests", "rejected", "check_in", "check_out", "pending"].includes(status)) {
      return NextResponse.json({ message: "Status must be 'guests', 'rejected', 'check_in', 'check_out', or 'pending'" }, { status: 400 })
    }

    console.log(`📥 [API] =========================================`)
    console.log(`📥 [API] RECEPTION REQUEST UPDATE RECEIVED`)
    console.log(`📥 [API] Request ID: ${params.id}`)
    console.log(`📥 [API] Requested Status: ${status}`)
    console.log(`📥 [API] User Role: ${decoded.role}`)
    console.log(`📥 [API] =========================================`)

    // Get the current request to check its inquiryType
    const currentRequest = await ReceptionRequest.findById(params.id)
    if (!currentRequest) {
      console.error(`❌ [API] Request not found: ${params.id}`)
      return NextResponse.json({ message: "Request not found" }, { status: 404 })
    }

    console.log(`📋 [API] Current Request Details:`)
    console.log(`📋 [API] - Guest: ${currentRequest.guestName}`)
    console.log(`📋 [API] - Inquiry Type: ${currentRequest.inquiryType}`)
    console.log(`📋 [API] - Current Status: ${currentRequest.status}`)
    console.log(`📋 [API] - Room: ${currentRequest.roomNumber}`)

    // CRITICAL VALIDATION: Ensure check_out requests never go to check_in status
    if (currentRequest.inquiryType === "check_out" && status === "check_in") {
      console.error(`❌ [API] =========================================`)
      console.error(`❌ [API] CRITICAL VALIDATION ERROR`)
      console.error(`❌ [API] Attempting to set check_out request to check_in status!`)
      console.error(`❌ [API] Request ID: ${params.id}`)
      console.error(`❌ [API] Guest: ${currentRequest.guestName}`)
      console.error(`❌ [API] Inquiry Type: ${currentRequest.inquiryType}`)
      console.error(`❌ [API] Attempted Status: ${status}`)
      console.error(`❌ [API] This is INVALID - check_out requests must use check_out status`)
      console.error(`❌ [API] =========================================`)
      return NextResponse.json({ 
        message: "ERROR: Check-out requests cannot be set to check_in status. Use check_out status instead.",
        errorCode: "INVALID_STATUS_TRANSITION"
      }, { status: 400 })
    }

    // CRITICAL VALIDATION: Ensure check_in requests never go to check_out status
    if (currentRequest.inquiryType === "check_in" && status === "check_out") {
      console.error(`❌ [API] =========================================`)
      console.error(`❌ [API] CRITICAL VALIDATION ERROR`)
      console.error(`❌ [API] Attempting to set check_in request to check_out status!`)
      console.error(`❌ [API] Request ID: ${params.id}`)
      console.error(`❌ [API] Guest: ${currentRequest.guestName}`)
      console.error(`❌ [API] Inquiry Type: ${currentRequest.inquiryType}`)
      console.error(`❌ [API] Attempted Status: ${status}`)
      console.error(`❌ [API] This is INVALID - check_in requests must use check_in status`)
      console.error(`❌ [API] =========================================`)
      return NextResponse.json({ 
        message: "ERROR: Check-in requests cannot be set to check_out status. Use check_in status instead.",
        errorCode: "INVALID_STATUS_TRANSITION"
      }, { status: 400 })
    }

    console.log(`✅ [API] Status validation passed`)
    console.log(`✅ [API] Inquiry Type: ${currentRequest.inquiryType}`)
    console.log(`✅ [API] Requested Status: ${status}`)
    console.log(`✅ [API] Transition is VALID`)

    const updated = await ReceptionRequest.findByIdAndUpdate(
      params.id,
      { status, reviewNote: reviewNote || "", reviewedBy: decoded.id },
      { new: true }
    )

    if (!updated) {
      console.error(`❌ [API] Request not found after update: ${params.id}`)
      return NextResponse.json({ message: "Request not found" }, { status: 404 })
    }

    // Log the final status for verification
    console.log(`✅ [API] =========================================`)
    console.log(`✅ [API] REQUEST UPDATED SUCCESSFULLY`)
    console.log(`✅ [API] Request ID: ${updated._id}`)
    console.log(`✅ [API] Guest: ${updated.guestName}`)
    console.log(`✅ [API] Final Status: ${updated.status}`)
    console.log(`✅ [API] Inquiry Type: ${updated.inquiryType}`)
    console.log(`✅ [API] =========================================`)
    
    // Special handling for check_in → guests transition (completing check-in)
    if (currentRequest.status === "check_in" && status === "guests") {
      console.log(`🏨 [API] =========================================`)
      console.log(`🏨 [API] CHECK-IN COMPLETED BY ADMIN`)
      console.log(`🏨 [API] Guest: ${updated.guestName}`)
      console.log(`🏨 [API] Room: ${updated.roomNumber}`)
      console.log(`🏨 [API] Status changed: check_in → guests`)
      console.log(`🏨 [API] Guest is now ACTIVE and staying at the hotel`)
      console.log(`🏨 [API] =========================================`)
    }
    
    // FINAL VALIDATION: Double-check that the status matches the inquiryType
    if (updated.inquiryType === "check_out" && updated.status !== "check_out" && updated.status !== "pending" && updated.status !== "rejected" && updated.status !== "guests") {
      console.error(`❌ [API] =========================================`)
      console.error(`❌ [API] POST-UPDATE VALIDATION ERROR`)
      console.error(`❌ [API] Check-out request has invalid status: ${updated.status}`)
      console.error(`❌ [API] Expected: check_out, pending, rejected, or guests`)
      console.error(`❌ [API] This indicates a DATABASE ERROR`)
      console.error(`❌ [API] =========================================`)
    }
    
    if (updated.inquiryType === "check_in" && updated.status !== "check_in" && updated.status !== "pending" && updated.status !== "rejected" && updated.status !== "guests") {
      console.error(`❌ [API] =========================================`)
      console.error(`❌ [API] POST-UPDATE VALIDATION ERROR`)
      console.error(`❌ [API] Check-in request has invalid status: ${updated.status}`)
      console.error(`❌ [API] Expected: check_in, pending, rejected, or guests`)
      console.error(`❌ [API] This indicates a DATABASE ERROR`)
      console.error(`❌ [API] =========================================`)
    }

    // If check-out is approved, release the room (set status to available)
    if (status === "check_out" && updated.roomNumber) {
      console.log(`🔑 [API] =========================================`)
      console.log(`🔑 [API] ROOM RELEASE OPERATION`)
      console.log(`🔑 [API] Releasing room ${updated.roomNumber}`)
      console.log(`🔑 [API] Guest: ${updated.guestName}`)
      console.log(`🔑 [API] Status: ${updated.status}`)
      console.log(`🔑 [API] =========================================`)
      
      const roomUpdate = await Room.findOneAndUpdate(
        { roomNumber: updated.roomNumber },
        { status: "available" },
        { new: true }
      )
      if (roomUpdate) {
        console.log(`✅ [API] Room ${updated.roomNumber} successfully released to available status`)
        console.log(`✅ [API] Room previous status: ${roomUpdate.status}`)
      } else {
        console.warn(`⚠️ [API] Room ${updated.roomNumber} not found in database`)
      }
    } else if (status === "check_out") {
      console.warn(`⚠️ [API] Check-out approved but no room number found for guest: ${updated.guestName}`)
    }

    return NextResponse.json({ message: `Request ${status}`, request: { ...updated.toObject(), _id: updated._id.toString() } })
  } catch (error: any) {
    console.error("❌ Reception request update error:", error)
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: "Failed to update request" }, { status })
  }
}

// DELETE single request (admin only)
export async function DELETE(request: Request, context: any) {
  try {
    const params = await context.params
    const decoded = await validateSession(request)
    
    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    const deleted = await ReceptionRequest.findByIdAndDelete(params.id)
    
    if (!deleted) {
      return NextResponse.json({ message: "Request not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Request deleted successfully" })
  } catch (error: any) {
    const status = error.message?.includes("Unauthorized") ? 401 : 500
    return NextResponse.json({ message: "Failed to delete request" }, { status })
  }
}
