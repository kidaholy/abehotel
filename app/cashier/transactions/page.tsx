"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, Receipt, RefreshCw } from 'lucide-react'

interface Order {
  _id: string
  orderNumber: string
  totalAmount: number
  paymentStatus: string
  paymentMethod: string
  status: string
  tableNumber: string
  createdAt: string
}

export default function TransactionsPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    fetchOrders()
  }, [token])

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setOrders(await response.json())
      }
    } catch (err) {
      console.error("Failed to load orders")
    } finally {
      setLoading(false)
    }
  }

  const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0)
  const avgTransaction = totalRevenue / (orders.length || 1)

  return (
    <ProtectedRoute requiredRoles={["admin"]} requiredPermissions={["cashier:access", "reports:view"]}>
      <div className="min-h-screen bg-[#0f1110] p-6 text-white selection:bg-[#d4af37] selection:text-[#0f1110]">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Header */}
          <div className="bg-[#0f1110] rounded-2xl p-6 border border-white/5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-[#d4af37]/10 rounded-xl border border-[#d4af37]/20">
                  <Receipt className="h-8 w-8 text-[#f3cf7a]" />
                </div>
                <div>
                  <h1 className="text-3xl font-playfair italic font-bold text-[#f3cf7a]">Transactions</h1>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">Complete transaction history</p>
                </div>
              </div>
              <button
                onClick={fetchOrders}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-[#d4af37]"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-[#0f1110] border border-white/5 hover:border-[#d4af37]/30 transition-all">
              <CardContent className="p-6">
                <div className="inline-flex p-3 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#f3cf7a] mb-4">
                  <DollarSign className="h-6 w-6" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total Sales</p>
                <p className="text-3xl font-black text-[#f3cf7a] mt-2">
                  {totalRevenue.toFixed(0)} ETB
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#0f1110] border border-white/5 hover:border-[#d4af37]/30 transition-all">
              <CardContent className="p-6">
                <div className="inline-flex p-3 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#f3cf7a] mb-4">
                  <Receipt className="h-6 w-6" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Volume</p>
                <p className="text-3xl font-black text-[#f3cf7a] mt-2">{orders.length}</p>
              </CardContent>
            </Card>

            <Card className="bg-[#0f1110] border border-white/5 hover:border-[#d4af37]/30 transition-all">
              <CardContent className="p-6">
                <div className="inline-flex p-3 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#f3cf7a] mb-4">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Average Ticket</p>
                <p className="text-3xl font-black text-[#f3cf7a] mt-2">
                  {avgTransaction.toFixed(0)} ETB
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Transaction Log */}
          <Card className="bg-[#0f1110] border border-white/5">
            <CardHeader>
              <CardTitle className="text-xl font-playfair italic font-bold text-[#f3cf7a]">Transaction Log</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <RefreshCw className="h-12 w-12 animate-spin text-[#d4af37] mb-4" />
                  <p className="text-gray-500 font-black text-[10px] uppercase tracking-widest">Loading transactions...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-20">
                  <Receipt className="h-16 w-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-600 font-black text-[10px] uppercase tracking-widest">No transactions found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Order #</th>
                        <th className="text-left py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Table</th>
                        <th className="text-right py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Amount</th>
                        <th className="text-center py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Payment</th>
                        <th className="text-center py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Status</th>
                        <th className="text-right py-3 px-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Date/Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order) => (
                        <tr key={order._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-4">
                            <span className="text-sm font-bold text-[#f3cf7a]">#{order.orderNumber}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm font-bold text-[#d4af37]">Table {order.tableNumber}</span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className="text-sm font-black text-white">{order.totalAmount.toFixed(2)} ETB</span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${order.paymentStatus === 'paid'
                              ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'
                              : 'bg-[#0f1110] text-gray-500 border border-white/10'
                              }`}>
                              {order.paymentMethod || order.paymentStatus || 'pending'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest ${order.status === 'completed'
                              ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'
                              : 'bg-orange-900/30 text-orange-400 border border-orange-500/30'
                              }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="text-sm text-gray-400 font-bold">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-gray-600 font-bold">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
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
