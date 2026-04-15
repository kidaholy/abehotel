import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Room from "@/lib/models/room"
import { validateSession } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        await connectDB()
        const rooms = await (Room as any).find({ isActive: true }).sort({ roomNumber: 1 }).populate('floorId')
        return NextResponse.json(rooms)
    } catch (error) {
        return NextResponse.json({ message: "Failed to fetch rooms" }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const decoded = await validateSession(req)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") {
            return NextResponse.json({ message: "Forbidden" }, { status: 403 })
        }

        await connectDB()
        const body = await req.json()
        
        if (!body.roomNumber || !body.floorId) {
            return NextResponse.json({ message: "Room number and floor are required" }, { status: 400 })
        }

        const room = await (Room as any).create(body)
        return NextResponse.json(room, { status: 201 })
    } catch (error: any) {
        if (error.code === 11000) {
            return NextResponse.json({ message: "Room number already exists" }, { status: 400 })
        }
        return NextResponse.json({ message: "Failed to create room" }, { status: 500 })
    }
}
