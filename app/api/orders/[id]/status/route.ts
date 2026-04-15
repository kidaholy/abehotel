import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import User from "@/lib/models/user"
import MenuItem from "@/lib/models/menu-item"
import Settings from "@/lib/models/settings"
import { addNotification } from "@/lib/notifications"
import { calculateStockConsumption, applyStockAdjustment } from "@/lib/stock-logic"
import { validateSession } from "@/lib/auth"

export async function PUT(request: Request, context: any) {
  return await handleStatusUpdate(request, context)
}

export async function PATCH(request: Request, context: any) {
  return await handleStatusUpdate(request, context)
}

async function handleStatusUpdate(request: Request, context: any) {
  try {
    const [params, decoded] = await Promise.all([
      context.params,
      validateSession(request),
    ])

    await connectDB()

    const { status } = await request.json()

    if (status === "cancelled" && decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 })
    }

    const orderToUpdate = await Order.findById(params.id)
    if (!orderToUpdate) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 })
    }

    const previousStatus = orderToUpdate.status

    if (decoded.role === 'chef' || decoded.role === 'bar') {
      const user = await User.findById(decoded.id).lean() as any
      const assignedCategories = user?.assignedCategories || []

      let allItemsReady = true
      let anyItemPreparing = false

      const normalizedAssigned = assignedCategories.map((c: string) => c.trim().normalize("NFC").toLowerCase())

      orderToUpdate.items.forEach((item: any) => {
        const itemCat = (item.category || "").trim().normalize("NFC").toLowerCase()
        const isAssigned = normalizedAssigned.includes(itemCat)
        const isDrinksForBar = decoded.role === 'bar' && item.mainCategory === 'Drinks'

        if (isAssigned || isDrinksForBar) {
          item.status = status
        }
        const isItemDone = ['ready', 'served', 'completed', 'cancelled'].includes(item.status)
        if (!isItemDone) allItemsReady = false
        if (item.status === 'preparing') anyItemPreparing = true
      })

      if (status === 'cancelled') {
        // Chef cancelling the whole order — mark everything cancelled
        orderToUpdate.status = 'cancelled'
        orderToUpdate.items.forEach((item: any) => { item.status = 'cancelled' })
      } else {
        let newOverallStatus = orderToUpdate.status
        if (allItemsReady) {
          newOverallStatus = status === 'completed' ? 'completed' : 'ready'
        } else if (anyItemPreparing || status === 'preparing') {
          newOverallStatus = 'preparing'
        }
        orderToUpdate.status = newOverallStatus
      }
    } else {
      orderToUpdate.status = status
      orderToUpdate.items.forEach((item: any) => {
        item.status = status
      })
    }

    if (status === "cancelled" && previousStatus !== "cancelled") {
      const stockConsumptionMap = await calculateStockConsumption(orderToUpdate.items)
      await applyStockAdjustment(stockConsumptionMap, 1)
    }

    const now = new Date()

    if (status === "preparing" && previousStatus !== "preparing") {
      orderToUpdate.kitchenAcceptedAt = now
    }

    if (status === "ready" && previousStatus !== "ready") {
      orderToUpdate.readyAt = now
    }

    if ((status === "served" || status === "completed") &&
      (previousStatus !== "served" && previousStatus !== "completed")) {

      orderToUpdate.servedAt = now
      const createdAt = new Date(orderToUpdate.createdAt)
      const durationMs = now.getTime() - createdAt.getTime()
      const totalMinutes = Math.floor(durationMs / 60000)

      orderToUpdate.totalPreparationTime = totalMinutes

      let dynamicThreshold = orderToUpdate.thresholdMinutes

      if (!dynamicThreshold) {
        const menuItemIds = orderToUpdate.items.map((item: any) => item.menuItemId)
        const menuItems = await (MenuItem as any).find({ _id: { $in: menuItemIds } }).lean()
        const itemPrepTimes = menuItems.map((mi: any) => (mi as any).preparationTime || 0)
        const maxPrepTime = itemPrepTimes.length > 0 ? Math.max(...itemPrepTimes) : 0
        const thresholdSetting = await (Settings as any).findOne({ key: "PREPARATION_TIME_THRESHOLD" })
        const globalFallback = thresholdSetting ? parseInt(thresholdSetting.value) : 20
        dynamicThreshold = maxPrepTime > 0 ? maxPrepTime : globalFallback
        orderToUpdate.thresholdMinutes = dynamicThreshold
      }

      const excessDelay = Math.max(0, totalMinutes - dynamicThreshold)
      orderToUpdate.delayMinutes = excessDelay
    }

    await orderToUpdate.save()

    const orderNumber = orderToUpdate.orderNumber
      ; (async () => {
        try {
          const statusMessages: Record<string, string> = {
            preparing: `Order #${orderNumber} is now being prepared`,
            ready: `Order #${orderNumber} is ready for pickup!`,
            completed: `Order #${orderNumber} has been completed`,
            cancelled: `Order #${orderNumber} has been cancelled by the kitchen`
          }
          if (statusMessages[status]) {
            if (status === "ready" || status === "cancelled") {
              addNotification(status === "ready" ? "success" : "warning", statusMessages[status], "cashier")
            }
            addNotification(status === "cancelled" ? "warning" : "info", statusMessages[status], "admin")
          }
        } catch { /* silent */ }
      })()

    return NextResponse.json({ ok: true, status: orderToUpdate.status })
  } catch (error: any) {
    console.error("Update order status error:", error)
    return NextResponse.json({ message: "Failed to update order status" }, { status: 500 })
  }
}