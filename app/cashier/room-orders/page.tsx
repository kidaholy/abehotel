"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useConfirmation } from "@/hooks/use-confirmation"
import { NotificationCard } from "@/components/confirmation-card"
import { ConciergeBell, Check, X, Clock, AlertCircle } from "lucide-react"
import { useRef } from "react"

export default function RoomOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()
  const { notify, notificationState, closeNotification } = useConfirmation()
  const prevCount = useRef(0)

  const fetchOrders = async () => {
    if (!token) return
    try {
      const res = await fetch("/api/room-orders", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.length > prevCount.current) {
          let plays = 0
          const interval = setInterval(() => {
            new Audio('/notification.mp3').play().catch(() => {})
            plays++
            if (plays >= 5) clearInterval(interval)
          }, 1500)
        }
        setOrders(data)
        prevCount.current = data.length
      }
    } catch (error) {
      console.error("Failed to fetch room orders:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000) // Poll every 10s
    return () => clearInterval(interval)
  }, [token])

  const handleAction = async (orderId: string, action: 'approve' | 'deny') => {
    if (!token) return
    try {
      const newStatus = action === 'approve' ? 'pending' : 'cancelled'
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        notify({
          title: "Success",
          message: `Order successfully ${action === 'approve' ? 'approved to kitchen' : 'denied'}.`,
          type: "success"
        })
        fetchOrders()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Action failed", type: "error" })
      }
    } catch (error) {
      notify({ title: "Error", message: "Network error", type: "error" })
    }
  }

  return (
    <ProtectedRoute requiredRoles={["cashier", "admin", "super-admin"]} requiredPermissions={["cashier:access"]}>
      <div className="min-h-screen bg-[#0f1110] p-1 md:p-6 overflow-x-hidden text-white selection:bg-[#c5a059] selection:text-[#0f1110]">
        <div className="max-w-[1900px] mx-auto md:space-y-6 w-full overflow-hidden">
          <div className="mb-4 md:mb-0"><BentoNavbar /></div>

          {/* Header */}
          <div className="hidden md:block bg-[#151716] rounded-xl p-6 shadow-2xl border border-white/5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-[#d4af37]/10 text-[#d4af37]">
                  <ConciergeBell className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl font-playfair italic font-bold text-white flex items-center gap-3">
                    Room Service <span className="text-[#f3cf7a]">Approvals</span>
                  </h1>
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Review guest requests before kitchen preparation</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Pending Approvals</div>
                <div className="text-2xl font-black text-[#f3cf7a]">{orders.length}</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="pt-6 md:pt-0">
            {loading ? (
              <div className="flex justify-center p-10"><ConciergeBell className="animate-pulse text-[#d4af37] h-10 w-10" /></div>
            ) : orders.length === 0 ? (
              <div className="bg-[#151716] rounded-2xl border border-white/5 p-20 flex flex-col items-center justify-center text-center">
                <Check className="h-16 w-16 text-emerald-500/20 mb-4" />
                <h3 className="text-xl font-bold text-gray-400">All Caught Up</h3>
                <p className="text-gray-600 mt-2 text-sm">No new room service requests waiting for approval.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {orders.map(order => (
                  <div key={order._id} className="bg-[#151716] rounded-2xl border border-white/10 overflow-hidden shadow-xl flex flex-col">
                    <div className="bg-[#1a1c1b] p-4 border-b border-white/5 flex items-start justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <div className="bg-[#d4af37]/10 p-1.5 rounded-lg border border-[#d4af37]/20">
                            <ConciergeBell size={16} className="text-[#d4af37]" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-white">{order.tableNumber}</h3>
                            {order.floorNumber && (
                              <p className="text-[9px] font-black text-[#f3cf7a] bg-[#d4af37]/10 px-2 py-0.5 rounded border border-[#d4af37]/20 uppercase tracking-widest mt-0.5 shadow-sm">
                                Floor #{order.floorNumber}
                              </p>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 flex items-center gap-1 mt-2">
                          <Clock size={10} /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="bg-[#0f1110] px-3 py-1.5 rounded-lg border border-white/5 text-right">
                        <p className="text-[9px] uppercase font-bold tracking-widest text-gray-500 mb-0.5">Total</p>
                        <p className="text-sm font-black text-[#f3cf7a]">{order.totalAmount} Br</p>
                      </div>
                    </div>

                    <div className="p-5 flex-1 overflow-y-auto max-h-[300px]">
                      <div className="space-y-3">
                        {order.items.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between items-start gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                            <div>
                              <p className="font-bold text-gray-200 text-sm leading-tight">{item.quantity}x {item.name}</p>
                              {item.notes && <p className="text-[10px] text-orange-400 font-bold mt-1 bg-orange-500/10 px-2 py-0.5 rounded w-fit">Note: {item.notes}</p>}
                            </div>
                            <p className="text-xs font-black text-gray-400">{item.price * item.quantity} Br</p>
                          </div>
                        ))}
                      </div>

                      {order.notes && order.notes !== "Room Service App Order" && (
                        <div className="mt-4 bg-[#0f1110] border border-white/5 p-3 rounded-xl flex items-start gap-2 text-gray-400">
                          <AlertCircle size={14} className="mt-0.5 shrink-0 text-blue-400" />
                          <p className="text-xs">{order.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-[#0f1110] border-t border-white/5 grid grid-cols-2 gap-3 shrink-0">
                      <button 
                        onClick={() => handleAction(order._id, 'deny')}
                        className="flex items-center justify-center gap-2 bg-red-950/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 rounded-xl py-3 font-bold text-[10px] uppercase tracking-widest transition-colors"
                      >
                        <X size={14} /> Deny
                      </button>
                      <button 
                        onClick={() => handleAction(order._id, 'approve')}
                        className="flex items-center justify-center gap-2 bg-emerald-950/20 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-900/30 rounded-xl py-3 font-bold text-[10px] uppercase tracking-widest transition-colors"
                      >
                        <Check size={14} /> Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <NotificationCard isOpen={notificationState.isOpen} onClose={closeNotification} title={notificationState.options.title} message={notificationState.options.message} type={notificationState.options.type} autoClose={notificationState.options.autoClose} duration={notificationState.options.duration} />
      </div>
    </ProtectedRoute>
  )
}
