import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Floor from "@/lib/models/floor"
import { validateSession } from "@/lib/auth"

export async function GET(request: Request) {
    try {
        await validateSession(request)
        await connectDB()
        const floors = await Floor.find({ isActive: true }).sort({ order: 1 })
        return NextResponse.json(floors)
    } catch (error: any) {
        console.error("Failed to fetch floors:", error)
        return NextResponse.json({ message: "Failed to fetch floors" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        await validateSession(request)
        await connectDB()
        const { name, description, order } = await request.json()
        if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 })
        const floor = await Floor.create({ name, description, order: order ?? 0 })
        return NextResponse.json(floor, { status: 201 })
    } catch (error: any) {
        console.error("Failed to create floor:", error)
        const message = error.code === 11000 ? "Floor name already exists" : "Failed to create floor"
        return NextResponse.json({ message }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        await validateSession(request)
        await connectDB()
        const { id, name, description, order, isActive } = await request.json()
        if (!id) return NextResponse.json({ message: "Floor ID is required" }, { status: 400 })
        const floor = await Floor.findByIdAndUpdate(
            id,
            { ...(name !== undefined && { name }), ...(description !== undefined && { description }), ...(order !== undefined && { order }), ...(isActive !== undefined && { isActive }) },
            { new: true, runValidators: true }
        )
        if (!floor) return NextResponse.json({ message: "Floor not found" }, { status: 404 })
        return NextResponse.json(floor)
    } catch (error: any) {
        console.error("Failed to update floor:", error)
        const message = error.code === 11000 ? "Floor name already exists" : "Failed to update floor"
        return NextResponse.json({ message }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        await validateSession(request)
        await connectDB()
        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")
        if (!id) return NextResponse.json({ message: "Floor ID is required" }, { status: 400 })
        const floor = await Floor.findByIdAndDelete(id)
        if (!floor) return NextResponse.json({ message: "Floor not found" }, { status: 404 })
        return NextResponse.json({ message: "Floor deleted" })
    } catch (error: any) {
        console.error("Failed to delete floor:", error)
        return NextResponse.json({ message: "Failed to delete floor" }, { status: 500 })
    }
}
