import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import VipMenuItem from "@/lib/models/vip-menu-item"
import { validateSession } from "@/lib/auth"

// Update VIP menu item
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    const data = await request.json()
    
    const updated = await (VipMenuItem as any).findByIdAndUpdate(
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
          distributions: data.distributions,
          vipLevel: data.vipLevel
        }
      },
      { new: true }
    )

    if (!updated) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 })
    }

    return NextResponse.json({
      message: "VIP Menu item updated successfully",
      item: updated
    })
  } catch (error: any) {
    console.error("❌ Update VIP menu item error:", error)
    return NextResponse.json({ message: error.message || "Failed to update item" }, { status: 500 })
  }
}

// Delete VIP menu item
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const decoded = await validateSession(request)
    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    const deleted = await (VipMenuItem as any).findByIdAndDelete(params.id)

    if (!deleted) {
      return NextResponse.json({ message: "Item not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "VIP Menu item deleted successfully" })
  } catch (error: any) {
    console.error("❌ Delete VIP menu item error:", error)
    return NextResponse.json({ message: error.message || "Failed to delete item" }, { status: 500 })
  }
}
