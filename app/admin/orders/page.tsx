"use client"

import { useState, useEffect, useRef } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { Clock, Trash2, Calendar as CalendarIcon, CheckCheck, Users, User, ChevronRight, TrendingUp } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"

interface Order {
  _id: string
  orderNumber: string
  items: Array<{ name: string; quantity: number; price: number; menuId?: string; preparationTime?: number; menuTier?: 'standard' | 'vip1' | 'vip2' }>
  totalAmount: number
  status: "pending" | "preparing" | "ready" | "served" | "completed" | "cancelled"
  createdAt: string
  customerName?: string
  tableNumber: string
  batchNumber?: string
  floorNumber?: string
  delayMinutes?: number
  thresholdMinutes?: number
  totalPreparationTime?: number
  isDeleted?: boolean
  servedAt?: string
  readyAt?: string
  updatedAt?: string
  kitchenAcceptedAt?: string
  createdBy?: { name: string }
  distributions?: string[]
}

export default function AdminOrdersPage() {
  const { token } = useAuth()
  const { t } = useLanguage()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [timeRange, setTimeRange] = useState<string>("week")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [categoryFilter, setCategoryFilter] = useState<"all" | "Food" | "Drinks">("all")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkServing, setBulkServing] = useState(false)
  const [activeCashierIdx, setActiveCashierIdx] = useState(0)
  const notifiedOrderIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 30000) // Increase interval for management view
    return () => clearInterval(interval)
  }, [token, timeRange, selectedDate])

  // Auto-notification for DELAYS
  useEffect(() => {
    if (orders.length === 0) return

    orders.forEach(order => {
      // We only notify for active orders (preparing/ready) that just became delayed
      if (order.isDeleted || order.status === 'cancelled' || order.status === 'served' || order.status === 'completed') return

      const metrics = getOrderMetrics(order)
      if (metrics.delay > 0 && !notifiedOrderIds.current.has(order._id)) {
        // Trigger notification
        notify({
          title: "Preparation Delay!",
          message: `Order #${order.orderNumber} (Table ${order.tableNumber}) has exceeded its target time by ${metrics.delay}m.`,
          type: "error"
        })
        // Mark as notified
        notifiedOrderIds.current.add(order._id)
      }
    })
  }, [orders])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchOrders()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  const getOrdersUrl = (range: string) => {
    let url = "/api/orders"
    const now = new Date()
    let startDate: Date | null = null

    if (range === 'custom' && selectedDate) {
      startDate = selectedDate
    } else if (range === 'week') {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 7)
      startDate.setHours(0, 0, 0, 0)
    } else if (range === 'month') {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 30)
      startDate.setHours(0, 0, 0, 0)
    } else if (range === 'year') {
      startDate = new Date(now)
      startDate.setDate(now.getDate() - 365)
      startDate.setHours(0, 0, 0, 0)
    }

    if (range === 'today') {
      url += `?period=today`
    } else if (startDate) {
      const ISO_START = new Date(startDate)
      ISO_START.setHours(0, 0, 0, 0)
      url += `?startDate=${ISO_START.toISOString()}`

      if (range === 'custom') {
        const ISO_END = new Date(startDate)
        ISO_END.setHours(23, 59, 59, 999)
        url += `&endDate=${ISO_END.toISOString()}`
      }
    }

    // Add includeDeleted for admin view; do not hard-cap results so cashier totals stay accurate
    url += (url.includes('?') ? '&' : '?') + "includeDeleted=true"

    return url
  }

  const fetchOrders = async () => {
    try {
      const url = getOrdersUrl(timeRange)
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setOrders(data)
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error)
    }
  }

  // handleDeleteOrder now performs soft delete
  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    const confirmed = await confirm({
      title: "Delete Order",
      message: `Are you sure you want to move Order #${orderNumber} to deleted history?\n\nStock will be restored for active orders.`,
      type: "danger",
      confirmText: "Move to History",
      cancelText: "Cancel"
    })

    if (!confirmed) return

    setDeleting(orderId)
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        // Update local state to show order as deleted
        setOrders(prevOrders => prevOrders.map(order =>
          order._id === orderId ? { ...order, isDeleted: true, status: "cancelled" } : order
        ))
        notify({
          title: "Moved to History",
          message: `Order #${orderNumber} has been moved to deleted history.`,
          type: "success"
        })
      } else {
        const error = await response.json()
        notify({
          title: "Failed",
          message: error.message || "Failed to delete order",
          type: "error"
        })
      }
    } catch (error) {
      console.error("Failed to delete order:", error)
      notify({
        title: "Error",
        message: "Failed to delete order. Please try again.",
        type: "error"
      })
    } finally {
      setDeleting(null)
    }
  }

  const handleBulkDeleteOrders = async () => {
    const confirmed = await confirm({
      title: "Delete All Orders",
      message: `Are you sure you want to delete ALL ${orders.length} orders?\n\nThis action cannot be undone and will clear your entire order history.`,
      type: "danger",
      confirmText: "Delete All Orders",
      cancelText: "Cancel"
    })

    if (!confirmed) return

    const finalConfirmed = await confirm({
      title: "Final Warning",
      message: "This is your final warning!\n\nAll order data will be permanently lost.\nAre you absolutely sure?",
      type: "danger",
      confirmText: "Yes, Delete Everything",
      cancelText: "Cancel"
    })

    if (!finalConfirmed) return

    setBulkDeleting(true)
    try {
      const response = await fetch("/api/orders/bulk-delete", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        setOrders([])
        notify({
          title: "All Orders Deleted",
          message: `Successfully deleted ${result.deletedCount} orders.`,
          type: "success"
        })
      } else {
        const error = await response.json()
        notify({
          title: "Bulk Delete Failed",
          message: error.message || "Failed to delete orders",
          type: "error"
        })
      }
    } catch (error) {
      console.error("Failed to bulk delete orders:", error)
      notify({
        title: "Error",
        message: "Failed to delete orders. Please try again.",
        type: "error"
      })
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleBulkDeletePermanently = async () => {
    const deletedCount = orders.filter(o => o.isDeleted || o.status === 'cancelled').length
    if (deletedCount === 0) {
      notify({ title: "Empty Trash", message: "There are no deleted orders to clear.", type: "info" })
      return
    }

    const confirmed = await confirm({
      title: "Empty Trash Permanently",
      message: `Are you sure you want to permanently delete ALL ${deletedCount} deleted orders?\n\nThis action CANNOT be undone. Data will be completely erased from the database.`,
      type: "danger",
      confirmText: "Yes, Empty Trash",
      cancelText: "Cancel"
    })

    if (!confirmed) return

    setBulkDeleting(true)
    try {
      const response = await fetch("/api/orders/bulk-delete?permanent=true", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const result = await response.json()
        setOrders(prevOrders => prevOrders.filter(o => !o.isDeleted && o.status !== 'cancelled'))
        notify({ title: "Trash Emptied", message: `Successfully permanently deleted ${result.deletedCount} orders.`, type: "success" })
      } else {
        const error = await response.json()
        notify({ title: "Delete Failed", message: error.message || "Failed to permanently delete orders", type: "error" })
      }
    } catch (error) {
      console.error("Failed to permanently bulk delete orders:", error)
      notify({ title: "Error", message: "Failed to permanently delete orders. Please try again.", type: "error" })
    } finally {
      setBulkDeleting(false)
    }
  }

  const handleBulkServeOrders = async () => {
    const activeCount = orders.filter(o => !o.isDeleted && o.status !== 'cancelled' && o.status !== 'served' && o.status !== 'completed').length
    if (activeCount === 0) {
      notify({ title: "No Active Orders", message: "There are no active orders to mark as served.", type: "error" })
      return
    }

    const confirmed = await confirm({
      title: "Mark All Orders as Served",
      message: `Are you sure you want to mark all ${activeCount} active order${activeCount !== 1 ? 's' : ''} as served?\n\nThis will update all pending, preparing, and ready orders.`,
      type: "warning",
      confirmText: "Mark All as Served",
      cancelText: "Cancel"
    })

    if (!confirmed) return

    setBulkServing(true)
    try {
      const response = await fetch("/api/orders/bulk-serve", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const result = await response.json()
        setOrders(prevOrders => prevOrders.map(o =>
          (!o.isDeleted && o.status !== 'cancelled' && o.status !== 'served' && o.status !== 'completed')
            ? { ...o, status: 'served' }
            : o
        ))
        notify({ title: "All Orders Served", message: result.message, type: "success" })
      } else {
        const error = await response.json()
        notify({ title: "Failed", message: error.message || "Failed to mark orders as served", type: "error" })
      }
    } catch (error) {
      console.error("Failed to bulk serve orders:", error)
      notify({ title: "Error", message: "Failed to mark orders as served. Please try again.", type: "error" })
    } finally {
      setBulkServing(false)
    }
  }

  const filteredOrders = orders.filter((order) => {
    const isActuallyDeleted = !!order.isDeleted || order.status === "cancelled"
    const matchesFilter = filter === "all" ? !isActuallyDeleted :
      filter === "deleted" ? isActuallyDeleted :
        filter === "served" ? (!isActuallyDeleted && (order.status === "served" || order.status === "completed")) :
          filter === "cashier" ? !isActuallyDeleted : // Special case for cashier sliding view
            (!isActuallyDeleted && order.status === filter)
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.tableNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === "all" || order.items.some(item => (item as any).mainCategory === categoryFilter)

    return matchesFilter && matchesSearch && matchesCategory
  })

  // Dynamic Cashier List from Orders
  const cashierList = Array.from(new Set(orders.map(o => {
    return o.createdBy?.name || "Unknown";
  }))).sort();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "preparing":
      case "pending": // legacy DB records
        return { color: "bg-[#1a1c1b] text-[#f3cf7a] border border-[#d4af37]/30", label: t("adminOrders.cooking"), icon: "🍳" }
      case "ready":
        return { color: "bg-[#1a2e20] text-[#4ade80] border border-[#4ade80]/30", label: t("adminOrders.ready"), icon: "✅" }
      case "served":
        return { color: "bg-[#2a1b3d] text-[#c084fc] border border-[#c084fc]/30", label: "Served", icon: "🍽️" }
      case "completed":
        return { color: "bg-white/5 text-gray-400 border border-white/10", label: t("adminOrders.served"), icon: "💰" }
      case "cancelled":
        return { color: "bg-[#2a0f0f] text-red-500 border border-red-500/30", label: t("adminOrders.cancelled"), icon: "✕" }
      default:
        return { color: "bg-white/5 text-gray-400 border border-white/10", label: status, icon: "•" }
    }
  }

  // Unified Performance Metric Helper
  const getOrderMetrics = (o: Order) => {
    const isCompleted = o.status === 'served' || o.status === 'completed' || o.status === 'cancelled' || !!o.isDeleted
    const isReady = o.status === 'ready'
    const threshold = o.thresholdMinutes || 20
    const start = new Date(o.createdAt).getTime()

    // For completed orders, prioritize stored snapshots to "stop the count" accurately
    if (isCompleted) {
      if (o.totalPreparationTime !== undefined) {
        const totalTaken = o.totalPreparationTime
        const delay = Math.max(0, totalTaken - threshold)
        return { totalTaken, delay, threshold, isCompleted, isReady }
      }
      if (o.delayMinutes !== undefined) {
        const delay = o.delayMinutes
        const totalTaken = threshold + delay
        return { totalTaken, delay, threshold, isCompleted, isReady }
      }
    }

    // Determine end time for calculation
    const end = isCompleted
      ? new Date(o.servedAt || o.readyAt || o.updatedAt || o.createdAt).getTime()
      : isReady
        ? new Date(o.readyAt || o.updatedAt || o.createdAt).getTime()
        : Date.now()

    const totalTaken = Math.floor((end - start) / 60000)
    const delay = Math.max(0, totalTaken - threshold)
    return { totalTaken, delay, threshold, isCompleted, isReady }
  }

  const preparingOrders = orders.filter(o => !o.isDeleted && o.status !== 'cancelled' && ((o.status as string) === 'preparing' || (o.status as string) === 'pending'))
  const readyOrders = orders.filter(o => !o.isDeleted && o.status !== 'cancelled' && o.status === 'ready')
  const servedOrders = orders.filter(o => !o.isDeleted && o.status !== 'cancelled' && (o.status === 'served' || o.status === 'completed'))
  const deletedHistory = orders.filter(o => !!o.isDeleted || o.status === 'cancelled')
  const getCashierRevenueOrders = (cashierName: string) =>
    orders.filter(o => o.status !== "cancelled" && (o.createdBy?.name || "Unknown") === cashierName)

  const stats = {
    all: {
      count: orders.length,
      time: orders.length > 0 ? Math.floor(orders.reduce((acc, o) => acc + getOrderMetrics(o).totalTaken, 0) / orders.length) : 0,
      delay: orders.length > 0 ? Math.floor(orders.reduce((acc, o) => acc + getOrderMetrics(o).delay, 0) / orders.length) : 0,
      foodRevenue: orders.filter(o => !o.isDeleted && o.status !== 'cancelled').reduce((sum, o) => sum + o.items.filter(i => (i as any).mainCategory === 'Food').reduce((s, it) => s + (it.price * it.quantity), 0), 0),
      drinkRevenue: orders.filter(o => !o.isDeleted && o.status !== 'cancelled').reduce((sum, o) => sum + o.items.filter(i => (i as any).mainCategory === 'Drinks').reduce((s, it) => s + (it.price * it.quantity), 0), 0)
    },
    preparing: {
      count: preparingOrders.length,
      time: preparingOrders.length > 0
        ? Math.floor(preparingOrders.reduce((acc, o) => acc + getOrderMetrics(o).totalTaken, 0) / preparingOrders.length)
        : 0,
      delay: preparingOrders.length > 0
        ? Math.floor(preparingOrders.reduce((acc, o) => acc + getOrderMetrics(o).delay, 0) / preparingOrders.length)
        : 0,
      foodRevenue: preparingOrders.reduce((sum, o) => sum + o.items.filter(i => (i as any).mainCategory === 'Food').reduce((s, it) => s + (it.price * it.quantity), 0), 0),
      drinkRevenue: preparingOrders.reduce((sum, o) => sum + o.items.filter(i => (i as any).mainCategory === 'Drinks').reduce((s, it) => s + (it.price * it.quantity), 0), 0)
    },
    ready: {
      count: readyOrders.length,
      time: readyOrders.length > 0
        ? Math.floor(readyOrders.reduce((acc, o) => acc + getOrderMetrics(o).totalTaken, 0) / readyOrders.length)
        : 0,
      delay: readyOrders.length > 0
        ? Math.floor(readyOrders.reduce((acc, o) => acc + getOrderMetrics(o).delay, 0) / readyOrders.length)
        : 0,
      foodRevenue: readyOrders.reduce((sum, o) => sum + o.items.filter(i => (i as any).mainCategory === 'Food').reduce((s, it) => s + (it.price * it.quantity), 0), 0),
      drinkRevenue: readyOrders.reduce((sum, o) => sum + o.items.filter(i => (i as any).mainCategory === 'Drinks').reduce((s, it) => s + (it.price * it.quantity), 0), 0)
    },
    served: {
      count: servedOrders.length,
      time: servedOrders.length > 0
        ? Math.floor(servedOrders.reduce((acc, o) => acc + getOrderMetrics(o).totalTaken, 0) / servedOrders.length)
        : 0,
      delay: servedOrders.length > 0
        ? Math.floor(servedOrders.reduce((acc, o) => acc + getOrderMetrics(o).delay, 0) / servedOrders.length)
        : 0,
      foodRevenue: servedOrders.reduce((sum, o) => sum + o.items.filter(i => (i as any).mainCategory === 'Food').reduce((s, it) => s + (it.price * it.quantity), 0), 0),
      drinkRevenue: servedOrders.reduce((sum, o) => sum + o.items.filter(i => (i as any).mainCategory === 'Drinks').reduce((s, it) => s + (it.price * it.quantity), 0), 0)
    },
    deleted: {
      count: deletedHistory.length,
      time: deletedHistory.length > 0
        ? Math.floor(deletedHistory.reduce((acc, o) => acc + getOrderMetrics(o).totalTaken, 0) / deletedHistory.length)
        : 0,
      delay: deletedHistory.length > 0
        ? Math.floor(deletedHistory.reduce((acc, o) => acc + getOrderMetrics(o).delay, 0) / deletedHistory.length)
        : 0
    }
  }

  return (
    <ProtectedRoute requiredRoles={["admin"]} requiredPermissions={["overview:view", "orders:view", "cashier:access"]}>
      <div className="min-h-screen bg-[#0f1110] p-6 text-white selection:bg-[#c5a059] selection:text-[#0f1110]">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Active Delay Alerts */}
          {orders.filter(o => {
            if (o.isDeleted || o.status === 'cancelled' || o.status === 'served' || o.status === 'completed') return false
            return getOrderMetrics(o).delay > 0
          }).length > 0 && (
              <div className="bg-[#1a0f0f] border border-red-900/50 rounded-[30px] p-6 shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-4 mb-4 relative z-10">
                  <div className="bg-red-950 border border-red-900 text-red-400 p-3 rounded-2xl shadow-md">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-playfair italic text-red-500 tracking-wide">🚨 Action Required: Preparation Delays</h3>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-red-400/80 mt-1">The following orders have exceeded their preparation threshold!</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 relative z-10">
                  {orders.filter(o => {
                    if (o.isDeleted || o.status === 'cancelled' || o.status === 'served' || o.status === 'completed') return false
                    return getOrderMetrics(o).delay > 0
                  }).map(o => {
                    const { delay, threshold, isCompleted } = getOrderMetrics(o)

                    return (
                      <div key={o._id} className="bg-[#0f1110] border border-red-900/30 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-sm relative overflow-hidden group">
                        {isCompleted && <div className="absolute top-0 right-0 bg-green-950 text-green-400 border-b border-l border-green-900/50 text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-widest">Served</div>}
                        <span className="font-playfair italic text-[#f3cf7a] text-lg">#{o.orderNumber}</span>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black bg-red-950/50 text-red-400 px-2.5 py-1 rounded-full border border-red-900/50 uppercase tracking-widest">
                            ⏱️ {delay}m delay
                          </span>
                          <span className="text-[8px] font-bold text-gray-500 mt-1 ml-1 uppercase tracking-widest">{isCompleted ? `finished in ${threshold + delay}m` : `exceeded ${threshold}m target`}</span>
                        </div>
                        <div className="flex flex-col gap-1 items-start border-l border-white/10 pl-3 ml-1">
                          <span className="text-[10px] font-bold text-[#d4af37] tracking-widest">
                            {o.floorNumber ? `${o.floorNumber} - ` : ''}{o.tableNumber}
                          </span>
                          {(o.distributions || []).length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {o.distributions!.map((dist, idx) => (
                                <span key={idx} className="bg-orange-950/40 text-orange-400 border border-orange-500/30 px-1.5 py-0.5 rounded text-[7px] font-black tracking-widest uppercase italic">
                                  🚚 {dist}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Sidebar - Filters & Stats */}
            <div className="lg:col-span-3 flex flex-col gap-4 lg:sticky lg:top-4">
              <div className="bg-[#151716] rounded-xl p-4 md:p-6 shadow-2xl border border-white/10 overflow-hidden">
                <h2 className="text-lg md:text-2xl font-playfair italic text-[#f3cf7a] mb-5">{t("adminOrders.title")}</h2>
                <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0 gap-3 scrollbar-hide">
                  {[
                    { id: "all", label: t("adminOrders.allOrders"), count: stats.all.count - stats.deleted.count, time: stats.all.time, delay: stats.all.delay, foodRevenue: stats.all.foodRevenue, drinkRevenue: stats.all.drinkRevenue, emoji: "📋" },
                    { id: "preparing", label: t("adminOrders.preparing"), count: stats.preparing.count, time: stats.preparing.time, delay: stats.preparing.delay, foodRevenue: stats.preparing.foodRevenue, drinkRevenue: stats.preparing.drinkRevenue, emoji: "🔥" },
                    { id: "ready", label: t("adminOrders.ready"), count: stats.ready.count, time: stats.ready.time, delay: stats.ready.delay, foodRevenue: stats.ready.foodRevenue, drinkRevenue: stats.ready.drinkRevenue, emoji: "✅" },
                    { id: "served", label: "Served", count: stats.served.count, time: stats.served.time, delay: stats.served.delay, foodRevenue: stats.served.foodRevenue, drinkRevenue: stats.served.drinkRevenue, emoji: "🍽️" },
                    { id: "cashier", label: "By Cashier", count: cashierList.length, emoji: "👤" },
                    { id: "deleted", label: "Deleted History", count: stats.deleted.count, time: stats.deleted.time, delay: stats.deleted.delay, emoji: "🗑️" }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setFilter(item.id)
                        if (item.id === 'cashier') setActiveCashierIdx(0)
                      }}
                      className={`flex-shrink-0 lg:w-full flex items-center justify-between p-3 rounded-lg font-medium transition-all ${filter === item.id
                        ? "bg-[#1a1c1b] text-white border border-[#d4af37]/30 shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                        : "bg-[#0f1110] text-gray-400 hover:bg-[#1a1c1b] border border-white/5"
                        }`}
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span className="flex items-center gap-2 md:gap-3">
                          <span className="text-lg md:text-xl">{item.emoji}</span>
                          <span className="whitespace-nowrap font-light tracking-wide uppercase text-[10px]">{item.label}</span>
                        </span>
                        <div className="flex items-center gap-2 md:pl-10">
                          {item.time !== undefined && item.time !== null && (
                            <span className={`text-[8px] font-bold uppercase tracking-widest ${filter === item.id ? 'text-[#f3cf7a]' : 'text-gray-500'}`}>
                              {item.time}m avg
                            </span>
                          )}
                          {item.delay !== undefined && item.delay !== null && item.delay > 0 && (
                            <span className={`text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${filter === item.id ? 'bg-[#151716] text-[#dfb54f] border-[#dfb54f]/30' : 'bg-red-950/50 text-red-500 border-red-900/50'}`}>
                              +{item.delay}m
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 md:pl-10 mt-1">
                          {(item as any).foodRevenue !== undefined && (item as any).foodRevenue > 0 && (
                            <span className={`text-[8px] font-bold uppercase tracking-widest ${filter === item.id ? 'text-[#d4af37]' : 'text-orange-900/80'}`}>
                              🍳 {(item as any).foodRevenue.toLocaleString()} Br
                            </span>
                          )}
                          {(item as any).drinkRevenue !== undefined && (item as any).drinkRevenue > 0 && (
                            <span className={`text-[8px] font-bold uppercase tracking-widest ${filter === item.id ? 'text-[#d4af37]' : 'text-teal-900/80'}`}>
                              🍹 {(item as any).drinkRevenue.toLocaleString()} Br
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`ml-3 px-2 py-0.5 rounded-full text-[10px] font-black tracking-widest ${filter === item.id ? "bg-[#d4af37]/20 text-[#f3cf7a]" : "bg-white/5 text-gray-500"}`}>
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="hidden lg:block bg-[#1a1c1b] rounded-xl p-6 shadow-xl border border-white/10 overflow-hidden relative group">
                <div className="relative z-10">
                  <h3 className="text-xl font-playfair italic text-[#f3cf7a] mb-2">{t("adminOrders.needInsights")}</h3>
                  <p className="text-[10px] tracking-[0.2em] font-light text-gray-400 uppercase">{t("adminOrders.checkDailyReports")}</p>
                </div>
                <div className="absolute -bottom-6 -right-6 text-8xl opacity-5 transform group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500">📊</div>
              </div>
            </div>

            {/* Main Content - Order List */}
            <div className="lg:col-span-9">
              <div className="bg-[#151716] rounded-xl p-6 shadow-2xl border border-white/10 min-h-[600px] flex flex-col">
                {/* Combined Header: Title, Filters, Search & Delete */}
                <div className="flex flex-col gap-8 mb-8 shrink-0">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div className="flex items-center gap-4">
                      {filter === 'cashier' && (
                        <div className="h-10 w-10 bg-[#0f1110] border border-[#d4af37]/30 rounded-full flex items-center justify-center text-[#f3cf7a]">
                          <Users size={20} />
                        </div>
                      )}
                      <div>
                        <h2 className="text-2xl font-playfair italic text-[#f3cf7a]">
                          {filter === 'cashier' ? "Cashier Orders" : t("adminOrders.orderManagement")}
                        </h2>
                        <p className="text-gray-400 text-[10px] uppercase font-light tracking-widest mt-1">
                          {filter === 'cashier' ? `${cashierList.length} Cashiers Active` : `${filteredOrders.length} ${filter !== 'all' ? t(`adminOrders.${filter}`) : ''} ${t("adminOrders.ordersCount")}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="flex bg-[#0f1110] border border-white/10 p-1 rounded-xl overflow-x-auto scrollbar-hide flex-1 sm:flex-none">
                        {["today", "week", "month", "year"].map((r) => (
                          <button
                            key={r}
                            onClick={() => setTimeRange(r)}
                            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap ${timeRange === r ? "bg-[#8B4513] text-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                          >{r}</button>
                        ))}

                        <div className="w-px h-4 bg-gray-300 mx-2 self-center" />

                        {["all", "Food", "Drinks"].map((c) => (
                          <button
                            key={c}
                            onClick={() => setCategoryFilter(c as any)}
                            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all whitespace-nowrap ${categoryFilter === c ? "bg-[#2d5a41] text-white shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                          >
                            {c}
                          </button>
                        ))}

                        <div className="w-px h-4 bg-gray-300 mx-2 self-center" />

                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all whitespace-nowrap flex items-center gap-2 ${timeRange === 'custom' ? "bg-[#151716] text-[#f3cf7a] shadow-md border border-[#d4af37]/20" : "text-gray-500 hover:text-white"}`}
                            >
                              <CalendarIcon size={12} />
                              {timeRange === 'custom' && selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Specific Date"}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 bg-[#0f1110] border-2 border-white/10 shadow-2xl rounded-2xl z-50 text-white" align="end">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                setSelectedDate(date)
                                setTimeRange('custom')
                              }}
                              initialFocus
                              captionLayout="dropdown"
                              fromYear={2020}
                              toYear={new Date().getFullYear() + 2}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 w-full justify-between items-center bg-[#0f1110] p-4 rounded-2xl border border-white/10 shadow-inner">
                    <div className="relative w-full sm:w-80">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                      <input
                        type="text"
                        placeholder="Search floor, table, order..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-[#151716] border border-white/10 rounded-2xl text-[10px] font-light uppercase tracking-widest text-white focus:border-[#d4af37]/50 focus:ring-0 transition-all outline-none shadow-sm placeholder-gray-600"
                      />
                    </div>
                    {filter === 'cashier' && cashierList.length > 0 && (
                      <div className="flex bg-[#151716] border border-white/5 p-1 rounded-xl">
                        <button 
                          onClick={() => setActiveCashierIdx(prev => Math.max(0, prev - 1))}
                          disabled={activeCashierIdx === 0}
                          className="p-1 px-3 text-gray-400 hover:text-white disabled:opacity-20 transition-all"
                        >
                          <ChevronRight size={20} className="rotate-180" />
                        </button>
                        <div className="px-4 py-1.5 text-xs font-black text-[#f3cf7a] uppercase tracking-widest flex items-center min-w-[60px] justify-center">
                          {activeCashierIdx + 1} / {cashierList.length}
                        </div>
                        <button 
                          onClick={() => setActiveCashierIdx(prev => Math.min(cashierList.length - 1, prev + 1))}
                          disabled={activeCashierIdx === cashierList.length - 1}
                          className="p-1 px-3 text-gray-400 hover:text-white disabled:opacity-20 transition-all"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    )}
                    {filter !== 'cashier' && orders.length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleBulkServeOrders}
                          disabled={bulkServing || bulkDeleting}
                          className="w-full sm:w-auto bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] hover:shadow-[0_4px_15px_rgba(212,175,55,0.4)] disabled:opacity-50 px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                          {bulkServing ? (
                            <>
                              <span className="animate-spin text-xs">⏳</span>
                              <span className="text-[10px] tracking-widest uppercase">Serving...</span>
                            </>
                          ) : (
                            <>
                              <CheckCheck className="h-4 w-4" />
                              <span className="text-[10px] tracking-widest uppercase">Mark All as Served</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={filter === 'deleted' ? handleBulkDeletePermanently : handleBulkDeleteOrders}
                          disabled={bulkDeleting || bulkServing}
                          className={`w-full sm:w-auto ${filter === 'deleted' ? 'bg-[#2a0f0f] border-red-500/50 hover:bg-red-900 shadow-[0_0_15px_rgba(239,68,68,0.2)] text-red-400' : 'bg-[#1a0f0f] border-red-900/50 hover:bg-red-950/80 hover:shadow-red-900/20 text-red-500'} disabled:opacity-50 border px-6 py-3 rounded-xl font-bold transition-all shadow-lg transform hover:scale-105 disabled:transform-none flex items-center justify-center gap-2 whitespace-nowrap`}
                        >
                          {bulkDeleting ? (
                            <>
                              <span className="animate-spin text-xs">⏳</span>
                              <span className="text-[10px] tracking-widest uppercase">{t("adminOrders.deleting")}</span>
                            </>
                          ) : (
                            <>
                              <span>🗑️</span>
                              <span className="text-[10px] tracking-widest uppercase">
                                {filter === 'deleted' ? 'Empty Trash' : t("adminOrders.deleteAllOrders")}
                              </span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {filter === 'cashier' ? (
                  cashierList.length > 0 ? (
                    <div key={activeCashierIdx} className="flex-1 min-h-0 flex flex-col space-y-6 slide-enter-right">
                      <div className="bg-[#0f1110] p-6 rounded-2xl border border-[#d4af37]/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <User size={80} />
                        </div>
                        <p className="text-[#d4af37] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Orders For</p>
                        <h3 className="text-2xl font-playfair italic font-bold text-white mb-4">{cashierList[activeCashierIdx]}</h3>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[8px] font-bold uppercase tracking-widest">Total Revenue</span>
                            <span className="text-lg font-black text-[#4ade80]">
                              {getCashierRevenueOrders(cashierList[activeCashierIdx])
                                .reduce((sum, o) => sum + o.totalAmount, 0)
                                .toLocaleString()} Br
                            </span>
                          </div>
                          <div className="w-px h-8 bg-white/10" />
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[8px] font-bold uppercase tracking-widest">Total Orders</span>
                            <span className="text-lg font-black text-white">
                              {getCashierRevenueOrders(cashierList[activeCashierIdx]).length}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                        {filteredOrders.filter(o => {
                          return (o.createdBy?.name || "Unknown") === cashierList[activeCashierIdx];
                        }).map((order) => {
                          const status = getStatusConfig(order.status)
                          return (
                            <div key={order._id} className="bg-[#0f1110] rounded-2xl p-4 border border-white/5 hover:border-[#d4af37]/20 transition-all flex flex-col md:flex-row items-start md:items-center gap-4">
                              <div className="flex-shrink-0 w-24">
                                <h4 className="text-[#f3cf7a] font-playfair italic font-bold">#{order.orderNumber}</h4>
                                <p className="text-[10px] text-gray-500 font-bold tracking-tighter mt-1">
                                  {order.floorNumber ? `${order.floorNumber} - ` : ''}{order.tableNumber}
                                </p>
                                {order.batchNumber && (
                                  <p className="text-[9px] text-amber-400 font-black tracking-widest uppercase mt-1">
                                    Batch {order.batchNumber}
                                  </p>
                                )}
                              </div>
                                <div className="flex-1 min-w-0 bg-[#151716] p-2 px-4 rounded-xl border border-white/5">
                                  <p className="text-[9px] text-gray-400 line-clamp-1 uppercase tracking-wide">
                                    {order.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                                  </p>
                                  {(order.distributions || []).length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                      {order.distributions!.map((dist, idx) => (
                                        <span key={idx} className="bg-orange-900/30 text-orange-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-orange-500/20 uppercase tracking-widest italic">
                                          🚚 {dist}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              <div className="flex items-center gap-3 ml-auto">
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-[0.1em] ${status.color}`}>
                                  {status.label}
                                </span>
                                <span className="text-sm font-black text-white whitespace-nowrap">{order.totalAmount.toLocaleString()} Br</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-20">
                      <Users size={48} className="mb-4 opacity-20" />
                      <p className="font-bold uppercase tracking-widest text-[10px]">No cashier data available for this range</p>
                    </div>
                  )
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-32">
                    <div className="text-8xl mb-6 opacity-5">🍃</div>
                    <h3 className="text-2xl font-playfair italic text-[#f3cf7a] mb-2">{t("adminOrders.quietForNow")}</h3>
                    <p className="text-gray-500 text-[10px] uppercase tracking-[0.2em]">{t("adminOrders.noOrdersFound")}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1 pr-2">
                    {filteredOrders.map((order) => {
                      const status = getStatusConfig(order.status)
                      return (
                        <div key={order._id} className="bg-[#0f1110] rounded-2xl p-4 md:p-5 border border-white/10 hover:border-[#d4af37]/30 hover:shadow-[0_4px_20px_rgba(212,175,55,0.1)] transition-all flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8 group shrink-0">

                          {/* Left: Order Identifier & Status */}
                          <div className="flex-shrink-0 lg:w-48">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-xl font-playfair italic text-[#f3cf7a]">#{order.orderNumber}</h3>
                              {order.floorNumber && (
                                <span className="bg-[#1a1c1b] text-[#f3cf7a] border border-[#d4af37]/20 px-2 py-0.5 rounded text-[10px] font-black tracking-widest">FLOOR #{order.floorNumber}</span>
                              )}
                              <span className="bg-[#1a1c1b] text-gray-400 border border-white/10 px-2 py-0.5 rounded text-[10px] font-black tracking-widest">{order.tableNumber}</span>
                              {(order.distributions || []).length > 0 && (
                                <div className="flex flex-wrap gap-1 items-center ml-2 border-l border-white/10 pl-2">
                                  {order.distributions!.map((dist, idx) => (
                                    <span key={idx} className="bg-orange-900/30 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase italic shadow-sm">
                                      🚚 {dist}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <p className="text-[10px] font-light text-gray-500 uppercase tracking-widest">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest ${status.color}`}>
                                <span>{status.icon}</span>
                                {status.label}
                              </span>
                            </div>
                          </div>

                          {/* Middle: Items Summary - Compact Flex Wrap */}
                          <div className="flex-1 min-w-0 bg-[#151716] rounded-xl p-3 border border-white/5">
                            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-xs">
                                  <span className="text-[#d4af37] font-black">{item.quantity}×</span>
                                  <span className="text-gray-300 font-light truncate max-w-[140px] text-[10px] uppercase tracking-wide">{item.name}</span>
                                  {item.menuTier && item.menuTier !== 'standard' && (
                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${item.menuTier === 'vip1' ? 'bg-purple-950/40 text-purple-400 border-purple-500/30' : 'bg-amber-950/40 text-amber-400 border-amber-500/30'}`}>
                                      {item.menuTier === 'vip1' ? 'VIP 1' : 'VIP 2'}
                                    </span>
                                  )}
                                  {item.preparationTime && <span className="text-gray-500 text-[9px] italic">({item.preparationTime}m)</span>}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Right: Timing, Pricing & Actions */}
                          <div className="flex flex-col sm:flex-row lg:flex-row items-start sm:items-center gap-4 lg:gap-6 lg:w-fit">

                            {/* Performance & Timing Badge */}
                            <div className="flex items-center gap-2">
                              {(() => {
                                const { totalTaken, delay, threshold, isCompleted, isReady } = getOrderMetrics(order)

                                // Color Scheme Logic
                                let colorClass = "emerald"
                                let icon = "✨"
                                let label = isCompleted ? "On Time" : (isReady ? "READY" : "COOKING")

                                if (delay > 0) {
                                  colorClass = delay <= 10 ? "amber" : "rose"
                                  icon = delay <= 10 ? "⚠️" : "🚨"
                                  label = `${delay}m delay`
                                }

                                const colorStyles = {
                                  emerald: "bg-[#1a2e20] text-[#4ade80] border-[#4ade80]/20",
                                  amber: "bg-[#2a1f10] text-[#fbbf24] border-[#fbbf24]/20",
                                  rose: "bg-[#2a0f0f] text-red-500 border-red-500/20"
                                }

                                return (
                                  <div className={`group flex items-center gap-3 p-1.5 pr-4 rounded-2xl border transition-all duration-300 shadow-sm ${colorStyles[colorClass as keyof typeof colorStyles]}`}>
                                    {/* Status Pill */}
                                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-[9px] uppercase tracking-widest shadow-sm bg-[#0f1110]/50 backdrop-blur-sm border border-white/5`}>
                                      <span className="scale-110">{isCompleted ? icon : <Clock className="h-3 w-3 animate-pulse" />}</span>
                                      <span>{label}</span>
                                    </div>

                                    {/* Metrics */}
                                    <div className="flex flex-col">
                                      <div className="flex items-baseline gap-1">
                                        <span className="text-[10px] font-black tracking-widest uppercase leading-none">
                                          {isCompleted ? `${totalTaken}m` : (totalTaken < threshold ? `${threshold - totalTaken}m left` : `${totalTaken - threshold}m delay`)}
                                        </span>
                                        {!isCompleted && totalTaken >= threshold && <span className="text-[8px] font-bold opacity-60 uppercase">late</span>}
                                      </div>
                                      <span className="text-[8px] font-bold opacity-50 leading-tight mt-0.5 whitespace-nowrap uppercase tracking-widest">
                                        vs {threshold}m tgt
                                      </span>
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>

                            {/* Total Amount & Primary Action */}
                            <div className="flex items-center gap-4 ml-auto">
                              <div className="text-2xl font-playfair italic text-[#f3cf7a] whitespace-nowrap">
                                {order.totalAmount.toFixed(0)} <span className="text-[10px] font-light text-gray-500 uppercase tracking-widest ml-1">{t("common.currencyBr")}</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleDeleteOrder(order._id, order.orderNumber)}
                                  disabled={deleting === order._id || !!order.isDeleted || order.status === 'cancelled'}
                                  className={`p-3 rounded-xl border border-red-900/30 text-red-500/60 hover:text-red-500 hover:bg-red-950/30 transition-all ${deleting === order._id ? "animate-pulse" : ""} ${(order.isDeleted || order.status === 'cancelled') ? 'opacity-0 pointer-events-none' : ''}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Feed Confirmation UI */}
        <ConfirmationCard
          isOpen={confirmationState.isOpen}
          title={confirmationState.options.title}
          message={confirmationState.options.message}
          confirmText={confirmationState.options.confirmText}
          cancelText={confirmationState.options.cancelText}
          type={confirmationState.options.type}
          onConfirm={confirmationState.onConfirm}
          onClose={closeConfirmation}
        />

        <NotificationCard
          isOpen={notificationState.isOpen}
          title={notificationState.options.title}
          message={notificationState.options.message}
          type={notificationState.options.type}
          onClose={closeNotification}
        />
      </div>
    </ProtectedRoute>
  )
}
