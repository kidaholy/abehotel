"use client"

import { useEffect, useState, useCallback } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { useBusinessMetrics, MetricsUtils } from "@/hooks/use-business-metrics"
import { useConfirmation } from "@/hooks/use-confirmation"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Key,
  Users,
  Eye,
  X,
  Search,
  ConciergeBell
} from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-900/30 text-yellow-400 border-yellow-500/30",
  check_in:  "bg-blue-900/30 text-blue-400 border-blue-500/30",
  rejected:  "bg-red-900/30 text-red-400 border-red-500/30",
  check_out: "bg-purple-900/30 text-purple-400 border-purple-500/30",
}

const FILTER_LABELS: Record<string, { label: string; icon: any }> = {
  all:       { label: "GUESTS",      icon: <Users size={14} /> },
  check_in:  { label: "CHECKED IN",  icon: <CheckCircle2 size={14} /> },
  rejected:  { label: "DENIED",      icon: <XCircle size={14} /> },
  check_out: { label: "CHECKED OUT", icon: <Key size={14} /> },
}

export default function AdminDashboardPage() {
  const { token } = useAuth()
  const { t } = useLanguage()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

  const { metrics, loading, error, refresh, lastUpdated } = useBusinessMetrics({
    period: 'today',
    autoRefresh: true,
    refreshInterval: 60000
  })

  const [requests, setRequests] = useState<any[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [filter, setFilter] = useState<keyof typeof FILTER_LABELS>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selected, setSelected] = useState<any | null>(null)
  const [reviewNote, setReviewNote] = useState("")
  const [actioning, setActioning] = useState(false)
  const [extendDate, setExtendDate] = useState("")

  const fetchRequests = useCallback(async () => {
    try {
      setRequestsLoading(true)
      const res = await fetch("/api/reception-requests", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setRequests(await res.json())
    } catch { /* silent */ }
    finally { setRequestsLoading(false) }
  }, [token])

  useEffect(() => { if (token) fetchRequests() }, [token, fetchRequests])

  const handleAction = async (id: string, status: string) => {
    const label = status === "check_in" ? "Approve Arrival" : status === "check_out" ? "Approve Check-Out" : status === "rejected" ? "Reject" : "Apply"
    const confirmed = await confirm({
      title: `${label} Request`,
      message: `Are you sure you want to proceed?`,
      type: status === "rejected" ? "danger" : "success",
      confirmText: label,
      cancelText: "Cancel",
    })
    if (!confirmed) return
    
    setActioning(true)
    try {
      const res = await fetch(`/api/reception-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, reviewNote }),
      })
      if (res.ok) {
        notify({ title: "Success", message: "Request updated successfully", type: "success" })
        setSelected(null)
        setReviewNote("")
        fetchRequests()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to update", type: "error" })
      }
    } catch { notify({ title: "Error", message: "Network error", type: "error" }) }
    setActioning(false)
  }

  const handleExtendDate = async (id: string) => {
    if (!extendDate) {
      notify({ title: "Error", message: "Please select a new checkout date", type: "error" })
      return
    }
    
    const confirmed = await confirm({
      title: "Extend Stay",
      message: `Extend checkout date to ${extendDate}?`,
      type: "success",
      confirmText: "Extend",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    
    setActioning(true)
    try {
      const res = await fetch(`/api/reception-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ checkOut: extendDate }),
      })
      if (res.ok) {
        notify({ title: "Success", message: "Stay extended successfully", type: "success" })
        setExtendDate("")
        fetchRequests()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to extend", type: "error" })
      }
    } catch { notify({ title: "Error", message: "Network error", type: "error" }) }
    setActioning(false)
  }

  const q = searchQuery.toLowerCase()
  const searchFiltered = requests.filter(r => 
    !searchQuery || (
      r.guestName?.toLowerCase().includes(q) ||
      r.phone?.toLowerCase().includes(q) ||
      r.roomNumber?.toString().includes(q) ||
      r.faydaId?.toLowerCase().includes(q)
    )
  )

  const filteredRequests = searchFiltered.filter(r => {
    if (filter === "all") return true
    return r.status === filter
  })

  const counts: Record<string, number> = {
    all: searchFiltered.length,
    check_in: searchFiltered.filter(r => r.status === "check_in").length,
    rejected: searchFiltered.filter(r => r.status === "rejected").length,
    check_out: searchFiltered.filter(r => r.status === "check_out").length,
  }

  if (error) {
    return (
      <ProtectedRoute requiredRoles={["admin"]}>
        <div className="min-h-screen bg-[#0f1110] p-6 flex items-center justify-center">
          <Card className="bg-[#151716] border-red-900/50 max-w-md shadow-2xl">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Data</h2>
              <p className="text-gray-400 mb-4">{error}</p>
              <Button onClick={refresh} className="bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] hover:shadow-[0_4px_15px_rgba(212,175,55,0.4)] border border-[#f5db8b]">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="min-h-screen bg-[#0f1110] p-6 text-white selection:bg-[#d4af37] selection:text-[#0f1110]">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Header */}
          <div className="bg-[#151716] rounded-xl p-6 border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#1a1c1b] rounded-lg border border-[#d4af37]/20">
                <BarChart3 className="h-7 w-7 text-[#d4af37]" />
              </div>
              <div>
                <h1 className="text-2xl font-playfair italic font-bold text-[#f3cf7a]">Admin Dashboard</h1>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-0.5">Business Overview & Guest Management</p>
              </div>
            </div>
            <button onClick={() => { refresh(); fetchRequests() }} disabled={loading || requestsLoading} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all disabled:opacity-30">
              <RefreshCw className={`h-4 w-4 ${loading || requestsLoading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              icon={<DollarSign className="h-6 w-6" />}
              label="Today's Revenue"
              value={metrics ? MetricsUtils.formatCurrency(metrics.realTimeMetrics.todayRevenue) : "---"}
              color="gold"
            />
            <MetricCard
              icon={<ShoppingCart className="h-6 w-6" />}
              label="Total Orders"
              value={metrics ? metrics.realTimeMetrics.todayOrders.toString() : "-"}
              subtext={metrics ? `${metrics.operationalMetrics.customerSatisfaction.completedOrders} completed` : "loading..."}
              color="gold"
            />
            <MetricCard
              icon={<TrendingUp className="h-6 w-6" />}
              label="Average Order"
              value={metrics ? MetricsUtils.formatCurrency(metrics.realTimeMetrics.averageOrderValue) : "---"}
              color="gold"
            />
            <MetricCard
              icon={<Package className="h-6 w-6" />}
              label="Stock Alerts"
              value={metrics ? metrics.inventoryInsights.lowStockAlerts.length.toString() : "-"}
              color={metrics && metrics.inventoryInsights.lowStockAlerts.length > 0 ? "red" : "gray"}
              isAlert={metrics ? metrics.inventoryInsights.lowStockAlerts.length > 0 : false}
            />
          </div>

          {/* Search & Filter Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search guests..."
                className="w-full bg-[#151716] border border-white/5 rounded-xl pl-12 pr-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#f3cf7a] outline-none focus:border-[#d4af37]/20 transition-all placeholder:text-gray-700 shadow-xl" />
            </div>
            
            <div className="lg:col-span-8 flex flex-wrap gap-2 items-center bg-[#151716] p-1.5 rounded-xl border border-white/5 shadow-xl">
              {(Object.keys(FILTER_LABELS) as Array<keyof typeof FILTER_LABELS>).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[9px] font-black transition-all border ${
                    filter === f 
                      ? "bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border-[#f5db8b] shadow-lg" 
                      : "bg-[#1a1c1b] text-gray-500 border-white/5 hover:border-[#d4af37]/20 hover:text-gray-300"
                  }`}>
                  {FILTER_LABELS[f].icon}
                  <span className="uppercase tracking-widest">{FILTER_LABELS[f].label}</span>
                  <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[8px] font-black ${filter === f ? "bg-white/20" : "bg-white/5"}`}>
                    {counts[f]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Guest Requests List */}
          <div className="min-h-[400px]">
            {requestsLoading ? (
              <div className="flex items-center justify-center py-32">
                <RefreshCw className="h-8 w-8 animate-spin text-[#d4af37]" />
              </div>
            ) : (
              <>
                {filteredRequests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-gray-600 border border-dashed border-white/5 rounded-2xl">
                    <ConciergeBell size={48} className="mb-4 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-center">No matching records found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-10">
                    {filteredRequests.map(r => (
                      <div key={r._id} className="bg-[#151716] rounded-xl border border-white/5 hover:border-white/10 transition-all p-5 flex flex-col gap-4 group relative overflow-hidden shadow-lg">
                        <div className={`absolute top-0 left-0 right-0 h-0.5 opacity-40 transition-opacity group-hover:opacity-100 ${STATUS_STYLES[r.status]?.split(" ")[0].replace("bg-", "bg-") || "bg-yellow-500"}`} />
                        
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-1 text-[#d4af37]">
                            <div className="flex items-center gap-2">
                              {r.inquiryType === "check_out" ? <Key size={14} /> : <ConciergeBell size={14} />}
                              <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">
                                {r.inquiryType === "check_out" ? "Departure Request" : "Arrival Request"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-white text-sm truncate">{r.guestName}</span>
                            </div>
                          </div>
                          <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase border shrink-0 ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                            {r.status === "pending" ? "NEEDS ACTION" : 
                             r.status === "check_in" ? "CHECKED IN" : 
                             r.status === "rejected" ? "DENIED" : 
                             r.status === "check_out" ? "CHECKED OUT" : 
                             r.status.replace("_", " ")}
                          </span>
                        </div>

                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2 text-[10px] text-gray-400 font-bold">
                            {r.roomNumber && <span className="bg-[#0f1110] px-2 py-1 rounded border border-white/5">Room #{r.roomNumber}</span>}
                            {r.phone && <span className="bg-[#0f1110] px-2 py-1 rounded border border-white/5">{r.phone}</span>}
                          </div>
                          <div className="flex items-center gap-3 text-[9px] text-gray-600 font-bold">
                            <Clock size={10} />
                            <span>{r.checkIn} → {r.checkOut || "???"}</span>
                          </div>
                        </div>

                        {r.reviewNote && (
                          <div className="text-[10px] text-blue-400 bg-blue-900/10 rounded-lg p-3 border border-blue-500/10 font-bold italic">
                            " {r.reviewNote} "
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                          <span className="text-[8px] text-gray-700 uppercase font-black tracking-widest">
                            ID: {r._id.slice(-6).toUpperCase()}
                          </span>
                          <button onClick={() => { setSelected(r); setReviewNote(r.reviewNote || "") }}
                            className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1c1b] rounded-lg border border-white/5 hover:border-[#d4af37]/30 transition-all shadow-sm">
                            <Eye size={12} /> Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <Link href="/admin/reports">
              <Card className="hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] transition-all duration-300 cursor-pointer border-white/10 bg-[#151716] group">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="h-10 w-10 text-[#d4af37] mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <h3 className="font-playfair italic text-2xl text-[#f3cf7a] mb-2">View Reports</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-light">Sales & analytics</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/stock">
              <Card className="hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] transition-all duration-300 cursor-pointer border-white/10 bg-[#151716] group">
                <CardContent className="p-6 text-center">
                  <Package className="h-10 w-10 text-[#d4af37] mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <h3 className="font-playfair italic text-2xl text-[#f3cf7a] mb-2">Manage Stock</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-light">Update inventory</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/services">
              <Card className="hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] transition-all duration-300 cursor-pointer border-white/10 bg-[#151716] group">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="h-10 w-10 text-[#d4af37] mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <h3 className="font-playfair italic text-2xl text-[#f3cf7a] mb-2">Services</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-light">Menu, Rooms & Floors</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Stock Alerts */}
          {metrics && metrics.inventoryInsights.lowStockAlerts.length > 0 && (
            <Card className="border-red-900/50 bg-[#1a0f0f] shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500 text-lg font-playfair italic">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Stock Alerts ({metrics.inventoryInsights.lowStockAlerts.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.inventoryInsights.lowStockAlerts.slice(0, 5).map((alert, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-[#0f1110] rounded-lg border border-red-900/30">
                      <div>
                        <p className="font-medium text-gray-200">{alert.name}</p>
                        <p className="text-sm text-gray-500 font-light">{alert.current} {alert.unit} remaining</p>
                      </div>
                      <span className="text-[10px] tracking-widest uppercase bg-red-950/80 text-red-400 px-3 py-1 rounded-full font-bold border border-red-900/50">
                        {alert.urgency}
                      </span>
                    </div>
                  ))}
                  {metrics.inventoryInsights.lowStockAlerts.length > 5 && (
                    <Link href="/admin/stock" className="block text-center p-2 text-red-400 hover:text-red-300 hover:underline text-xs tracking-wide uppercase pt-4">
                      View all {metrics.inventoryInsights.lowStockAlerts.length} alerts
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Detail Modal */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-hidden"
            onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
            <div className="bg-[#151716] border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors bg-[#0f1110] p-1.5 rounded-lg border border-white/10">
                <X size={18} />
              </button>

              <div className="p-8 space-y-8">
                {/* Modal Header */}
                <div className="space-y-2 border-l-4 border-[#d4af37] pl-4">
                  <h2 className="text-2xl font-playfair italic font-bold text-[#f3cf7a] leading-none">{selected.guestName}</h2>
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase border ${STATUS_STYLES[selected.status] || STATUS_STYLES.pending}`}>
                      {selected.status}
                    </span>
                    <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest opacity-50">{selected.inquiryType.replace("_", " ")} Request</span>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Phone", value: selected.phone || "—" },
                    { label: "Fayda ID", value: selected.faydaId || "—" },
                    { label: "Room", value: `Room #${selected.roomNumber || "—"}` },
                    { label: "Price", value: `${selected.roomPrice?.toLocaleString()} ETB` },
                    { label: "Stay Dates", value: `${selected.checkIn} → ${selected.checkOut || "—"}`, colSpan: true },
                  ].map((item, idx) => (
                    <div key={idx} className={`bg-[#0f1110] p-4 rounded-xl border border-white/5 space-y-1 shadow-inner ${item.colSpan ? "col-span-2" : ""}`}>
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">{item.label}</p>
                      <p className="text-white font-bold text-sm tracking-tight">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Review Section */}
                <div className="space-y-4">
                  {selected.notes && (
                    <div className="bg-[#0f1110] rounded-xl p-5 border border-white/5 shadow-inner">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Guest's Initial Note</p>
                      <p className="text-gray-300 text-sm italic font-medium leading-relaxed">"{selected.notes}"</p>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-[#d4af37]">Internal Feedback Note</label>
                    <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={3}
                      placeholder="Add instructions or feedback for reception staff..."
                      className="w-full bg-[#0f1110] border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-[#d4af37]/30 resize-none transition-all placeholder:text-gray-700 shadow-inner" />
                  </div>

                  {/* Dynamic Action Buttons */}
                  <div className="pt-2 space-y-3">
                    {selected.status === "pending" && (
                      <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => handleAction(selected._id, "rejected")} disabled={actioning}
                          className="col-span-1 py-4 bg-red-900/20 border border-red-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                          <XCircle size={14} /> Deny
                        </button>
                        <button onClick={() => handleAction(selected._id, selected.inquiryType === "check_out" ? "check_out" : "check_in")} disabled={actioning}
                          className="col-span-2 py-4 bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:shadow-[#d4af37]/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                          {selected.inquiryType === "check_out" ? <Key size={16} /> : <CheckCircle2 size={16} />}
                          Approve {selected.inquiryType === "check_out" ? "Departure" : "Arrival"}
                        </button>
                      </div>
                    )}
                    
                    {selected.status === "check_in" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="block text-[9px] font-black uppercase tracking-widest text-[#d4af37]">Extend Checkout Date</label>
                            <input type="date" value={extendDate} onChange={e => setExtendDate(e.target.value)}
                              className="w-full bg-[#0f1110] border border-white/10 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-[#d4af37]/30 transition-all" />
                          </div>
                          <div className="flex flex-col justify-end">
                            <button onClick={() => handleExtendDate(selected._id)} disabled={actioning || !extendDate}
                              className="py-2 bg-[#d4af37]/20 border border-[#d4af37]/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#f3cf7a] hover:bg-[#d4af37]/30 transition-all disabled:opacity-50">
                              Extend Stay
                            </button>
                          </div>
                        </div>
                        <button onClick={() => handleAction(selected._id, "check_out")} disabled={actioning}
                          className="w-full py-4 bg-purple-900/30 border border-purple-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-purple-400 hover:bg-purple-900/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                          <Key size={14} /> Approve Check-Out
                        </button>
                      </div>
                    )}
                    
                    {selected.status === "check_out" && (
                      <div className={`py-5 rounded-xl border text-center text-[11px] font-black uppercase tracking-widest shadow-inner ${STATUS_STYLES[selected.status]}`}>
                        CHECKED OUT - Guest has departed
                      </div>
                    )}
                    
                    {selected.status === "rejected" && (
                      <div className={`py-5 rounded-xl border text-center text-[11px] font-black uppercase tracking-widest shadow-inner ${STATUS_STYLES[selected.status]}`}>
                        DENIED - Request rejected
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <ConfirmationCard isOpen={confirmationState.isOpen} onClose={closeConfirmation} onConfirm={confirmationState.onConfirm}
          title={confirmationState.options.title} message={confirmationState.options.message}
          type={confirmationState.options.type} confirmText={confirmationState.options.confirmText} cancelText={confirmationState.options.cancelText} />
        <NotificationCard isOpen={notificationState.isOpen} onClose={closeNotification}
          title={notificationState.options.title} message={notificationState.options.message}
          type={notificationState.options.type} autoClose={notificationState.options.autoClose} duration={notificationState.options.duration} />
      </div>
    </ProtectedRoute>
  )
}

function MetricCard({
  icon,
  label,
  value,
  subtext,
  color = "gray",
  isAlert = false
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtext?: string
  color?: "gold" | "red" | "gray" | "green" | "blue" | "purple"
  isAlert?: boolean
}) {
  const colorClasses = {
    gold: "bg-[#1a1712] text-[#d4af37] border-[#d4af37]/20",
    red: "bg-[#1a0f0f] text-red-400 border-red-900/50",
    gray: "bg-[#1a1c1b] text-gray-400 border-white/10",
    green: "bg-[#1a1c1b] text-gray-400 border-white/10",
    blue: "bg-[#1a1c1b] text-gray-400 border-white/10",
    purple: "bg-[#1a1c1b] text-gray-400 border-white/10"
  }

  const selectedColorClass = isAlert ? colorClasses.red : (colorClasses[color as keyof typeof colorClasses] || colorClasses.gray)

  return (
    <Card className={`border bg-[#151716] shadow-xl ${isAlert ? 'border-red-900/50' : 'border-white/10'}`}>
      <CardContent className="p-6">
        <div className={`inline-flex p-3 rounded-lg ${selectedColorClass} mb-4 border`}>
          {icon}
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">{label}</p>
          <p className="text-3xl font-playfair italic text-[#f3cf7a] leading-tight">{value}</p>
          {subtext && <p className="text-xs text-gray-500 font-light pt-1">{subtext}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

  const handleExtendDate = async (id: string) => {
    if (!extendDate) {
      notify({ title: "Error", message: "Please select a new checkout date", type: "error" })
      return
    }
    
    const confirmed = await confirm({
      title: "Extend Stay",
      message: `Extend checkout date to ${extendDate}?`,
      type: "success",
      confirmText: "Extend",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    
    setActioning(true)
    try {
      const res = await fetch(`/api/reception-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ checkOut: extendDate }),
      })
      if (res.ok) {
        notify({ title: "Success", message: "Stay extended successfully", type: "success" })
        setExtendDate("")
        fetchRequests()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to extend", type: "error" })
      }
    } catch { notify({ title: "Error", message: "Network error", type: "error" }) }
    setActioning(false)
  }
