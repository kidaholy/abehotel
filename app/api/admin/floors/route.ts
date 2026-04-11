import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Floor from "@/lib/models/floor"
import Table from "@/lib/models/table"
import { validateSession } from "@/lib/auth"

// Middleware helper to verify admin access
const verifyAdmin = async (request: Request) => {
    try {
        const decoded = await validateSession(request)
        if (decoded.role !== "admin" && decoded.role !== "super-admin") return null
        return decoded
    } catch (error) {
        return null
    }
}

export async function GET(request: Request) {
    try {
        if (!(await verifyAdmin(request))) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

        await connectDB()
        const floors = await (Floor as any).find({}).sort({ order: 1 })
        return NextResponse.json(floors)
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to fetch floors" }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        if (!(await verifyAdmin(request))) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

        await connectDB()
        const { floorNumber, description, order, isVIP, type } = await request.json()

        if (!floorNumber) {
            return NextResponse.json({ message: "Floor Number is required" }, { status: 400 })
        }

        const floor = await (Floor as any).create({ floorNumber, description, order: order || 0, isVIP: isVIP || false, type: type || 'standard' })
        return NextResponse.json(floor, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to create floor" }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        if (!(await verifyAdmin(request))) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

        await connectDB()
        const { id, floorNumber, description, order, isActive, isVIP, type } = await request.json()

        if (!id) {
            return NextResponse.json({ message: "ID is required" }, { status: 400 })
        }

        const updatedFloor = await (Floor as any).findByIdAndUpdate(
            id,
            { floorNumber, description, order, isActive, isVIP, type },
            { new: true }
        )

        if (!updatedFloor) {
            return NextResponse.json({ message: "Floor not found" }, { status: 404 })
        }

        return NextResponse.json(updatedFloor)
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to update floor" }, { status: 500 })
    }
}

export async function DELETE(request: Request) {
    try {
        if (!(await verifyAdmin(request))) return NextResponse.json({ message: "Unauthorized" }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const id = searchParams.get("id")

        if (!id) return NextResponse.json({ message: "ID is required" }, { status: 400 })

        await connectDB()

        // 1. Find the floor to get its floorNumber if needed for unassigning/cascading
        const floor = await (Floor as any).findById(id)
        if (!floor) return NextResponse.json({ message: "Floor not found" }, { status: 404 })

        // 2. Delete the floor (Tables are now global and independent)
        await (Floor as any).findByIdAndDelete(id)
        return NextResponse.json({ message: "Floor deleted" })
    } catch (error: any) {
        return NextResponse.json({ message: "Failed to delete floor" }, { status: 500 })
    }
}
