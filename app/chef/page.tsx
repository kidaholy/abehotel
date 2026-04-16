"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { RefreshCw, Clock, ChefHat, Maximize2, Minimize2 } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { getSyncedTime } from "@/lib/time-sync"

interface OrderItem {
  menuItemId: string
  menuId?: string
  name: string
  quantity: number
  specialInstructions?: string
  status: "pending" | "preparing" | "ready" | "served" | "completed" | "cancelled"
  category?: string
  menuTier?: 'standard' | 'vip1' | 'vip2'
}

interface Order {
  _id: string
  orderNumber: string
  items: OrderItem[]
  status: "pending" | "preparing" | "ready" | "completed" | "cancelled"
  notes?: string
  floorNumber?: string
  tableNumber?: string
  createdAt: string
  updatedAt: string
  isDeleted?: boolean
  distributions?: string[]
}

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [newOrderAlert, setNewOrderAlert] = useState(false)
  const [previousOrderCount, setPreviousOrderCount] = useState(0)
  const [assignedCategories, setAssignedCategories] = useState<string[]>([])
  const [isKioskMode, setIsKioskMode] = useState(false)
  const { token } = useAuth()
  const { t } = useLanguage()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

  useEffect(() => {
    if (token) {
      fetchOrders()
      fetchChefCategories()
    }
    const interval = setInterval(fetchOrders, 3000)
    return () => clearInterval(interval)
  }, [token])

  const fetchChefCategories = async () => {
    try {
      const response = await fetch("/api/system-check", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setAssignedCategories(data.user?.assignedCategories || [])
      }
    } catch (err) {
      console.error("Failed to fetch chef categories")
    }
  }

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchOrders()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => {
    const handleFocus = () => fetchOrders()
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'orderUpdated' || e.key === 'newOrderCreated') fetchOrders()
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const fetchOrders = async () => {
    try {
      // 🚀 HYDRATION CACHE: Load from localStorage on very first load
      if (loading) {
        const cached = localStorage.getItem("chef_orders_cache")
        if (cached) {
          try {
            const parsed = JSON.parse(cached)
            setOrders(parsed)
            setLoading(false)
          } catch (e) {
            console.error("Failed to parse orders cache")
          }
        }
      }

      const response = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        const activeOrders = data.filter((order: Order) =>
          order.status !== "completed" && order.status !== "cancelled" &&
          !pendingUpdates.current.has(order._id) &&
          order.items.some(item => (item as any).mainCategory === "Food" && 
            item.status !== "completed" && 
            item.status !== "served" && 
            item.status !== "cancelled"
          )
        ).map((order: Order) => ({
          ...order,
          items: order.items.filter(item => (item as any).mainCategory === "Food")
        }))

        // Update Cache
        localStorage.setItem("chef_orders_cache", JSON.stringify(activeOrders))

        if (previousOrderCount > 0 && activeOrders.length > previousOrderCount) {
          setNewOrderAlert(true)
          setTimeout(() => setNewOrderAlert(false), 5000)
        }

        setPreviousOrderCount(activeOrders.length)
        setOrders(activeOrders)
      }
    } catch (err) {
      console.error("Failed to load orders")
    } finally {
      setLoading(false)
    }
  }

  const pendingUpdates = useRef<Set<string>>(new Set())

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const preservedOrders = orders;
    pendingUpdates.current.add(orderId)

    // Remove or update immediately — don't wait for the API
    setOrders(prevOrders => {
      const isComplete = newStatus === 'completed' || newStatus === 'cancelled';
      if (isComplete) return prevOrders.filter(o => o._id !== orderId);
      return prevOrders.map(order =>
        order._id === orderId ? { ...order, status: newStatus as any } : order
      );
    });

    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        localStorage.setItem('orderUpdated', Date.now().toString())
        // Keep in pendingUpdates for 2 extra seconds so the next poll cycle can't bring it back
        setTimeout(() => pendingUpdates.current.delete(orderId), 2000)
      } else {
        pendingUpdates.current.delete(orderId)
        setOrders(preservedOrders);
      }
    } catch (err) {
      pendingUpdates.current.delete(orderId)
      setOrders(preservedOrders);
    }
  }

  const readyOrders = orders.filter((o) => o.status === "pending" || o.status === "preparing" || o.status === "ready")

  // Exit kiosk on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setIsKioskMode(false) }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  // Kiosk / fullscreen mode — only the order grid
  if (isKioskMode) {
    return (
      <ProtectedRoute requiredRoles={["chef"]} requiredPermissions={["chef:access"]}>
        <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
          {/* Minimal top bar */}
          <div className="flex items-center justify-between px-6 py-3 bg-[#0f1110] border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <ChefHat className="h-5 w-5 text-[#d4af37]" />
              <span className="text-sm font-black uppercase tracking-widest text-[#f3cf7a]">Kitchen Queue</span>
              <span className="text-xs font-black text-emerald-400 bg-emerald-900/30 border border-emerald-500/20 px-2 py-0.5 rounded-md">{readyOrders.length} orders</span>
            </div>
            <div className="flex items-center gap-2">
              {newOrderAlert && (
                <span className="text-xs font-black text-orange-400 bg-orange-900/30 border border-orange-500/20 px-3 py-1 rounded-md animate-pulse">🔔 New Order!</span>
              )}
              <button onClick={fetchOrders} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white">
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsKioskMode(false)}
                className="flex items-center gap-2 px-3 py-2 bg-[#1a1c1b] hover:bg-[#222] border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest"
              >
                <Minimize2 className="h-4 w-4" /> Exit
              </button>
            </div>
          </div>

          {/* Full-screen order grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <RefreshCw className="h-12 w-12 animate-spin text-gray-400 mb-4" />
              </div>
            ) : readyOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <ChefHat className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-sm font-black uppercase tracking-widest">No orders in queue</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {readyOrders.map(order => (
                  <OrderCard
                    key={order._id}
                    order={order}
                    onStatusChange={handleStatusChange}
                    color="green"
                    t={t}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={["chef"]} requiredPermissions={["chef:access"]}>
      <div className="min-h-screen bg-black p-6 text-white selection:bg-[#d4af37] selection:text-[#0f1110]">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Clean Header */}
          <div className="bg-[#151716] rounded-xl p-6 shadow-2xl border border-white/5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#1a1c1b] rounded-lg border border-[#d4af37]/20">
                  <ChefHat className="h-8 w-8 text-[#d4af37]" />
                </div>
                <div>
                  <h1 className="text-3xl font-playfair italic font-bold text-[#f3cf7a] tracking-tight">Food Kitchen</h1>
                  {assignedCategories.length > 0 ? (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#d4af37] bg-white/5 px-2 py-0.5 rounded border border-[#d4af37]/20 italic">Chef Kitchen:</span>
                      <div className="flex flex-wrap gap-1">
                        {assignedCategories.map(cat => (
                          <span key={cat} className="bg-[#d4af37] text-[#0f1110] text-[9px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm">
                            🍳 {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                      <span>System Active</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsKioskMode(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-[#1a1c1b] hover:bg-[#222] border border-[#d4af37]/20 hover:border-[#d4af37]/50 rounded-lg text-[#d4af37] transition-all text-xs font-black uppercase tracking-widest"
                  title="Kiosk / Fullscreen mode"
                >
                  <Maximize2 className="h-4 w-4" /> Kiosk
                </button>
                <button
                  onClick={fetchOrders}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="mt-6">
              <div className="text-center p-4 bg-[#1a1c1b] rounded-lg border border-white/5">
                <div className="text-3xl font-black text-emerald-500">{readyOrders.length}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Orders in Queue</div>
              </div>
            </div>
          </div>

          {/* New Order Alert */}
          {newOrderAlert && (
            <div className="p-4 bg-orange-500 text-white rounded-xl shadow-lg flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔔</span>
                <div>
                  <p className="font-bold">New Order Incoming!</p>
                  <p className="text-sm opacity-90">Check the queue</p>
                </div>
              </div>
              <button onClick={() => setNewOrderAlert(false)} className="text-xl hover:opacity-75">
                ✕
              </button>
            </div>
          )}

          {/* Orders Grid */}
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
              <RefreshCw className="h-12 w-12 animate-spin text-gray-400 mb-4" />
              <p className="text-gray-600">Loading kitchen orders...</p>
            </div>
          ) : (
            <OrderColumn
              title="Kitchen Queue"
              color="green"
              orders={readyOrders}
              onStatusChange={handleStatusChange}
              t={t}
            />
          )}
        </div>

        <ConfirmationCard
          isOpen={confirmationState.isOpen}
          onClose={closeConfirmation}
          onConfirm={confirmationState.onConfirm}
          title={confirmationState.options.title}
          message={confirmationState.options.message}
          type={confirmationState.options.type}
          confirmText={confirmationState.options.confirmText}
          cancelText={confirmationState.options.cancelText}
          icon={confirmationState.options.icon}
        />

        <NotificationCard
          isOpen={notificationState.isOpen}
          onClose={closeNotification}
          title={notificationState.options.title}
          message={notificationState.options.message}
          type={notificationState.options.type}
          autoClose={notificationState.options.autoClose}
          duration={notificationState.options.duration}
        />
      </div>
    </ProtectedRoute>
  )
}

function OrderColumn({
  title,
  color,
  orders,
  onStatusChange,
  t
}: {
  title: string
  color: "orange" | "blue" | "green"
  orders: Order[]
  onStatusChange: (orderId: string, newStatus: string) => void
  t: (key: string) => string
}) {
  const colorClasses = {
    orange: "bg-[#1a1c1b] border-[#d4af37]/20",
    blue: "bg-[#1a1c1b] border-blue-500/20",
    green: "bg-[#1a1c1b] border-emerald-500/20"
  }

  return (
    <div className={`rounded-3xl p-6 border ${colorClasses[color]} min-h-[500px] shadow-2xl`}>
      <h2 className="text-[10px] font-black uppercase tracking-widest text-[#f3cf7a] mb-6">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[calc(100vh-300px)] overflow-y-auto font-poppins">
        {orders.length === 0 ? (
          <p className="col-span-4 text-center text-gray-500 py-8">No orders</p>
        ) : (
          orders.map(order => (
            <OrderCard
              key={order._id}
              order={order}
              onStatusChange={onStatusChange}
              color={color}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  )
}

function OrderCard({
  order,
  onStatusChange,
  color,
  t
}: {
  order: Order
  onStatusChange: (orderId: string, newStatus: string) => void
  color: "orange" | "blue" | "green"
  t: (key: string) => string
}) {
  const createdTime = new Date(order.createdAt)
  const elapsedMinutes = Math.floor((getSyncedTime().getTime() - createdTime.getTime()) / 60000)

  const borderColors = {
    orange: "border-l-[#d4af37]",
    blue: "border-l-blue-500",
    green: "border-l-emerald-500"
  }

  return (
    <Card className={`bg-[#0f1110] border-white/5 border-l-4 ${borderColors[color]} hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-all group overflow-hidden`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-black text-white">#{order.orderNumber}</h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {order.floorNumber && (
                <span className="text-[9px] font-black text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded uppercase tracking-tighter border border-blue-500/20">
                  Floor #{order.floorNumber}
                </span>
              )}
              {order.tableNumber && (
                <span className="text-[9px] font-black text-gray-400 bg-white/5 px-2 py-0.5 rounded uppercase tracking-tighter border border-white/10">
                  {order.tableNumber}
                </span>
              )}
              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {elapsedMinutes > 0 ? `${elapsedMinutes}m ago` : "Just now"}
              </p>
              {order.distributions && order.distributions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {order.distributions.map((dist, idx) => (
                    <span key={idx} className="bg-orange-900/30 text-orange-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-orange-500/20 uppercase tracking-widest italic">
                      🚚 {dist}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          {order.notes && (
            <span className="text-lg opacity-50 grayscale group-hover:grayscale-0 transition-all" title={order.notes}>📝</span>
          )}
        </div>

        <div className="space-y-2 mb-6 p-4 bg-white/5 rounded-2xl border border-white/5">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-sm border-b border-white/5 last:border-0 py-2.5">
              <div className="flex-1">
                <span className="font-bold text-gray-200 tracking-tight">#{item.menuId || item.menuItemId} {item.name}</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-[#f3cf7a] font-black uppercase tracking-widest opacity-70">{item.category}</span>
                  {item.menuTier && item.menuTier !== 'standard' && (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${item.menuTier === 'vip1' ? 'bg-purple-950/40 text-purple-400 border-purple-500/30' : 'bg-amber-950/40 text-amber-400 border-amber-500/30'}`}>
                      {item.menuTier === 'vip1' ? 'VIP 1' : 'VIP 2'}
                    </span>
                  )}
                  {item.status && (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${
                      item.status === 'pending' ? 'bg-orange-950/40 text-orange-400 border-orange-500/30' :
                      item.status === 'preparing' ? 'bg-blue-950/40 text-blue-400 border-blue-500/30' :
                      item.status === 'ready' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' :
                      item.status === 'served' ? 'bg-gray-950/40 text-gray-400 border-gray-500/30' :
                      item.status === 'cancelled' ? 'bg-red-950/40 text-red-400 border-red-500/30' :
                      'bg-gray-950/40 text-gray-400 border-gray-500/30'
                    }`}>
                      {item.status === 'pending' ? '⏳ Pending' :
                       item.status === 'preparing' ? '👨‍🍳 Preparing' :
                       item.status === 'ready' ? '✅ Ready' :
                       item.status === 'served' ? '🍽️ Served' :
                       item.status === 'cancelled' ? '❌ Cancelled' :
                       item.status}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-black bg-[#151716] text-[#d4af37] px-2.5 py-1 rounded-lg text-[10px] border border-[#d4af37]/20">
                  {item.quantity}
                </span>
              </div>
            </div>
          ))}
        </div>

        <OrderCardActions order={order} onStatusChange={onStatusChange} />
      </CardContent>
    </Card>
  )
}

function OrderCardActions({
  order,
  onStatusChange,
}: {
  order: Order
  onStatusChange: (orderId: string, newStatus: string) => void
}) {
  const [busy, setBusy] = useState(false)

  const handleClick = (newStatus: string) => {
    if (busy) return
    setBusy(true)
    onStatusChange(order._id, newStatus)
    setTimeout(() => setBusy(false), 3000)
  }

  // Single action: Serve → completed (vanishes immediately)
  if (order.status === "pending" || order.status === "preparing" || order.status === "ready") {
    return (
      <button
        onClick={() => handleClick("completed")}
        disabled={busy}
        className="w-full bg-[#d4af37] hover:bg-[#f3cf7a] text-[#0f1110] py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {busy ? (
          <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Updating...</>
        ) : "🍽️ Serve"}
      </button>
    )
  }

  return null
}
