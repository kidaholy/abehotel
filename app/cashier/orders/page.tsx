"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { useSettings } from "@/context/settings-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingBag, RefreshCw, DollarSign } from 'lucide-react'

interface OrderItem {
  menuItemId: string
  name: string
  quantity: number
  price: number
}

interface Order {
  _id: string
  orderNumber: string
  items: OrderItem[]
  totalAmount: number
  paymentMethod: string
  status: "preparing" | "ready" | "completed" | "cancelled"
  tableNumber: string
  batchNumber?: string
  floorNumber?: string
  createdAt: string
  updatedAt: string
  isDeleted?: boolean
  distributions?: string[]
}

export default function CashierOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [todayRevenue, setTodayRevenue] = useState<{ enabled: boolean; totalRevenue: number; totalOrders: number }>({
    enabled: false,
    totalRevenue: 0,
    totalOrders: 0
  })
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<"all" | "preparing" | "completed">("all")
  const [mainCategoryFilter, setMainCategoryFilter] = useState<"all" | "Food" | "Drinks">("all")
  const { token, user } = useAuth()
  const { t } = useLanguage()
  const { settings } = useSettings()

  useEffect(() => {
    fetchOrders()
    const interval = setInterval(fetchOrders, 5000)
    const handleRefresh = () => fetchOrders()
    window.addEventListener('focus', handleRefresh)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'orderUpdated' || e.key === 'newOrderCreated') handleRefresh()
    }
    window.addEventListener('storage', handleStorage)
    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleRefresh)
      window.removeEventListener('storage', handleStorage)
    }
  }, [token, settings.enable_cashier_today_revenue])

  const fetchOrders = async () => {
    try {
      const response = await fetch(`/api/orders?period=today`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) setOrders(await response.json())

      if (settings.enable_cashier_today_revenue === "true") {
        const revenueResponse = await fetch("/api/cashier/today-revenue", {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (revenueResponse.ok) {
          setTodayRevenue(await revenueResponse.json())
        } else {
          setTodayRevenue({ enabled: false, totalRevenue: 0, totalOrders: 0 })
        }
      } else {
        setTodayRevenue({ enabled: false, totalRevenue: 0, totalOrders: 0 })
      }
    } catch (err) {
      console.error("Failed to load orders")
    } finally {
      setLoading(false)
    }
  }

  const isDeletedOrder = (o: Order) => !!o.isDeleted || o.status === "cancelled"

  const filteredOrders = orders.filter(o => {
    if (isDeletedOrder(o)) return false
    const matchesStatus = filterStatus === "all" || o.status === filterStatus
    const matchesCategory = mainCategoryFilter === "all" || o.items.some(item => (item as any).mainCategory === mainCategoryFilter)
    return matchesStatus && matchesCategory
  })



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30'
      case 'preparing': return 'bg-blue-900/30 text-blue-400 border-blue-500/30'
      case 'ready': return 'bg-[#d4af37]/10 text-[#f3cf7a] border-[#d4af37]/30'
      case 'cancelled': return 'bg-red-900/30 text-red-400 border-red-500/30'
      default: return 'bg-[#0f1110] text-gray-500 border-white/10'
    }
  }

  return (
    <ProtectedRoute requiredRoles={["cashier"]} requiredPermissions={["cashier:access"]}>
      <div className="min-h-screen bg-[#0f1110] p-6 text-white selection:bg-[#c5a059] selection:text-[#0f1110]">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Header */}
          <div className="bg-[#151716] rounded-xl p-6 shadow-2xl border border-white/5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <ShoppingBag className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-playfair italic font-bold text-white">Recent Orders</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Today's sales history
                    {user?.floorNumber && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600">
                        Floor #{user.floorNumber}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">

                <button
                  onClick={fetchOrders}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <RefreshCw className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {todayRevenue.enabled && (
            <div className="bg-[#151716] rounded-xl p-6 shadow-2xl border border-[#d4af37]/30">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-[#d4af37]/10 rounded-lg border border-[#d4af37]/20">
                    <DollarSign className="h-7 w-7 text-[#f3cf7a]" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-gray-500">Today's Total Revenue</h2>
                    <p className="text-3xl font-playfair italic font-bold text-[#f3cf7a] mt-1">
                      {todayRevenue.totalRevenue.toLocaleString()} ETB
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Revenue Orders</p>
                  <p className="text-xl font-black text-white">{todayRevenue.totalOrders}</p>
                </div>
              </div>
            </div>
          )}


          {/* Orders List */}
          <Card className="bg-[#151716] border border-white/5 shadow-2xl">
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle className="text-xl font-playfair italic font-bold text-[#f3cf7a]">Sales History</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="flex bg-[#0f1110] p-1 rounded-xl mr-4 border border-white/5">
                    {["all", "Food", "Drinks"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setMainCategoryFilter(c as any)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${mainCategoryFilter === c
                          ? "bg-[#2d5a41] text-white shadow-sm"
                          : "text-gray-500 hover:text-gray-900"
                          }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="flex bg-[#0f1110] p-1 rounded-xl border border-white/5">
                    {["all", "preparing", "completed"].map((s) => (
                      <button
                        key={s}
                        onClick={() => setFilterStatus(s as any)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase transition-all ${filterStatus === s
                          ? "bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] shadow-md"
                          : "text-gray-500 hover:text-white"
                          }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="h-12 w-12 animate-spin text-gray-400 mb-4" />
                  <p className="text-gray-600">Loading orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center py-20">
                  <ShoppingBag className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No orders found</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-6 md:mx-0">
                  <table className="w-full min-w-[600px] md:min-w-0">
                    <thead>
                      <tr className="border-b border-white/5 bg-[#0f1110]/50">
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Order</th>
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Context</th>
                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Items</th>
                        <th className="text-right py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Amount</th>
                        <th className="text-center py-4 px-6 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order._id} className="border-b border-white/5 hover:bg-[#1a1c1b] transition-colors">
                          <td className="py-4 px-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-white">#{order.orderNumber}</span>
                              <span className="text-[10px] text-gray-400 font-bold">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-black border border-purple-100 w-fit">
                                {order.floorNumber ? `Floor #${order.floorNumber}` : 'Global'}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-black border border-blue-100 w-fit">
                                Table {order.tableNumber}
                              </span>
                              {order.batchNumber && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-black border border-amber-100 w-fit">
                                  Batch {order.batchNumber}
                                </span>
                              )}
                              {order.distributions && order.distributions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {order.distributions.map((dist, idx) => (
                                    <span key={idx} className="bg-orange-50 text-orange-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-orange-100 uppercase tracking-widest italic">
                                      🚚 {dist}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="text-xs text-gray-600">
                              {order.items.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="truncate max-w-[120px]">
                                  {item.name} <span className="text-gray-400 font-bold">×{item.quantity}</span>
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <div className="text-[10px] text-gray-400 font-black uppercase mt-1">+{order.items.length - 2} more items</div>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="text-sm font-black text-[#f3cf7a]">{order.totalAmount.toFixed(0)} ETB</span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
