import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { connectDB } from "@/lib/db"
import MenuItem from "@/lib/models/menu-item"
import { validateSession } from "@/lib/auth"

// =============================================================================
// STANDARD MENU ITEM — Update & Delete ONLY from `menuitems`
// =============================================================================

export async function PUT(request: Request, context: any) {
  try {
    const params = await context.params

    const decoded = await validateSession(request)
    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    const data = await request.json()

    console.log(`[STANDARD] PUT request for _id: ${params.id} in menuitems`)

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ message: "Invalid ID format" }, { status: 400 })
    }

    const updatePayload: any = {
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

    // Remove undefined fields
    Object.keys(updatePayload).forEach(k => updatePayload[k] === undefined && delete updatePayload[k])

    const menuItem = await (MenuItem as any).findByIdAndUpdate(
      params.id,
      { $set: updatePayload },
      { new: true, runValidators: true }
    )

    if (!menuItem) {
      console.error(`[STANDARD] _id ${params.id} NOT found in menuitems`)
      return NextResponse.json({ message: "Menu item not found in Standard collection" }, { status: 404 })
    }

    console.log(`[STANDARD] Successfully updated _id: ${params.id} in menuitems`)
    return NextResponse.json({
      message: "Menu item updated successfully",
      menuItem: { ...menuItem.toObject(), _id: menuItem._id.toString() }
    })
  } catch (error: any) {
    console.error("[STANDARD] PUT error:", error)
    return NextResponse.json({ message: "Failed to update menu item" }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: any) {
  try {
    const params = await context.params

    const decoded = await validateSession(request)
    if (decoded.role !== "admin" && decoded.role !== "super-admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()
    console.log(`[STANDARD] DELETE request for _id: ${params.id} in menuitems`)

    if (!mongoose.Types.ObjectId.isValid(params.id)) {
      return NextResponse.json({ message: "Invalid ID format" }, { status: 400 })
    }

    const menuItem = await (MenuItem as any).findByIdAndDelete(params.id)

    if (!menuItem) {
      return NextResponse.json({ message: "Menu item not found in Standard collection" }, { status: 404 })
    }

    console.log(`[STANDARD] Successfully deleted _id: ${params.id} from menuitems`)
    return NextResponse.json({ message: "Menu item deleted successfully" })
  } catch (error: any) {
    console.error("[STANDARD] DELETE error:", error)
    return NextResponse.json({ message: "Failed to delete menu item" }, { status: 500 })
  }
}