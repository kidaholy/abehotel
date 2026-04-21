"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
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
  CheckCircle2, XCircle, Clock, Banknote, Eye, X, Search, Smartphone, Link2, AlertTriangle
} from "lucide-react"

const STATUS_STYLES: Record<string, string> = {
  CHECKIN_PENDING:  "bg-yellow-900/30 text-yellow-400 border-yellow-500/30",
  CHECKIN_APPROVED: "bg-blue-900/30 text-blue-400 border-blue-500/30",
  ACTIVE:           "bg-emerald-900/30 text-emerald-400 border-emerald-500/30",
  CHECKOUT_PENDING: "bg-orange-900/30 text-orange-400 border-orange-500/30",
  CHECKOUT_APPROVED: "bg-purple-900/30 text-purple-400 border-purple-500/30",
  CHECKED_OUT:      "bg-gray-800/50 text-gray-500 border-gray-700/50",
  REJECTED:         "bg-red-900/30 text-red-400 border-red-500/30",
  // Legacy
  pending:          "bg-yellow-900/30 text-yellow-400 border-yellow-500/30",
  guests:           "bg-emerald-900/30 text-emerald-400 border-emerald-500/30",
  rejected:         "bg-red-900/30 text-red-400 border-red-500/30",
  check_in:         "bg-blue-900/30 text-blue-400 border-blue-500/30",
  check_out:        "bg-purple-900/30 text-purple-400 border-purple-500/30",
}

const STATUS_LABELS: Record<string, string> = {
  CHECKIN_PENDING:  "CHECK-IN PENDING",
  CHECKIN_APPROVED: "CHECK-IN APPROVED",
  ACTIVE:           "CHECKED IN",
  CHECKOUT_PENDING: "CHECKOUT PENDING",
  CHECKOUT_APPROVED: "CHECKOUT APPROVED",
  CHECKED_OUT:      "CHECKED OUT",
  REJECTED:         "REJECTED",
  // Legacy
  pending:          "PENDING",
  guests:           "CHECKED IN",
  rejected:         "REJECTED",
  check_in:         "CHECK-IN APPROVED",
  check_out:        "CHECKED OUT",
}

const FILTER_LABELS: Record<string, { label: string; icon: any }> = {
  all:       { label: "ALL",      icon: <Users size={14} /> },
  pending:   { label: "PENDING",  icon: <Clock size={14} /> },
  check_in:  { label: "CHECKED IN", icon: <Hotel size={14} /> },
  guests:    { label: "STAYING",  icon: <Hotel size={14} /> }, // legacy alias
  check_out: { label: "DEPARTED", icon: <DoorOpen size={14} /> },
  rejected:  { label: "DENIED",   icon: <XCircle size={14} /> },
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
  const [selectedCheckOut, setSelectedCheckOut] = useState<string>("")
  const [globalOverdueCount, setGlobalOverdueCount] = useState(0)
  const [fetchingFull, setFetchingFull] = useState<string | null>(null)
  
  const [extendGuest, setExtendGuest] = useState<any | null>(null)
  const [newCheckOut, setNewCheckOut] = useState("")
  const [extending, setExtending] = useState(false)

  // Optimized fetch with pagination
  const fetchRequests = useCallback(async (filterOverride?: keyof typeof FILTER_LABELS, skipLoading = false) => {
    try {
      if (!skipLoading) setLoading(true)
      const activeFilter = filterOverride !== undefined ? filterOverride : filter
      const statusParam = activeFilter !== "all" ? `&status=${activeFilter}` : ""
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""
      const url = `/api/reception-requests?limit=100${statusParam}${searchParam}`
      
      const res = await fetch(url, { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      if (res.ok) {
        const data = await res.json()
        setRequests(data.data || [])
        setGlobalOverdueCount(data.overdueCount || 0)
      }
    } catch (error) {
      console.error(`❌ [ADMIN] Fetch error:`, error)
    }
    finally { if (!skipLoading) setLoading(false) }
  }, [token, filter, searchQuery])

  useEffect(() => {
    if (token) fetchRequests()
    const interval = setInterval(() => fetchRequests(undefined, true), 30000)
    return () => clearInterval(interval)
  }, [token, filter, searchQuery, fetchRequests])

  // Refresh when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchRequests(undefined, true)
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchRequests])

  const handleAction = useCallback(async (id: string, status: string, extraData?: any) => {
    const label =
      status === "CHECKIN_APPROVED" ? "Approve Arrival"
      : status === "CHECKED_OUT" ? "Approve Check-Out"
      : status === "CHECKIN_APPROVED_DENY_CHECKOUT" ? "Deny Check-Out"
      : status === "REJECTED" ? "Reject"
      : "Apply"
    const confirmed = await confirm({
      title: `${label} Request`,
      message: `Are you sure you want to proceed?`,
      type: (status === "REJECTED" || status === "CHECKIN_APPROVED_DENY_CHECKOUT") ? "danger" : "success",
      confirmText: label,
      cancelText: "Cancel",
    })
    if (!confirmed) return
    
    setActioning(true)
    try {
      const request = requests.find(r => r._id === id)
      if (!request) return

      // Canonical statuses only.
      // Special sentinel: CHECKIN_APPROVED_DENY_CHECKOUT means deny checkout and return guest to checked-in.
      let targetStatus = status
      if (status === "pending") targetStatus = request.inquiryType === "check_out" ? "CHECKOUT_PENDING" : "CHECKIN_PENDING"
      if (status === "CHECKIN_APPROVED_DENY_CHECKOUT") targetStatus = "CHECKIN_APPROVED"

      // Optimistic update
      const updatedRequest = { ...request, status: targetStatus, reviewNote: reviewNote || request.reviewNote, ...extraData }
      setRequests(prev => prev.map(r => r._id === id ? updatedRequest : r))
      
      setSelected(null)
      setReviewNote("")
      
      const res = await fetch(`/api/reception-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: targetStatus, reviewNote, ...extraData }),
      })
      
      if (res.ok) {
        notify({ title: "Success", message: "Request updated successfully", type: "success" })
        
        let newFilter: keyof typeof FILTER_LABELS = "all"
        if (["CHECKIN_APPROVED", "check_in", "ACTIVE", "guests"].includes(targetStatus)) newFilter = "check_in"
        else if (["CHECKED_OUT", "CHECKOUT_APPROVED", "check_out"].includes(targetStatus)) newFilter = "check_out"
        else if (["REJECTED", "rejected"].includes(targetStatus)) newFilter = "rejected"
        else if (["CHECKIN_PENDING", "CHECKOUT_PENDING", "pending"].includes(targetStatus)) newFilter = "pending"
        
        setFilter(newFilter)
        fetchRequests(newFilter, true)
      } else {
        // Rollback
        setRequests(prev => prev.map(r => r._id === id ? request : r))
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to update", type: "error" })
      }
    } catch (error) {
      notify({ title: "Error", message: "Network error", type: "error" })
    }
    setActioning(false)
  }, [token, confirm, notify, fetchRequests, requests, reviewNote])

  const handleExtend = useCallback(async () => {
    if (!extendGuest || !newCheckOut) return
    setExtending(true)
    
    const originalGuest = { ...extendGuest }
    setRequests(prev => prev.map(r => r._id === extendGuest._id ? { ...r, status: "CHECKOUT_PENDING", reviewNote: `Extension requested: new check-out ${newCheckOut}`, checkOut: newCheckOut } : r))
    
    setExtendGuest(null)
    setNewCheckOut("")
    
    try {
      const res = await fetch(`/api/reception-requests/${extendGuest._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: "CHECKOUT_PENDING",
          reviewNote: `Extension requested: new check-out ${newCheckOut}`,
          checkOut: newCheckOut,
        }),
      })
      if (res.ok) {
        notify({ title: "Extension Requested", message: `New check-out date ${newCheckOut} sent for approval.`, type: "success" })
        fetchRequests(filter, true)
      } else {
        setRequests(prev => prev.map(r => r._id === originalGuest._id ? originalGuest : r))
      }
    } catch { 
      setRequests(prev => prev.map(r => r._id === originalGuest._id ? originalGuest : r))
    }
    setExtending(false)
  }, [extendGuest, newCheckOut, token, notify, fetchRequests, filter])

  const filteredRequests = useMemo(() => requests, [requests])

  const counts: Record<string, number> = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter(r => ["CHECKIN_PENDING", "CHECKOUT_PENDING", "pending"].includes(r.status)).length,
      check_in: requests.filter(r => ["CHECKIN_APPROVED", "check_in", "ACTIVE", "guests"].includes(r.status)).length,
      guests: requests.filter(r => ["CHECKIN_APPROVED", "check_in", "ACTIVE", "guests"].includes(r.status)).length,
      rejected: requests.filter(r => ["REJECTED", "rejected"].includes(r.status)).length,
      check_out: requests.filter(r => ["CHECKED_OUT", "CHECKOUT_APPROVED", "check_out"].includes(r.status)).length,
    }
  }, [requests])

  return (
    <ProtectedRoute requiredRoles={["admin"]} requiredPermissions={["reception:access"]}>
      <div className="min-h-screen bg-[#0f1110] p-6 text-white selection:bg-[#d4af37] selection:text-[#0f1110]">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />
          
          {globalOverdueCount > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-500">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-red-500/20 rounded-lg animate-pulse">
                   <AlertTriangle className="h-5 w-5 text-red-500" />
                 </div>
                 <div>
                   <h2 className="text-red-500 font-black uppercase tracking-widest text-[11px] leading-tight">⚠ Overdue Alert</h2>
                   <p className="text-red-400/70 text-[9px] font-bold uppercase tracking-tight">
                     {globalOverdueCount} guest(s) past checkout - Please check STAYING tab
                   </p>
                 </div>
               </div>
               <button onClick={() => setFilter("guests")} 
                 className="bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/30 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
                 Review All Overdue
               </button>
            </div>
          )}

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
            <button onClick={() => fetchRequests()} disabled={loading} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all disabled:opacity-30">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

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
                  <div className="flex flex-row overflow-x-auto gap-4 pb-10 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-[#d4af37]/20 scrollbar-track-transparent">
                    {filteredRequests.map(r => (
                      <div key={r._id} className="bg-[#151716] rounded-xl border border-white/5 hover:border-white/10 transition-all flex flex-col group relative overflow-hidden shadow-2xl min-w-[380px] w-[380px] flex-shrink-0 snap-start">
                        <div className={`absolute top-0 left-0 right-0 h-1 z-10 opacity-40 transition-opacity group-hover:opacity-100 ${
                          (r.status === 'CHECKIN_APPROVED' || r.status === 'check_in') ? 'bg-blue-500' : 
                          (r.status === 'REJECTED' || r.status === 'rejected') ? 'bg-red-500' : 
                          (r.status === 'ACTIVE' || r.status === 'guests') ? 'bg-emerald-500' : 
                          (r.status === 'CHECKOUT_APPROVED' || r.status === 'CHECKED_OUT' || r.status === 'check_out') ? 'bg-purple-500' : 'bg-yellow-500'
                        }`} />
                        
                        <div className="w-full h-40 min-h-[160px] flex-shrink-0 relative bg-[#0f1110] border-b border-white/5 overflow-hidden">
                           {(r.photoUrl || r.idPhotoFront) ? (
                             <img src={r.photoUrl || r.idPhotoFront} alt={r.guestName} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center opacity-10">
                               <Users size={64} className="text-[#d4af37]" />
                             </div>
                           )}
                           <div className="absolute inset-0 bg-gradient-to-t from-[#151716] via-transparent to-transparent" />
                        </div>

                        <div className="relative h-6 w-full px-5">
                          <div className="absolute -top-10 left-5 w-20 h-20 rounded-2xl border-4 border-[#151716] bg-[#1a1c1b] overflow-hidden shadow-2xl z-20">
                            {r.photoUrl ? (
                              <img src={r.photoUrl} alt={r.guestName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Users size={32} className="text-gray-700" />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="p-5 flex flex-col gap-4 mt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-white text-lg tracking-tight leading-none">{r.guestName}</span>
                              <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Guest Profile</span>
                            </div>
                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase border shadow-sm ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                              {STATUS_LABELS[r.status] || r.status.toUpperCase()}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                             <span className="text-[8px] font-black px-3 py-1 bg-[#1a1c1b] text-gray-500 rounded border border-white/5 uppercase tracking-widest">
                               {r.inquiryType.replace("_", "-").toUpperCase()}
                             </span>
                             {(r.status === "ACTIVE" || r.status === "guests") && (() => {
                               if (!r.checkOut) return null;
                               const today = new Date(); today.setHours(0, 0, 0, 0);
                               const checkOut = new Date(r.checkOut); checkOut.setHours(0, 0, 0, 0);
                               const diffDays = Math.floor((today.getTime() - checkOut.getTime()) / (1000 * 60 * 60 * 24));
                               if (diffDays > 0) return (
                                 <div className="flex flex-col items-start bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded animate-pulse">
                                   <div className="flex items-center gap-1.5 text-red-500 text-[10px] font-black uppercase tracking-tighter">
                                      <AlertTriangle size={12} /><span>Overdue</span>
                                   </div>
                                    <p className="text-red-400/80 text-[8px] font-bold tracking-tight uppercase">{diffDays} day(s) past</p>
                                 </div>
                               )
                               return null
                             })()}
                          </div>

                          <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-gray-400 font-bold">
                              <div className="flex items-center gap-1.5"><IdCard size={12} /><span>{r.faydaId || "No ID"}</span></div>
                              <div className="flex items-center gap-1.5"><Phone size={12} /><span>{r.phone || "No Phone"}</span></div>
                              <div className="flex items-center gap-1.5"><DoorOpen size={12} /><span>Room {r.roomNumber || "--"}</span></div>
                              <div className="flex items-center gap-1.5 font-black text-[#f3cf7a]"><Banknote size={12} /><span>{r.roomPrice?.toLocaleString()} ETB</span></div>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-gray-500 font-bold">
                              <div className="flex items-center gap-1.5"><Users size={12} /><span>{r.guests || 1} guests</span></div>
                              <div className="flex items-center gap-1.5"><Calendar size={12} /><span>{r.checkIn} → {r.checkOut || "???"}</span></div>
                            </div>
                          </div>

                          {(r.paymentReference || r.transactionUrl) && (
                            <div className="flex items-center justify-between gap-2">
                               {r.paymentReference && <p className="text-[11px] font-black text-[#d4af37]">Ref #{r.paymentReference}</p>}
                               {r.transactionUrl && <a href={r.transactionUrl} target="_blank" rel="noopener noreferrer" className="text-[9px] font-black text-blue-400 underline flex items-center gap-1"><Link2 size={10} /> View Receipt</a>}
                            </div>
                          )}

                          {r.reviewNote && (
                            <div className="bg-[#0f1110]/50 rounded-xl p-4 border border-white/5">
                              <p className="text-[11px] text-gray-400 italic">"{r.reviewNote}"</p>
                            </div>
                          )}

                          <div className="mt-auto space-y-4 pt-2">
                             <button 
                               onClick={async () => { 
                                 setFetchingFull(r._id);
                                 try {
                                   const res = await fetch(`/api/reception-requests/${r._id}`, { 
                                     headers: { Authorization: `Bearer ${token}` } 
                                   });
                                   if (res.ok) {
                                     const full = await res.json();
                                     setSelected(full); 
                                     setReviewNote(full.reviewNote || ""); 
                                     setSelectedCheckOut(full.checkOut || "");
                                   } else {
                                     setSelected(r); 
                                     setReviewNote(r.reviewNote || ""); 
                                     setSelectedCheckOut(r.checkOut || "");
                                   }
                                 } catch {
                                   setSelected(r); 
                                   setReviewNote(r.reviewNote || ""); 
                                   setSelectedCheckOut(r.checkOut || "");
                                 } finally {
                                   setFetchingFull(null);
                                 }
                               }}
                               disabled={actioning || fetchingFull === r._id}
                               className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-[#1a1c1b] border border-white/5 hover:border-[#d4af37]/30 text-[#f3cf7a]">
                               {actioning || fetchingFull === r._id ? <RefreshCw size={16} className="animate-spin" /> : <Eye size={16} />}
                               {actioning ? 'Processing...' : fetchingFull === r._id ? 'Loading Photos...' : 'REVIEW'}
                             </button>

                             {/* Quick actions for pending approvals */}
                             {["CHECKIN_PENDING", "CHECKOUT_PENDING", "EXTEND_PENDING", "pending"].includes(r.status) && (
                               <div className="grid grid-cols-2 gap-2">
                                 <button
                                   onClick={() =>
                                     handleAction(
                                       r._id,
                                       r.status === "EXTEND_PENDING"
                                         ? "CHECKIN_APPROVED"
                                         : r.inquiryType === "check_out"
                                           ? "CHECKED_OUT"
                                           : "CHECKIN_APPROVED",
                                       r.inquiryType === "check_out" ? { checkOut: r.checkOut } : {}
                                     )
                                   }
                                   disabled={actioning}
                                   className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/30"
                                 >
                                   {actioning ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                                   Approve
                                 </button>

                                 <button
                                   onClick={() =>
                                     handleAction(
                                       r._id,
                                       r.status === "EXTEND_PENDING"
                                         ? "CHECKIN_APPROVED"
                                         : r.inquiryType === "check_out"
                                           ? "CHECKIN_APPROVED_DENY_CHECKOUT"
                                           : "REJECTED"
                                     )
                                   }
                                   disabled={actioning}
                                   className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-900/20 border border-red-500/20 text-red-400 hover:bg-red-900/30"
                                 >
                                   {actioning ? <RefreshCw size={11} className="animate-spin" /> : <XCircle size={11} />}
                                   Deny
                                 </button>
                               </div>
                             )}

                             {(r.status === "CHECKIN_APPROVED" || r.status === "check_in" || r.status === "ACTIVE" || r.status === "guests") && (
                               <div className="flex gap-2">
                                 <button onClick={() => {
                                   const todayData = new Date();
                                   const todayStr = `${todayData.getFullYear()}-${String(todayData.getMonth() + 1).padStart(2, '0')}-${String(todayData.getDate()).padStart(2, '0')}`;
                                   handleAction(r._id, "CHECKOUT_PENDING", { inquiryType: "check_out", checkOut: todayStr });
                                 }}
                                   disabled={actioning}
                                   className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-900/10 border border-red-500/20 text-red-400 hover:bg-red-900/20">
                                   {actioning ? <RefreshCw size={11} className="animate-spin" /> : <Key size={11} />}
                                   {actioning ? 'Processing...' : 'Check Out'}
                                 </button>
                                 <button onClick={() => { setExtendGuest(r); setNewCheckOut(r.checkOut || "") }}
                                   disabled={actioning}
                                   className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#f3cf7a] hover:bg-[#d4af37]/20">
                                   {actioning ? <RefreshCw size={11} className="animate-spin" /> : <Calendar size={11} />}
                                   {actioning ? 'Processing...' : 'Extend'}
                                 </button>
                               </div>
                             )}
                          </div>
                          <p className="text-[9px] text-gray-700 font-bold uppercase tracking-widest mt-1">
                            {new Date(r.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 overflow-hidden"
            onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
            <div className="bg-[#151716] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative p-8 space-y-8 animate-in zoom-in-95 duration-200">
              <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white bg-[#0f1110] p-1.5 rounded-lg border border-white/10"><X size={18} /></button>
              <div className="space-y-2 border-l-4 border-[#d4af37] pl-4">
                <h2 className="text-2xl font-playfair italic font-bold text-[#f3cf7a]">{selected.guestName}</h2>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase border ${STATUS_STYLES[selected.status] || STATUS_STYLES.pending}`}>{STATUS_LABELS[selected.status] || selected.status}</span>
                  <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest opacity-50">{selected.inquiryType.replace("_", " ")}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Phone", value: selected.phone || "—" },
                  { label: "Fayda ID", value: selected.faydaId || "—" },
                  { label: "Room", value: `Room #${selected.roomNumber || "—"}` },
                  { label: "Price", value: `${selected.roomPrice?.toLocaleString()} ETB` },
                  { 
                    label: "Nights", 
                    value: (() => {
                      const checkOutDate = selectedCheckOut || selected.checkOut;
                      if (!selected.checkIn || !checkOutDate) return "1";
                      return Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(selected.checkIn).getTime()) / (1000 * 60 * 60 * 24))).toString();
                    })()
                  },
                  { 
                    label: "Total Amount", 
                    value: (() => {
                      const roomPrice = Number(selected.roomPrice) || 0;
                      const checkOutDate = selectedCheckOut || selected.checkOut;
                      if (!selected.checkIn || !checkOutDate) return `${roomPrice.toLocaleString()} ETB`;
                      const nights = Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(selected.checkIn).getTime()) / (1000 * 60 * 60 * 24)));
                      return `${(roomPrice * nights).toLocaleString()} ETB`;
                    })()
                  },
                ].map((item: any, idx) => (
                  <div key={idx} className="bg-[#0f1110] p-4 rounded-xl border border-white/5 space-y-1 shadow-inner">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">{item.label}</p>
                    <p className="text-white font-bold text-sm tracking-tight">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* ID Photos Review Section */}
              {(selected.idPhotoFront || selected.idPhotoBack) && (
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4af37] border-b border-white/5 pb-2">Uploaded Identity Documents</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selected.idPhotoFront && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">ID Front Side</p>
                        <div className="relative group rounded-xl overflow-hidden border border-white/10 aspect-video bg-black/40">
                          <img src={selected.idPhotoFront} alt="ID Front" className="w-full h-full object-contain" />
                          <button 
                            onClick={() => window.open(selected.idPhotoFront, '_blank')}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white border border-white/20 px-4 py-2 rounded-lg">View Full Resolution</span>
                          </button>
                        </div>
                      </div>
                    )}
                    {selected.idPhotoBack && (
                      <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">ID Back Side</p>
                        <div className="relative group rounded-xl overflow-hidden border border-white/10 aspect-video bg-black/40">
                          <img src={selected.idPhotoBack} alt="ID Back" className="w-full h-full object-contain" />
                          <button 
                            onClick={() => window.open(selected.idPhotoBack, '_blank')}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white border border-white/20 px-4 py-2 rounded-lg">View Full Resolution</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2.5">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-[#d4af37]">Internal Feedback Note</label>
                  <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={3}
                    placeholder="Add instructions or feedback..."
                    className="w-full bg-[#0f1110] border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-[#d4af37]/30 resize-none shadow-inner" />
                </div>

                {/* Actions intentionally removed from modal: approvals happen on cards */}
              </div>
            </div>
          </div>
        )}

        {extendGuest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 overflow-hidden"
            onClick={e => { if (e.target === e.currentTarget) setExtendGuest(null) }}>
            <div className="bg-[#151716] border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-8 space-y-6 relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setExtendGuest(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white bg-[#0f1110] p-1.5 rounded-lg border border-white/10"><X size={18} /></button>
              <div className="space-y-2 border-l-4 border-[#d4af37] pl-4">
                <h2 className="text-xl font-playfair italic font-bold text-[#f3cf7a]">Extend Stay</h2>
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
                    <PopoverContent className="w-auto p-0 bg-[#0f1110] border-white/10" align="center">
                      <CalendarPicker mode="single" selected={newCheckOut ? new Date(newCheckOut) : undefined} onSelect={d => d && setNewCheckOut(format(d, "yyyy-MM-dd"))} disabled={d => d < new Date(extendGuest.checkOut)} initialFocus className="bg-[#0f1110] text-white" />
                    </PopoverContent>
                  </Popover>
                </div>

                <button onClick={handleExtend} disabled={extending || !newCheckOut}
                  className="w-full py-4 rounded-xl text-[11px] font-black uppercase tracking-widest bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] flex items-center justify-center gap-2 shadow-xl disabled:opacity-50">
                  {extending ? <RefreshCw className="animate-spin" size={14} /> : <Calendar size={14} />}
                  {extending ? 'Processing...' : 'Request Extension'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
