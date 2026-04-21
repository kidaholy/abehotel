import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import ReceptionRequest from "@/lib/models/reception-request"
import Room from "@/lib/models/room"
import { validateSession } from "@/lib/auth"

// GET - fetch single request details (including photos)
export async function GET(request: Request, context: any) {
  try {
    const params = await context.params
    const decoded = await validateSession(request)
    if (!["admin", "reception"].includes(decoded.role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    const doc = await ReceptionRequest.findById(params.id).lean()
    if (!doc) return NextResponse.json({ message: "Request not found" }, { status: 404 })

    return NextResponse.json({
      ...doc,
      _id: doc._id?.toString()
    })
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to get request" }, { status: 500 })
  }
}


// PUT - admin approves/denies OR reception requests extension
export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params
    const decoded = await validateSession(request)
    await connectDB()

    const body = await request.json()
    const { status, reviewNote, checkOut, inquiryType } = body

    // Reception staff can request either:
    // - checkout approval (CHECKOUT_PENDING + inquiryType check_out)
    // - stay extension approval (EXTEND_PENDING, keeps inquiryType as check_in)
    if (decoded.role === "reception") {
      const isCheckoutRequest = inquiryType === "check_out" || status === "CHECKOUT_PENDING"
      const isExtendRequest = status === "EXTEND_PENDING"

      if (!isCheckoutRequest && !isExtendRequest) {
        return NextResponse.json({ message: "Reception can only request checkout or extension approval" }, { status: 403 })
      }

      const update: any = {
        reviewNote: reviewNote || "",
        ...(checkOut ? { checkOut } : {}),
      }

      if (isCheckoutRequest) {
        update.status = "CHECKOUT_PENDING"
        update.inquiryType = "check_out"
      } else {
        update.status = "EXTEND_PENDING"
      }

      const updated = await ReceptionRequest.findByIdAndUpdate(params.id, update, { new: true })
      if (!updated) return NextResponse.json({ message: "Request not found" }, { status: 404 })
      return NextResponse.json({
        message: isCheckoutRequest ? "Checkout requested" : "Extension requested",
        request: { ...updated.toObject(), _id: updated._id.toString() },
      })
    }

    // Admin approve/deny
    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    if (!["CHECKIN_PENDING", "CHECKIN_APPROVED", "EXTEND_PENDING", "CHECKOUT_PENDING", "CHECKOUT_APPROVED", "CHECKED_OUT", "REJECTED", "guests", "rejected", "check_in", "check_out", "pending", "ACTIVE"].includes(status)) {
      console.error(`❌ [API] Invalid status provided: ${status}`)
      return NextResponse.json({ message: "Invalid status" }, { status: 400 })
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
    console.log(`📋 [API] - New Inquiry Type (if provided): ${inquiryType || "not changing"}`)

    // Use the NEW inquiryType if provided, otherwise use the current one
    const effectiveInquiryType = inquiryType || currentRequest.inquiryType
    console.log(`📋 [API] - Effective Inquiry Type for validation: ${effectiveInquiryType}`)

    // RULE: Checkout workflow must never be "approved as check-in".
    // The only allowed "back to checked-in" transition is DENYING a checkout request:
    // CHECKOUT_PENDING --(deny)--> CHECKIN_APPROVED
    if (
      effectiveInquiryType === "check_out" &&
      ["CHECKIN_PENDING", "CHECKIN_APPROVED", "check_in"].includes(status) &&
      !(currentRequest.status === "CHECKOUT_PENDING" && status === "CHECKIN_APPROVED")
    ) {
      console.error(`❌ [API] VALIDATION FAILED: Invalid checkout transition to check-in status`)
      return NextResponse.json({ message: "ERROR: Checkout requests cannot be set to check-in status (except denying checkout)." }, { status: 400 })
    }

    // RULE: Check-in workflow shouldn't jump into checkout states unless explicitly switched to check_out.
    // We still allow existing rows to use legacy ACTIVE/guests/check_in and be switched into CHECKOUT_PENDING.
    if (
      effectiveInquiryType === "check_in" &&
      ["CHECKOUT_PENDING", "CHECKOUT_APPROVED", "CHECKED_OUT", "check_out"].includes(status) &&
      inquiryType !== "check_out"
    ) {
      console.error(`❌ [API] VALIDATION FAILED: Must set inquiryType=check_out before entering checkout workflow`)
      return NextResponse.json({ message: "ERROR: Set inquiryType to check_out before requesting checkout." }, { status: 400 })
    }

    console.log(`✅ [API] Status validation passed`)
    console.log(`✅ [API] Inquiry Type: ${currentRequest.inquiryType}`)
    console.log(`✅ [API] Effective Inquiry Type: ${effectiveInquiryType}`)
    console.log(`✅ [API] Requested Status: ${status}`)
    console.log(`✅ [API] Transition is VALID`)

    // Canonicalize status updates for the new workflow.
    // - Admin approving checkout should result in CHECKED_OUT.
    // - Admin denying checkout should result in CHECKIN_APPROVED.
    let targetStatus = status

    if (currentRequest.status === "CHECKOUT_PENDING") {
      if (status === "CHECKOUT_APPROVED") targetStatus = "CHECKED_OUT"
      if (status === "REJECTED" || status === "rejected") targetStatus = "CHECKIN_APPROVED"
    }

    // Extension approval/denial: guest remains checked in (CHECKIN_APPROVED)
    if (currentRequest.status === "EXTEND_PENDING") {
      if (status === "CHECKIN_APPROVED") targetStatus = "CHECKIN_APPROVED"
      if (status === "REJECTED" || status === "rejected") targetStatus = "CHECKIN_APPROVED"
    }

    const updated = await ReceptionRequest.findByIdAndUpdate(
      params.id,
      {
        status: targetStatus,
        reviewNote: reviewNote || "",
        reviewedBy: decoded.id,
        ...(inquiryType ? { inquiryType } : {}),
        ...(checkOut ? { checkOut } : {}),
      },
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
    
    // Special handling for check-in completion transition
    if ((currentRequest.status === "CHECKIN_APPROVED" || currentRequest.status === "check_in") && status === "ACTIVE") {
      console.log(`🏨 [API] CHECK-IN COMPLETED BY ADMIN: ${updated.guestName}`)
    }
    
    // FINAL VALIDATION: Double-check that the status matches the inquiryType
    const validCheckOutStatuses = ["CHECKOUT_PENDING", "CHECKOUT_APPROVED", "CHECKED_OUT", "check_out", "pending"]
    const validCheckInStatuses = ["CHECKIN_PENDING", "CHECKIN_APPROVED", "ACTIVE", "check_in", "guests", "pending", "REJECTED", "rejected"]
    
    if (updated.inquiryType === "check_out" && !validCheckOutStatuses.includes(updated.status)) {
      console.error(`❌ [API] =========================================`)
      console.error(`❌ [API] POST-UPDATE VALIDATION ERROR`)
      console.error(`❌ [API] Check-out request has invalid status: ${updated.status}`)
      console.error(`❌ [API] Expected one of: ${validCheckOutStatuses.join(", ")}`)
      console.error(`❌ [API] This indicates a DATABASE ERROR`)
      console.error(`❌ [API] =========================================`)
    }
    
    if (updated.inquiryType === "check_in" && !validCheckInStatuses.includes(updated.status)) {
      console.error(`❌ [API] =========================================`)
      console.error(`❌ [API] POST-UPDATE VALIDATION ERROR`)
      console.error(`❌ [API] Check-in request has invalid status: ${updated.status}`)
      console.error(`❌ [API] Expected one of: ${validCheckInStatuses.join(", ")}`)
      console.error(`❌ [API] This indicates a DATABASE ERROR`)
      console.error(`❌ [API] =========================================`)
    }

    // If check-out is completed, release the room
    if (targetStatus === "CHECKED_OUT" && updated.roomNumber) {
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
    } else if (targetStatus === "CHECKED_OUT") {
      console.warn(`⚠️ [API] Checkout completed but no room number found for guest: ${updated.guestName}`)
    }

    return NextResponse.json({ message: `Request ${targetStatus}`, request: { ...updated.toObject(), _id: updated._id.toString() } })
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
