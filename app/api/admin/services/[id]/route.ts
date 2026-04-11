import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Service from "@/lib/models/service"
import { validateSession } from "@/lib/auth"

export async function PUT(request: Request, context: any) {
  try {
    const { id } = await context.params
    const decoded = await validateSession(request)
    if (decoded.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    await connectDB()
    const body = await request.json()
    const updated = await Service.findByIdAndUpdate(id, body, { new: true, runValidators: true })
    if (!updated) return NextResponse.json({ message: "Service not found" }, { status: 404 })
    return NextResponse.json({ message: "Service updated", service: { ...updated.toObject(), _id: updated._id.toString() } })
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to update service" }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const { id } = await context.params
    const decoded = await validateSession(request)
    if (decoded.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    await connectDB()
    const deleted = await Service.findByIdAndDelete(id)
    if (!deleted) return NextResponse.json({ message: "Service not found" }, { status: 404 })
    return NextResponse.json({ message: "Service deleted" })
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to delete service" }, { status: 500 })
  }
}
