import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import User from "@/lib/models/user"
import { validateSession } from "@/lib/auth"

export async function PATCH(request: Request, context: any) {
  try {
    const [params, decoded] = await Promise.all([
      context.params,
      validateSession(request),
    ])

    if (decoded.role !== 'chef' && decoded.role !== 'bar' && decoded.role !== 'admin') {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 })
    }

    await connectDB()

    const { menuItemId, status } = await request.json()

    if (!menuItemId || !status) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    const orderToUpdate = await Order.findById(params.id)
    if (!orderToUpdate) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 })
    }

    // Role-based filtering for assigned categories
    const user = await User.findById(decoded.id).lean() as any
    const assignedCategories = (user?.assignedCategories || []).map((c: string) => c.trim().normalize("NFC").toLowerCase())

    let itemUpdated = false
    let allItemsReady = true
    let anyItemPreparing = false

    orderToUpdate.items.forEach((item: any) => {
      // Logic for specific item update
      if (item.menuItemId === menuItemId) {
        const itemCat = (item.category || "").trim().normalize("NFC").toLowerCase()
        const isAssigned = assignedCategories.includes(itemCat)
        const isDrinksForBar = decoded.role === 'bar' && item.mainCategory === 'Drinks'

        if (decoded.role === 'admin' || isAssigned || isDrinksForBar) {
          item.status = status
          itemUpdated = true
        }
      }

      // Progress Tracking
      const isItemDone = ['ready', 'served', 'completed', 'cancelled'].includes(item.status)
      if (!isItemDone) allItemsReady = false
      if (item.status === 'preparing') anyItemPreparing = true
    })

    if (!itemUpdated && decoded.role !== 'admin') {
        return NextResponse.json({ message: "Unauthorized category for this item" }, { status: 403 })
    }

    // Update overall order status based on item progress
    if (allItemsReady) {
       orderToUpdate.status = orderToUpdate.status === 'completed' ? 'completed' : 'ready'
    } else if (anyItemPreparing) {
       orderToUpdate.status = 'preparing'
    }

    await orderToUpdate.save()

    return NextResponse.json({ ok: true, orderStatus: orderToUpdate.status })
  } catch (error: any) {
    console.error("Update item status error:", error)
    return NextResponse.json({ message: "Failed to update item status" }, { status: 500 })
  }
}
