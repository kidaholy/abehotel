import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Service from "@/lib/models/service"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    await connectDB()
    const services = await Service.find({}).sort({ category: 1, name: 1 }).lean()
    return NextResponse.json(services.map(s => ({ ...s, _id: s._id?.toString() })))
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to get services" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    await connectDB()
    const body = await request.json()
    const { name, description, category, price, unit, isAvailable, icon } = body
    if (!name || !category || price === undefined) {
      return NextResponse.json({ message: "Name, category, and price are required" }, { status: 400 })
    }
    const service = await Service.create({ name, description, category, price, unit, isAvailable: isAvailable ?? true, icon: icon || "🛎️" })
    return NextResponse.json({ message: "Service created", service: { ...service.toObject(), _id: service._id.toString() } })
  } catch (error: any) {
    return NextResponse.json({ message: "Failed to create service" }, { status: 500 })
  }
}
