import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Vip2MenuItem from "@/lib/models/vip2-menu-item"
import { validateSession } from "@/lib/auth"

// Update VIP 2 menu item
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    const data = await request.json()
    
    const updated = await (Vip2MenuItem as any).findByIdAndUpdate(
      params.id,
      {
        $set: {
          menuId: data.menuId?.toString().trim(),
          name: data.name?.trim(),
          mainCategory: data.mainCategory,
          category: data.category?.trim(),
          price: data.price ? Number(data.price) : undefined,
          description: data.description?.trim(),
          image: data.image,
          preparationTime: data.preparationTime ? Number(data.preparationTime) : undefined,
          available: data.available,
          recipe: data.recipe,
          reportUnit: data.reportUnit,
          reportQuantity: data.reportQuantity !== undefined ? Number(data.reportQuantity) : undefined,
          distributions: data.distributions
        }
      },
      { new: true }
    )

    if (!updated) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "VIP 2 Menu item updated successfully",
      item: updated
    })
  } catch (error: any) {
    console.error("❌ Update VIP 2 menu item error:", error)
    return NextResponse.json({ message: error.message || "Failed to update item" }, { status: 500 })
  }
}

// Delete VIP 2 menu item
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    const deleted = await (Vip2MenuItem as any).findByIdAndDelete(params.id)

    if (!deleted) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "VIP 2 Menu item deleted successfully" })
  } catch (error: any) {
    console.error("❌ Delete VIP 2 menu item error:", error)
    return NextResponse.json({ message: error.message || "Failed to delete item" }, { status: 500 })
  }
}
