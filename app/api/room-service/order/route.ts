import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import MenuItem from "@/lib/models/menu-item"
import Stock from "@/lib/models/stock"
import Room from "@/lib/models/room"
import { addNotification } from "@/lib/notifications"
import { calculateStockConsumption, applyStockAdjustment } from "@/lib/stock-logic"
import { getSyncedTime } from "@/lib/time-sync"

export async function POST(request: Request) {
  try {
    await connectDB()

    const body = await request.json()
    const { items, totalAmount, paymentMethod, customerName, tableNumber, notes } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ message: "Items are required" }, { status: 400 })
    }

    if (!tableNumber) {
      return NextResponse.json({ message: "Room Number is required" }, { status: 400 })
    }

    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json({ message: "Valid total amount is required" }, { status: 400 })
    }

    const menuItemIds = items.map((i: any) => i.menuItemId)
    const stockConsumptionMap = await calculateStockConsumption(items)
    const stockIds = Array.from(stockConsumptionMap.keys())

    const [standardMenuItems, stockItems, recentOrders, roomData] = await Promise.all([
      (MenuItem as any).find({ _id: { $in: menuItemIds } }).lean(),
      (Stock as any).find({ _id: { $in: stockIds } }),
      (Order as any).find({ orderNumber: /^\d+$/ }, { orderNumber: 1 }).sort({ createdAt: -1 }).limit(50).lean(),
      (Room as any).findOne({ roomNumber: tableNumber }).populate('floorId').lean()
    ])

    for (const [stockId, requiredAmount] of stockConsumptionMap) {
      const stockItem = stockItems.find(s => s._id.toString() === stockId)
      if (stockItem && stockItem.trackQuantity) {
        const availableStock = stockItem.quantity || 0
        if (availableStock <= 0 || availableStock < requiredAmount) {
          return NextResponse.json({
            message: `Insufficient stock: ${stockItem.name}. Required: ${requiredAmount}, Available: ${availableStock}`,
            insufficientStock: stockItem.name
          }, { status: 400 })
        }
      }
    }

    const numericOrders = (recentOrders as any[]).map(o => parseInt(o.orderNumber, 10)).filter(n => !isNaN(n))
    const maxOrderNumber = numericOrders.length > 0 ? Math.max(...numericOrders) : 0
    let nextOrderNumber = maxOrderNumber + 1

    const orderData = {
      items: items.map((item: any) => {
        const menu = (standardMenuItems as any[]).find(m => m._id.toString() === item.menuItemId)
        const isDrink = menu?.mainCategory?.toLowerCase() === "drinks"
        return {
          ...item,
          menuId: menu?.menuId,
          category: menu?.category,
          mainCategory: menu?.mainCategory,
          menuTier: 'standard',
          preparationTime: isDrink ? 0 : (menu?.preparationTime || 0),
          status: "unconfirmed",
          modifiers: item.modifiers || [],
          notes: item.notes || ""
        }
      }),
      totalAmount,
      subtotal: totalAmount,
      tax: 0,
      status: "unconfirmed",
      paymentMethod: paymentMethod || "room_bill",
      customerName: customerName || `${tableNumber}`,
      tableNumber,
      floorId: (roomData as any)?.floorId?._id || (roomData as any)?.floorId,
      createdBy: (roomData as any)?.floorId?.roomServiceCashierId,
      notes: notes || "Room Service App Order",
      thresholdMinutes: (() => {
        const foodItems = (standardMenuItems as any[]).filter(m => m.mainCategory?.toLowerCase() !== "drinks")
        if (foodItems.length === 0) return 0
        return Math.max(...foodItems.map(m => m.preparationTime || 10))
      })() || 10,
      createdAt: getSyncedTime()
    }

    let order: any
    let retryCount = 0
    const maxRetries = 3

    while (retryCount <= maxRetries) {
      try {
        const orderNumberStr = String(nextOrderNumber).padStart(3, "0")
        const finalOrderData = { ...orderData, orderNumber: orderNumberStr }
        order = await (Order as any).create(finalOrderData)
        break
      } catch (err: any) {
        if (err.code === 11000 && err.message.includes('orderNumber')) {
          nextOrderNumber++
          retryCount++
          if (retryCount > maxRetries) throw new Error("Failed to generate unique order number")
        } else {
          throw err
        }
      }
    }

    try {
      (async () => {
        try {
          const message = `🔔 Room Service: New Order Request #${order.orderNumber} from Room ${tableNumber} awaits confirmation!`
          const cashierId = (roomData as any)?.floorId?.roomServiceCashierId
          
          if (cashierId) {
            addNotification("info", message, undefined, cashierId.toString())
          } else {
            addNotification("info", message, "cashier")
          }
        } catch (err) {}
      })()
    } catch (error) {}

    return NextResponse.json({ ...order.toObject(), _id: order._id.toString() }, { status: 201 })
  } catch (error: any) {
    console.error("Room Service Create order error:", error)
    return NextResponse.json({ message: "Failed to create order", error: error.message }, { status: 500 })
  }
}
