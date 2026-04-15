import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Room from "@/lib/models/room"
import { validateSession } from "@/lib/auth"

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params
        const decoded = await validateSession(req)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()
        const body = await req.json()
        console.log("🛠️ Updating Room ID:", id, "with body:", body)
        const room = await (Room as any).findByIdAndUpdate(id, body, { new: true })
        
        if (!room) {
            return NextResponse.json({ message: "Room not found" }, { status: 404 })
        }

        return NextResponse.json(room)
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to update room" }, { status: 500 })
    }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params
        const decoded = await validateSession(req)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()
        // Soft delete
        const room = await (Room as any).findByIdAndUpdate(id, { isActive: false }, { new: true })
        
        if (!room) {
            return NextResponse.json({ message: "Room not found" }, { status: 404 })
        }

        return NextResponse.json({ message: "Room deleted successfully" })
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to delete room" }, { status: 500 })
    }
}
