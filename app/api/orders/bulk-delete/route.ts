import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db"
import Order from "@/lib/models/order"
import { addNotification } from "@/lib/notifications"
import { validateSession } from "@/lib/auth"
import { calculateStockConsumption, applyStockAdjustment } from "@/lib/stock-logic"

export async function DELETE(request: Request) {
  try {
    console.log("🗑️ Bulk deleting all orders...")

    const decoded = await validateSession(request)

    // Only admins can bulk delete orders
    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const isPermanent = searchParams.get('permanent') === 'true'

    await connectDB()

    if (isPermanent) {
      // PERMANENT DELETE (Emptying Trash)
      const deletedOrders = await (Order as any).find({ isDeleted: true }).lean()
      
      if (deletedOrders.length === 0) {
        return NextResponse.json({ message: "No deleted orders to permanently remove" }, { status: 400 })
      }

      const result = await (Order as any).deleteMany({ isDeleted: true })

      try {
        addNotification(
          "warning",
          `💥 Admin permanently deleted all records in the Trash (${result.deletedCount} orders).`,
          "admin"
        )
      } catch (e) {}

      return NextResponse.json({
        message: `Successfully permanently deleted ${result.deletedCount} orders`,
        deletedCount: result.deletedCount
      })
    }

    // SOFT DELETE (Moving to History)
    // 🔗 BUSINESS LOGIC: To restore stock correctly, we find all orders that are NOT already cancelled
    // and NOT already deleted
    const activeOrders = await (Order as any).find({ 
      status: { $ne: "cancelled" },
      isDeleted: { $ne: true }
    }).lean()

    const orderCount = await (Order as any).countDocuments({ isDeleted: { $ne: true } })

    if (orderCount === 0 && activeOrders.length === 0) {
      return NextResponse.json({ message: "No active orders to delete" }, { status: 400 })
    }

    // 📡 Restore stock for all active orders before deleting
    if (activeOrders.length > 0) {
      console.log(`📡 Restoring stock for ${activeOrders.length} active orders before bulk deletion...`)
      
      // We process items from all orders together
      const allItems = activeOrders.flatMap(order => order.items || [])
      
      if (allItems.length > 0) {
        const stockConsumptionMap = await calculateStockConsumption(allItems)
        await applyStockAdjustment(stockConsumptionMap, 1) // 1 = Restore
        console.log("✅ Stock restoration completed for bulk deletion")
      }
    }

    // Soft delete all orders
    const result = await (Order as any).updateMany({ isDeleted: { $ne: true } }, { isDeleted: true, status: "cancelled" })

    // Send notification about bulk deletion
    try {
      addNotification(
        "warning",
        `🗑️ All active orders (${result.modifiedCount} moved) have been moved to deleted history by admin. Stock has been restored.`,
        "admin"
      )
      console.log(`Bulk deletion notification sent: ${result.modifiedCount} orders deleted`)
    } catch (error) {
      console.error("Failed to send bulk deletion notification:", error)
    }

    console.log(`✅ Bulk deletion completed: ${result.modifiedCount} orders moved to history`)
    return NextResponse.json({
      message: `Successfully moved ${result.modifiedCount} orders to history and restored stock`,
      deletedCount: result.modifiedCount
    })
  } catch (error: any) {
    console.error("Bulk delete orders error:", error)
    return NextResponse.json({ message: "Failed to delete orders" }, { status: 500 })
  }
}