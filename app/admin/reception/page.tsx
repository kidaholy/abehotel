"use client"

import { useState, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { format } from "date-fns"
import {
  RefreshCw, ConciergeBell, Hotel, Key, Utensils, Megaphone,
  Calendar, MessageSquare, DoorOpen, Users, Phone, IdCard,
  CheckCircle2, XCircle, Clock, Banknote, Eye, X, Search
} from "lucide-react"

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-900/30 text-yellow-400 border-yellow-500/30",
  guests:    "bg-emerald-900/30 text-emerald-400 border-emerald-500/30",
  rejected:  "bg-red-900/30 text-red-400 border-red-500/30",
  check_in:  "bg-blue-900/30 text-blue-400 border-blue-500/30",
  check_out: "bg-purple-900/30 text-purple-400 border-purple-500/30",
}

const FILTER_LABELS: Record<string, { label: string; icon: any }> = {
  all:       { label: "GUESTS",   icon: <Users size={14} /> },
  pending:   { label: "PENDING",  icon: <Clock size={14} /> },
  check_in:  { label: "APPROVED", icon: <CheckCircle2 size={14} /> },
  rejected:  { label: "DENIED",   icon: <XCircle size={14} /> },
  check_out: { label: "CHECK OUT", icon: <Key size={14} /> },
}

export default function AdminReceptionPage() {
  const { token } = useAuth()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<keyof typeof FILTER_LABELS>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selected, setSelected] = useState<any | null>(null)
  const [reviewNote, setReviewNote] = useState("")
  const [actioning, setActioning] = useState(false)
  
  const [extendGuest, setExtendGuest] = useState<any | null>(null)
  const [newCheckOut, setNewCheckOut] = useState("")
  const [extending, setExtending] = useState(false)

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/reception-requests", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setRequests(await res.json())
    } catch { /* silent */ }
    finally { setLoading(false) }
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

  const handleExtend = async () => {
    if (!extendGuest || !newCheckOut) return
    setExtending(true)
    try {
      const res = await fetch(`/api/reception-requests/${extendGuest._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: "pending",
          inquiryType: "check_out",
          reviewNote: `Extension requested: new check-out ${newCheckOut}`,
          checkOut: newCheckOut,
        }),
      })
      if (res.ok) {
        notify({ title: "Extension Requested", message: `New check-out date ${newCheckOut} sent for approval.`, type: "success" })
        setExtendGuest(null)
        setNewCheckOut("")
        fetchRequests()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed", type: "error" })
      }
    } catch { notify({ title: "Error", message: "Network error", type: "error" }) }
    setExtending(false)
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
    pending: searchFiltered.filter(r => r.status === "pending").length,
    check_in: searchFiltered.filter(r => r.status === "check_in").length,
    rejected: searchFiltered.filter(r => r.status === "rejected").length,
    check_out: searchFiltered.filter(r => r.status === "check_out").length,
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
                <ConciergeBell className="h-7 w-7 text-[#d4af37]" />
              </div>
              <div>
                <h1 className="text-2xl font-playfair italic font-bold text-[#f3cf7a]">Reception Desk</h1>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-0.5">Global Guest Management Overlook</p>
              </div>
            </div>
            <button onClick={fetchRequests} disabled={loading} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all disabled:opacity-30">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
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

          {/* List Section */}
          <div className="min-h-[400px]">
            {loading ? (
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
                              {r.inquiryType === "check_out" ? <Key size={14} /> : <Hotel size={14} />}
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
                             r.status === "check_in" ? "APPROVED" : 
                             r.status === "rejected" ? "DENIED" : 
                             r.status === "guests" ? "ACTIVE GUEST" : 
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
                            <Calendar size={10} />
                            <span>{r.checkIn} → {r.checkOut || "???"}</span>
                          </div>
                        </div>

                        {r.reviewNote && (
                          <div className="text-[10px] text-blue-400 bg-blue-900/10 rounded-lg p-3 border border-blue-500/10 font-bold italic">
                            " {r.reviewNote} "
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5 gap-2">
                          <div className="flex gap-2">
                            {r.status === "guests" && (
                              <>
                                <button onClick={() => handleAction(r._id, "pending")}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/20 border border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-900/30 transition-all shadow-sm">
                                  <Key size={12} /> Check Out
                                </button>
                                <button onClick={() => { setExtendGuest(r); setNewCheckOut(r.checkOut || "") }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-lg text-[9px] font-black uppercase tracking-widest text-[#f3cf7a] hover:bg-[#d4af37]/20 transition-all shadow-sm">
                                  <Calendar size={12} /> Extend
                                </button>
                              </>
                            )}
                            {r.status === "pending" && (
                               <button onClick={() => setSelected(r)}
                                 className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm hover:opacity-90 transition-all">
                                 {r.inquiryType === "check_out" ? <Key size={12} /> : <CheckCircle2 size={12} />}
                                 Review Request
                               </button>
                            )}
                          </div>
                          <button onClick={() => { setSelected(r); setReviewNote(r.reviewNote || "") }}
                            className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1c1b] rounded-lg border border-white/5 hover:border-[#d4af37]/30 transition-all shadow-sm ml-auto">
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
        </div>

        {/* Detail Sidebar/Modal Overlay */}
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
                  <div className="pt-2">
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
                    
                    {!["pending"].includes(selected.status) && (
                      <div className={`py-5 rounded-xl border text-center text-[11px] font-black uppercase tracking-widest shadow-inner ${STATUS_STYLES[selected.status] || STATUS_STYLES.pending}`}>
                        {selected.status.replace("_", " ").toUpperCase()} - Finalized Process
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Extend Stay Modal */}
        {extendGuest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 overflow-hidden"
            onClick={e => { if (e.target === e.currentTarget) setExtendGuest(null) }}>
            <div className="bg-[#151716] border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-8 space-y-6 relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setExtendGuest(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors bg-[#0f1110] p-1.5 rounded-lg border border-white/10">
                <X size={18} />
              </button>

              <div className="space-y-2 border-l-4 border-[#d4af37] pl-4">
                <h2 className="text-xl font-playfair italic font-bold text-[#f3cf7a] leading-none">Extend Stay</h2>
                <p className="text-gray-500 text-[9px] uppercase font-bold tracking-widest">{extendGuest.guestName}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2.5">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-[#d4af37]">New Check-Out Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full bg-[#0f1110] border border-white/10 text-white rounded-xl px-4 py-4 text-sm font-bold flex items-center justify-between hover:border-[#d4af37]/30 transition-all shadow-inner">
                        {newCheckOut ? format(new Date(newCheckOut), "PPP") : <span className="text-gray-600">Select Date</span>}
                        <Calendar className="h-4 w-4 text-[#d4af37]" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-[#0f1110] border-white/10" align="start">
                      <CalendarPicker mode="single" selected={newCheckOut ? new Date(newCheckOut) : undefined}
                        onSelect={d => { if (d) setNewCheckOut(format(d, "yyyy-MM-dd")) }}
                        disabled={d => d < new Date(extendGuest.checkOut || Date.now())}
                        initialFocus className="bg-[#0f1110] text-white" />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="pt-4 flex gap-3">
                  <button onClick={() => setExtendGuest(null)}
                    className="flex-1 py-4 bg-[#1a1c1b] border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:border-white/10 transition-all">
                    Cancel
                  </button>
                  <button onClick={handleExtend} disabled={extending || !newCheckOut}
                    className="flex-[2] py-4 bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:shadow-[#d4af37]/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                    {extending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calendar size={16} />}
                    Confirm Extension
                  </button>
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
