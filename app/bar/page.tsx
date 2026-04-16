"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { RefreshCw, Clock, Beer, Maximize2, Minimize2 } from 'lucide-react'
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
  status: "unconfirmed" | "pending" | "preparing" | "ready" | "completed" | "cancelled"
  notes?: string
  floorNumber?: string
  tableNumber?: string
  createdAt: string
  updatedAt: string
  isDeleted?: boolean
  distributions?: string[]
}

export default function BarDisplayPage() {
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
      fetchBarCategories()
    }
    const interval = setInterval(fetchOrders, 3000)
    return () => clearInterval(interval)
  }, [token])

  const fetchBarCategories = async () => {
    try {
      const response = await fetch("/api/system-check", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setAssignedCategories(data.user?.assignedCategories || [])
      }
    } catch (err) {
      console.error("Failed to fetch bar categories")
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
        const cached = localStorage.getItem("bar_orders_cache")
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
          order.status !== "unconfirmed" &&
          !pendingUpdates.current.has(order._id) &&
          order.items.some(item => (item as any).mainCategory === "Drinks" && 
            item.status !== "completed" && 
            item.status !== "served" && 
            item.status !== "cancelled"
          )
        ).map((order: Order) => ({
          ...order,
          items: order.items.filter(item => (item as any).mainCategory === "Drinks")
        }))

        // Update Cache
        localStorage.setItem("bar_orders_cache", JSON.stringify(activeOrders))

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
    setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus as any } : o))
    
    pendingUpdates.current.add(orderId)

    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        setOrders(preservedOrders)
        notify({ title: "Update Failed", message: "Could not update order status", type: "error" })
      } else {
        fetchOrders()
      }
    } catch (err) {
      setOrders(preservedOrders)
    } finally {
      setTimeout(() => pendingUpdates.current.delete(orderId), 2000)
    }
  }

  const handleItemStatusChange = async (orderId: string, menuItemId: string, newStatus: string) => {
    const preservedOrders = orders;
    setOrders(prev => prev.map(o => o._id === orderId ? {
      ...o,
      items: o.items.map(i => i.menuItemId === menuItemId ? { ...i, status: newStatus as any } : i)
    } : o))

    try {
      const res = await fetch(`/api/orders/${orderId}/item-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ menuItemId, status: newStatus }),
      })

      if (!res.ok) {
        setOrders(preservedOrders)
      } else {
        fetchOrders()
      }
    } catch (err) {
      setOrders(preservedOrders)
    }
  }

  return (
    <ProtectedRoute requiredRoles={["bar", "admin"]} requiredPermissions={["bar:access"]}>
      <div className={`min-h-screen bg-[#0f1110] text-white flex flex-col ${isKioskMode ? 'p-0' : 'p-6'}`}>
        {!isKioskMode && <BentoNavbar />}

        {/* New Order Alert */}
        {newOrderAlert && (
          <div className="bg-blue-600 text-white p-4 rounded-xl mb-6 animate-bounce flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3">
              <Beer className="animate-spin" />
              <span className="font-black uppercase tracking-widest">New Drink Order Received!</span>
            </div>
            <button onClick={() => setNewOrderAlert(false)} className="font-bold border-l border-white/20 pl-4">DISMISS</button>
          </div>
        )}

        {/* Stats & Header */}
        {!isKioskMode && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 px-2">
            <div>
              <h1 className="text-4xl font-black text-[#f3cf7a] flex items-center gap-4">
                <Beer className="h-10 w-10" />
                BAR DASHBOARD
              </h1>
              <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 ml-1">
                Real-time Drink Management System
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsKioskMode(!isKioskMode)}
                className="bg-white/5 border border-white/10 p-3 rounded-2xl hover:bg-white/10 transition-all text-gray-400"
              >
                {isKioskMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
              <div className="bg-[#1a1c1b] px-6 py-3 rounded-2xl border border-white/5 flex flex-col items-center">
                <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest mb-1 items-center flex gap-1">
                   <Clock className="h-2 w-2" /> Server Time
                </span>
                <span className="text-xl font-black text-white font-mono tracking-tighter">
                   {getSyncedTime().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        )}

        {loading && orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <RefreshCw className="h-12 w-12 text-[#f3cf7a] animate-spin mb-4" />
            <p className="text-gray-500 font-black uppercase tracking-widest">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-20">
            <Beer className="h-32 w-32 mb-6" />
            <h2 className="text-2xl font-black uppercase tracking-widest">No Active Drink Orders</h2>
            <p className="mt-2 font-bold italic">The bar is currently clear</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-2">
            {orders.map((order) => (
              <BarOrderCard 
                key={order._id} 
                order={order} 
                onStatusChange={handleStatusChange}
                onItemStatusChange={handleItemStatusChange}
              />
            ))}
          </div>
        )}

        <footer className="mt-12 py-6 border-t border-white/5 flex justify-between items-center px-4">
           <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              LIVE CONNECTION ACTIVE
           </div>
           <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest">
              ABE HOTEL v2.0 • BAR SYSTEM
           </p>
        </footer>

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

function BarOrderCard({ order, onStatusChange, onItemStatusChange }: { 
  order: Order, 
  onStatusChange: (id: string, s: string) => void,
  onItemStatusChange: (id: string, mid: string, s: string) => void 
}) {
  const elapsedMinutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
  
  const getColor = () => {
    if (order.status === 'ready') return 'green'
    if (elapsedMinutes > 15) return 'red'
    if (elapsedMinutes > 8) return 'yellow'
    return 'blue'
  }

  const color = getColor()
  const borderColors = {
    blue: "border-l-blue-500",
    yellow: "border-l-yellow-500",
    red: "border-l-red-500",
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
        </div>
        {order.notes && (
          <div className="bg-amber-950/20 border border-amber-900/20 p-2.5 rounded-xl mb-4">
             <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest flex items-center gap-2">
                ⚠️ NOTES
             </p>
             <p className="text-xs text-gray-300 mt-1 italic font-light">"{order.notes}"</p>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {order.items.map((item, idx) => (
            <div key={idx} className="flex flex-col gap-2 p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-all">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#f3cf7a] text-[#2a1708] w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black">
                      {item.quantity}
                    </span>
                    <span className="text-sm font-bold text-white uppercase tracking-tight">
                      {item.name}
                    </span>
                    {item.menuTier && item.menuTier !== 'standard' && (
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest border ${item.menuTier === 'vip1' ? 'bg-purple-950/40 text-purple-400 border-purple-500/30' : 'bg-amber-950/40 text-amber-400 border-amber-500/30'}`}>
                        {item.menuTier === 'vip1' ? 'VIP 1' : 'VIP 2'}
                      </span>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => onItemStatusChange(order._id, item.menuItemId, item.status === 'ready' ? 'preparing' : 'ready')}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${item.status === 'ready' 
                    ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.3)]' 
                    : 'bg-white/5 text-gray-500 hover:text-white'}`}
                >
                  {item.status === 'ready' ? 'READY' : 'MARK READY'}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-white/5">
          <button
            onClick={() => onStatusChange(order._id, 'completed')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl active:scale-95 text-xs tracking-[0.2em] uppercase flex items-center justify-center gap-3"
          >
             <Beer className="h-4 w-4" />
             COMPLETE ORDER
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
