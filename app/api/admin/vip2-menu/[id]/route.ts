import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Vip2MenuItem from "@/lib/models/vip2-menu-item"
import { validateSession } from "@/lib/auth"
import mongoose from "mongoose"

// =============================================================================
// VIP 2 MENU ITEM — Update & Delete ONLY from `vip2menuitems`
// =============================================================================

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const decoded = await validateSession(request)
    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    const data = await request.json()

    console.log(`[VIP2] PUT request for _id: ${id} in vip2menuitems`)

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid ID format" }, { status: 400 })
    }

    const updatePayload = {
      name: data.name?.trim(),
      mainCategory: data.mainCategory,
      category: data.category?.trim(),
      price: data.price !== undefined ? Number(data.price) : undefined,
      description: data.description?.trim(),
      image: data.image,
      preparationTime: data.preparationTime ? Number(data.preparationTime) : undefined,
      available: data.available,
      recipe: data.recipe,
      reportUnit: data.reportUnit,
      reportQuantity: data.reportQuantity !== undefined ? Number(data.reportQuantity) : undefined,
      distributions: data.distributions,
      // Convert empty stockItemId to null to avoid BSON casting errors
      stockItemId: data.stockItemId === "" ? null : data.stockItemId
    }

    // Remove undefined fields so we don't overwrite with undefined
    Object.keys(updatePayload).forEach(k => (updatePayload as any)[k] === undefined && delete (updatePayload as any)[k])

    const updated = await (Vip2MenuItem as any).findByIdAndUpdate(
      id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    )

    if (!updated) {
      console.error(`[VIP2] _id ${id} NOT found in vip2menuitems`)
      return NextResponse.json({ message: "Item not found in VIP 2 collection" }, { status: 404 })
    }

    console.log(`[VIP2] Successfully updated _id: ${id} in vip2menuitems`)
    return NextResponse.json({ message: "VIP 2 Menu item updated successfully", item: updated })
  } catch (error: any) {
    console.error("[VIP2] PUT error:", error)
    return NextResponse.json({ message: "Failed to update VIP 2 item" }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const decoded = await validateSession(request)
    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    console.log(`[VIP2] DELETE request for _id: ${id} in vip2menuitems`)

    const deleted = await (Vip2MenuItem as any).findByIdAndDelete(id)

    if (!deleted) {
      return NextResponse.json({ message: "Item not found in VIP 2 collection" }, { status: 404 })
    }

    console.log(`[VIP2] Successfully deleted _id: ${id} from vip2menuitems`)
    return NextResponse.json({ message: "VIP 2 Menu item deleted successfully" })
  } catch (error: any) {
    console.error("[VIP2] DELETE error:", error)
    return NextResponse.json({ message: "Failed to delete VIP 2 item" }, { status: 500 })
  }
}
