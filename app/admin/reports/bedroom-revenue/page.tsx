"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { Hotel, RefreshCw, Banknote, CreditCard, Smartphone, CheckCircle2, Clock, X } from "lucide-react"

const PERIOD_OPTIONS = ["today", "week", "month", "year"]

const PM_LABELS: Record<string, { label: string; icon: any }> = {
  cash:           { label: "Cash",           icon: <Banknote size={14} /> },
  mobile_banking: { label: "Mobile Banking", icon: <Smartphone size={14} /> },
  telebirr:       { label: "Telebirr",       icon: <CreditCard size={14} /> },
  cheque:         { label: "Cheque",         icon: <CreditCard size={14} /> },
}

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-900/30 text-yellow-400 border-yellow-500/30",
  guests:    "bg-emerald-900/30 text-emerald-400 border-emerald-500/30",
  rejected:  "bg-red-900/30 text-red-400 border-red-500/30",
  check_in:  "bg-blue-900/30 text-blue-400 border-blue-500/30",
  check_out: "bg-purple-900/30 text-purple-400 border-purple-500/30",
}

export default function BedroomRevenuePage() {
  const { token } = useAuth()
  const [period, setPeriod] = useState("month")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/bedroom-revenue?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setData(await res.json())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  useEffect(() => { if (token) fetchData() }, [token, period])

  return (
    <ProtectedRoute requiredRoles={["admin"]} requiredPermissions={["reports:view"]}>
      <div className="min-h-screen bg-[#0f1110] p-6 text-white">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Header */}
          <div className="bg-[#151716] rounded-xl p-6 border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#1a1c1b] rounded-lg border border-[#d4af37]/20">
                <Hotel className="h-7 w-7 text-[#d4af37]" />
              </div>
              <div>
                <h1 className="text-2xl font-playfair italic font-bold text-[#f3cf7a]">Bedroom Revenue</h1>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-0.5">Bookings · {period}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-[#0f1110] p-1 rounded-xl border border-white/5">
                {PERIOD_OPTIONS.map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${period === p ? "bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110]" : "text-gray-500 hover:text-white"}`}>
                    {p}
                  </button>
                ))}
              </div>
              <button onClick={fetchData} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-32">
              <RefreshCw className="h-8 w-8 animate-spin text-[#d4af37]" />
            </div>
          ) : !data ? null : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#151716] rounded-xl p-6 border border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Total Revenue</p>
                  <p className="text-3xl font-black text-emerald-400">{(data.totalRevenue || 0).toLocaleString()} ETB</p>
                </div>
                <div className="bg-[#151716] rounded-xl p-6 border border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Total Bookings</p>
                  <p className="text-3xl font-black text-[#f3cf7a]">{data.totalBookings || 0}</p>
                </div>
                <div className="bg-[#151716] rounded-xl p-6 border border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Avg per Booking</p>
                  <p className="text-3xl font-black text-blue-400">
                    {data.totalBookings ? Math.round(data.totalRevenue / data.totalBookings).toLocaleString() : 0} ETB
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Room */}
                <div className="bg-[#151716] rounded-xl p-6 border border-white/5">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Revenue by Room</h2>
                  {(data.byRoom || []).length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-8">No data</p>
                  ) : (
                    <div className="space-y-3">
                      {(data.byRoom as any[]).sort((a, b) => b.revenue - a.revenue).map((r: any) => (
                        <div key={r.roomNumber} className="flex items-center justify-between p-3 bg-[#0f1110] rounded-xl border border-white/5">
                          <div>
                            <p className="font-black text-white text-sm">Room {r.roomNumber}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">{r.bookings} booking{r.bookings !== 1 ? "s" : ""}</p>
                          </div>
                          <p className="font-black text-[#d4af37]">{r.revenue.toLocaleString()} ETB</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* By Payment */}
                <div className="bg-[#151716] rounded-xl p-6 border border-white/5">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Revenue by Payment Method</h2>
                  {(data.byPayment || []).length === 0 ? (
                    <p className="text-gray-600 text-sm text-center py-8">No data</p>
                  ) : (
                    <div className="space-y-3">
                      {(data.byPayment as any[]).sort((a, b) => b.revenue - a.revenue).map((p: any) => {
                        const pm = PM_LABELS[p.method] || { label: p.method, icon: <Banknote size={14} /> }
                        return (
                          <div key={p.method} className="flex items-center justify-between p-3 bg-[#0f1110] rounded-xl border border-white/5">
                            <div className="flex items-center gap-2 text-gray-300">
                              {pm.icon}
                              <div>
                                <p className="font-black text-white text-sm">{pm.label}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">{p.count} transaction{p.count !== 1 ? "s" : ""}</p>
                              </div>
                            </div>
                            <p className="font-black text-[#d4af37]">{p.revenue.toLocaleString()} ETB</p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Booking List */}
              <div className="bg-[#151716] rounded-xl p-6 border border-white/5">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">All Bookings</h2>
                {(data.bookings || []).length === 0 ? (
                  <p className="text-gray-600 text-sm text-center py-8">No bookings for this period</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-white/5">
                          <th className="text-left p-3">Guest</th>
                          <th className="text-left p-3">Room</th>
                          <th className="text-left p-3">Check-In</th>
                          <th className="text-left p-3">Check-Out</th>
                          <th className="text-left p-3">Payment</th>
                          <th className="text-right p-3">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(data.bookings as any[]).map((b: any) => {
                          const pm = PM_LABELS[b.paymentMethod] || { label: b.paymentMethod, icon: null }
                          return (
                            <tr key={b._id} className="hover:bg-white/5 transition-colors">
                              <td className="p-3 font-bold text-white">{b.guestName}</td>
                              <td className="p-3 text-gray-400">Room {b.roomNumber}</td>
                              <td className="p-3 text-gray-400">{b.checkIn || "—"}</td>
                              <td className="p-3 text-gray-400">{b.checkOut || "—"}</td>
                              <td className="p-3">
                                <span className="flex items-center gap-1 text-gray-400">{pm.icon} {pm.label}</span>
                              </td>
                              <td className="p-3 text-right font-black text-[#d4af37]">{(b.roomPrice || 0).toLocaleString()} ETB</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
