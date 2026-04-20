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
  CheckCircle2, XCircle, Clock, Banknote, Eye, X, Search, Smartphone, Link2
} from "lucide-react"

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-900/30 text-yellow-400 border-yellow-500/30",
  guests:    "bg-emerald-900/30 text-emerald-400 border-emerald-500/30",
  rejected:  "bg-red-900/30 text-red-400 border-red-500/30",
  check_in:  "bg-blue-900/30 text-blue-400 border-blue-500/30",
  check_out: "bg-purple-900/30 text-purple-400 border-purple-500/30",
}

const FILTER_LABELS: Record<string, { label: string; icon: any }> = {
  all:       { label: "ALL",      icon: <Users size={14} /> },
  pending:   { label: "PENDING",  icon: <Clock size={14} /> },
  check_in:  { label: "CHECK IN", icon: <CheckCircle2 size={14} /> },
  guests:    { label: "ACTIVE",   icon: <Hotel size={14} /> },
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

  // Optimized fetch with pagination - accepts optional filter parameter
  const fetchRequests = useCallback(async (filterOverride?: keyof typeof FILTER_LABELS, skipLoading = false) => {
    try {
      if (!skipLoading) setLoading(true)
      const activeFilter = filterOverride !== undefined ? filterOverride : filter
      const statusParam = activeFilter !== "all" ? `&status=${activeFilter}` : ""
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""
      const url = `/api/reception-requests?limit=100${statusParam}${searchParam}`
      console.log(`📡 [ADMIN] Fetching requests with URL: ${url}`)
      const res = await fetch(url, { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      if (res.ok) {
        const data = await res.json()
        console.log(`📡 [ADMIN] Received ${data.data?.length || 0} requests, total: ${data.total}`)
        setRequests(data.data || [])
      } else {
        console.error(`❌ [ADMIN] API error:`, res.status)
      }
    } catch (error) {
      console.error(`❌ [ADMIN] Fetch error:`, error)
    }
    finally { if (!skipLoading) setLoading(false) }
  }, [token, filter, searchQuery])

  // Auto-refresh every 30 seconds (like cashier)
  useEffect(() => {
    if (token) {
      console.log(`🔄 [ADMIN] useEffect triggered, fetching with filter: ${filter}`)
      fetchRequests()
    }
    const interval = setInterval(() => {
      console.log(`🔄 [ADMIN] Auto-refresh interval triggered`)
      fetchRequests()
    }, 30000)
    return () => clearInterval(interval)
  }, [token, filter, searchQuery])

  // Refresh when tab becomes active
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) fetchRequests()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchRequests])

  const handleAction = useCallback(async (id: string, status: string) => {
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
      // Get the selected request to verify inquiryType
      const request = requests.find(r => r._id === id)
      if (!request) {
        console.error(`❌ [ADMIN] Request not found in local state: ${id}`)
        notify({ title: "Error", message: "Request not found", type: "error" })
        return
      }

      console.log(`📤 [ADMIN] =========================================`)
      console.log(`📤 [ADMIN] APPROVAL OPERATION STARTED`)
      console.log(`📤 [ADMIN] Request ID: ${id}`)
      console.log(`📤 [ADMIN] Guest Name: ${request.guestName}`)
      console.log(`📤 [ADMIN] Inquiry Type: ${request.inquiryType}`)
      console.log(`📤 [ADMIN] Current Status: ${request.status}`)
      console.log(`📤 [ADMIN] Requested Status: ${status}`)
      console.log(`📤 [ADMIN] Status type: ${status === "check_out" ? "CHECK-OUT" : status === "check_in" ? "CHECK-IN" : status === "guests" ? "COMPLETE CHECK-IN" : "OTHER"}`)
      console.log(`📤 [ADMIN] =========================================`)
      
      // FRONTEND VALIDATION: Ensure inquiryType matches the status being set
      if (request.inquiryType === "check_out" && status === "check_in") {
        console.error(`❌ [ADMIN] CRITICAL VALIDATION ERROR: Check-out request cannot be approved as check-in!`)
        console.error(`❌ [ADMIN] This is a BUG - please report to development team`)
        notify({ 
          title: "Validation Error", 
          message: "Cannot approve check-out request as check-in. This is a system error.", 
          type: "error" 
        })
        setActioning(false)
        return
      }
      
      if (request.inquiryType === "check_in" && status === "check_out") {
        console.error(`❌ [ADMIN] CRITICAL VALIDATION ERROR: Check-in request cannot be approved as check-out!`)
        console.error(`❌ [ADMIN] This is a BUG - please report to development team`)
        notify({ 
          title: "Validation Error", 
          message: "Cannot approve check-in request as check-out. This is a system error.", 
          type: "error" 
        })
        setActioning(false)
        return
      }
      
      console.log(`✅ [ADMIN] Frontend validation passed: inquiryType=${request.inquiryType}, status=${status}`)
      console.log(`✅ [ADMIN] Sending API request with status: ${status}`)
      
      // OPTIMISTIC UPDATE: Update local state immediately for instant UI feedback
      const updatedRequest = { ...request, status, reviewNote: reviewNote || request.reviewNote }
      setRequests(prev => prev.map(r => r._id === id ? updatedRequest : r))
      console.log(`⚡ [ADMIN] Optimistic UI update applied - status changed to: ${status}`)
      
      // Close modal immediately for better UX
      setSelected(null)
      setReviewNote("")
      
      const res = await fetch(`/api/reception-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, reviewNote }),
      })
      if (res.ok) {
        const data = await res.json()
        console.log(`✅ [ADMIN] =========================================`)
        console.log(`✅ [ADMIN] APPROVAL SUCCESSFUL`)
        console.log(`✅ [ADMIN] Request status updated to: ${status}`)
        console.log(`✅ [ADMIN] Confirmed status in response: ${data.request?.status}`)
        console.log(`✅ [ADMIN] Response inquiryType: ${data.request?.inquiryType}`)
        console.log(`✅ [ADMIN] =========================================`)
        
        notify({ title: "Success", message: "Request updated successfully", type: "success" })
        
        // CRITICAL: Determine the new filter based on the inquiryType and status
        // This ensures check_out requests ALWAYS go to CHECK OUT tab, NEVER to CHECK IN tab
        let newFilter: keyof typeof FILTER_LABELS = "all"
        
        if (status === "guests") {
          newFilter = "guests"
          console.log(`🔄 [ADMIN] ✅ CHECK-IN COMPLETED - GUEST NOW ACTIVE`)
          console.log(`🔄 [ADMIN] Setting filter to: guests (ACTIVE tab)`)
          console.log(`🔄 [ADMIN] Guest ${request.guestName} is now checked in and staying`)
          console.log(`🔄 [ADMIN] Inquiry Type: ${request.inquiryType}`)
          console.log(`🔄 [ADMIN] Final Status: ${status}`)
        } else if (status === "check_out") {
          newFilter = "check_out"
          console.log(`🔄 [ADMIN] ✅ CHECK-OUT APPROVAL DETECTED`)
          console.log(`🔄 [ADMIN] Setting filter to: check_out (CHECK OUT tab)`)
          console.log(`🔄 [ADMIN] ⚠️ CONFIRMATION: This request will appear in CHECK OUT tab, NOT CHECK IN tab`)
          console.log(`🔄 [ADMIN] Inquiry Type: ${request.inquiryType}`)
          console.log(`🔄 [ADMIN] Final Status: ${status}`)
        } else if (status === "check_in") {
          newFilter = "check_in"
          console.log(`🔄 [ADMIN] ✅ CHECK-IN APPROVAL DETECTED`)
          console.log(`🔄 [ADMIN] Setting filter to: check_in (CHECK IN tab)`)
          console.log(`🔄 [ADMIN] ⚠️ NOTE: Click 'Complete Check-In' to move guest to ACTIVE tab`)
          console.log(`🔄 [ADMIN] Inquiry Type: ${request.inquiryType}`)
          console.log(`🔄 [ADMIN] Final Status: ${status}`)
        } else if (status === "rejected") {
          newFilter = "rejected"
          console.log(`🔄 [ADMIN] ✅ REJECTION DETECTED`)
          console.log(`🔄 [ADMIN] Setting filter to: rejected (DENIED tab)`)
          console.log(`🔄 [ADMIN] Inquiry Type: ${request.inquiryType}`)
          console.log(`🔄 [ADMIN] Final Status: ${status}`)
        } else {
          console.log(`🔄 [ADMIN] Other status change: ${status}`)
          console.log(`🔄 [ADMIN] Keeping filter as: all`)
        }
        
        // Update filter state
        console.log(`🔄 [ADMIN] Changing filter from ${filter} to ${newFilter}`)
        setFilter(newFilter)
        
        // Fetch with the new filter immediately (no delay needed with optimistic updates)
        console.log(`📡 [ADMIN] Fetching requests with new filter: ${newFilter}`)
        fetchRequests(newFilter, true) // skipLoading=true for seamless UX
      } else {
        const err = await res.json()
        console.error(`❌ [ADMIN] =========================================`)
        console.error(`❌ [ADMIN] APPROVAL FAILED`)
        console.error(`❌ [ADMIN] Error:`, err)
        console.error(`❌ [ADMIN] =========================================`)
        notify({ title: "Error", message: err.message || "Failed to update", type: "error" })
        
        // ROLLBACK: Revert optimistic update on failure
        setRequests(prev => prev.map(r => r._id === id ? request : r))
        console.log(`↩️ [ADMIN] Rollback applied - reverted to original status: ${request.status}`)
      }
    } catch (error) {
      console.error(`❌ [ADMIN] =========================================`)
      console.error(`❌ [ADMIN] NETWORK ERROR`)
      console.error(`❌ [ADMIN] Error:`, error)
      console.error(`❌ [ADMIN] =========================================`)
      notify({ title: "Error", message: "Network error", type: "error" })
      
      // ROLLBACK: Revert optimistic update on error
      const request = requests.find(r => r._id === id)
      if (request) {
        setRequests(prev => prev.map(r => r._id === id ? request : r))
        console.log(`↩️ [ADMIN] Rollback applied - reverted to original status: ${request.status}`)
      }
    }
    setActioning(false)
  }, [token, confirm, notify, fetchRequests, requests, filter])

  const handleExtend = useCallback(async () => {
    if (!extendGuest || !newCheckOut) return
    setExtending(true)
    
    // OPTIMISTIC UPDATE: Update local state immediately
    const originalGuest = { ...extendGuest }
    setRequests(prev => prev.map(r => r._id === extendGuest._id ? { ...r, status: "pending", reviewNote: `Extension requested: new check-out ${newCheckOut}`, checkOut: newCheckOut } : r))
    console.log(`⚡ [ADMIN] Optimistic update for extension - ${extendGuest.guestName} status set to pending`)
    
    // Close modal immediately
    setExtendGuest(null)
    setNewCheckOut("")
    
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
        // Refresh in background without loading state
        fetchRequests(filter, true)
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed", type: "error" })
        // ROLLBACK on failure
        setRequests(prev => prev.map(r => r._id === originalGuest._id ? originalGuest : r))
        console.log(`↩️ [ADMIN] Rollback applied for extension - reverted ${originalGuest.guestName}`)
      }
    } catch { 
      notify({ title: "Error", message: "Network error", type: "error" })
      // ROLLBACK on error
      setRequests(prev => prev.map(r => r._id === originalGuest._id ? originalGuest : r))
      console.log(`↩️ [ADMIN] Rollback applied for extension - reverted ${originalGuest.guestName}`)
    }
    setExtending(false)
  }, [extendGuest, newCheckOut, token, notify, fetchRequests, filter])

  // Memoized filtered results
  const filteredRequests = useMemo(() => {
    return requests
  }, [requests])

  // Calculate counts based on current filter
  const counts: Record<string, number> = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter(r => r.status === "pending").length,
      check_in: requests.filter(r => r.status === "check_in").length,
      guests: requests.filter(r => r.status === "guests").length,
      rejected: requests.filter(r => r.status === "rejected").length,
      check_out: requests.filter(r => r.status === "check_out").length,
    }
  }, [requests])

  return (
    <ProtectedRoute requiredRoles={["admin"]} requiredPermissions={["reception:access"]}>
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
            <button onClick={() => fetchRequests()} disabled={loading} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all disabled:opacity-30">
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
                      <div key={r._id} className="bg-[#151716] rounded-xl border border-white/5 hover:border-white/10 transition-all flex flex-col group relative overflow-hidden shadow-2xl">
                        {/* Status Strip */}
                        <div className={`absolute top-0 left-0 right-0 h-1 z-10 opacity-40 transition-opacity group-hover:opacity-100 ${
                          r.status === 'check_in' ? 'bg-blue-500' : 
                          r.status === 'rejected' ? 'bg-red-500' : 
                          r.status === 'guests' ? 'bg-emerald-500' : 
                          r.status === 'check_out' ? 'bg-purple-500' : 'bg-yellow-500'
                        }`} />
                        
                        {/* Profile Image Banner Overlay */}
                        <div className="w-full h-40 min-h-[160px] flex-shrink-0 relative bg-[#0f1110] border-b border-white/5 overflow-hidden">
                           {r.photoUrl || r.idPhotoFront ? (
                             <img src={r.photoUrl || r.idPhotoFront} alt={r.guestName} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center opacity-10">
                               <Users size={64} className="text-[#d4af37]" />
                             </div>
                           )}
                           <div className="absolute inset-0 bg-gradient-to-t from-[#151716] via-transparent to-transparent" />
                        </div>

                        {/* Circular Avatar Overlap */}
                        <div className="relative h-6 w-full px-5">
                          <div className="absolute -top-10 left-5 w-20 h-20 rounded-2xl border-4 border-[#151716] bg-[#1a1c1b] overflow-hidden shadow-2xl flex-shrink-0 z-20">
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
                          {/* Header: Name & Status */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-white text-lg tracking-tight leading-none">{r.guestName}</span>
                              <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Guest Profile</span>
                            </div>
                            <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase border shadow-sm ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                              {r.status.toUpperCase()}
                            </span>
                          </div>

                        {/* Action Tag */}
                        <div className="flex">
                           <span className="text-[8px] font-black px-3 py-1 bg-[#1a1c1b] text-gray-500 rounded border border-white/5 uppercase tracking-widest">
                             {r.inquiryType.replace("_", "-").toUpperCase()}
                           </span>
                        </div>

                        {/* Detailed Info Grid */}
                        <div className="space-y-4">
                          {/* Row 1: ID, Phone, Room, Price */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-gray-400 font-bold">
                            <div className="flex items-center gap-1.5 min-w-fit">
                              <IdCard size={12} className="text-gray-600" />
                              <span className="text-gray-300">{r.faydaId || "No ID"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-fit">
                              <Phone size={12} className="text-gray-600" />
                              <span className="text-gray-300">{r.phone || "No Phone"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-fit">
                              <DoorOpen size={12} className="text-gray-600" />
                              <span className="text-gray-300">Room {r.roomNumber || "--"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 min-w-fit font-black text-[#f3cf7a]">
                              <Banknote size={12} className="text-gray-600" />
                              <span>{r.roomPrice?.toLocaleString()} ETB</span>
                            </div>
                          </div>

                          {/* Row 2: Guests, Dates, Payment */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-gray-500 font-bold">
                            <div className="flex items-center gap-1.5">
                              <Users size={12} />
                              <span>{r.guests || 1} guests</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar size={12} />
                              <span>{r.checkIn} → {r.checkOut || "???"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-400 uppercase tracking-tighter">
                              <Smartphone size={12} />
                              <span>{r.paymentMethod?.replace("_", " ")}</span>
                            </div>
                          </div>
                        </div>

                        {/* Reference Number & Transaction URL */}
                        {(r.paymentReference || r.transactionUrl) && (
                          <div className="flex items-center justify-between gap-2">
                             {r.paymentReference && (
                               <p className="text-[11px] font-black text-[#d4af37] tracking-tight">
                                 Ref #{r.paymentReference}
                               </p>
                             )}
                             {r.transactionUrl && (
                               <a href={r.transactionUrl} target="_blank" rel="noopener noreferrer" 
                                 className="text-[9px] font-black text-blue-400 hover:text-blue-300 underline flex items-center gap-1">
                                 <Link2 size={10} /> View Receipt
                               </a>
                             )}
                          </div>
                        )}

                        {/* Review Note Box */}
                        {r.reviewNote && (
                          <div className="bg-[#0f1110]/50 rounded-xl p-4 border border-white/5 relative group-hover:border-[#d4af37]/10 transition-colors">
                            <p className="text-[11px] text-gray-400 italic font-medium leading-relaxed">
                              "{r.reviewNote}"
                            </p>
                          </div>
                        )}

                        <div className="mt-auto space-y-4 pt-2">
                           {/* Main Action Button */}
                           <button onClick={() => { setSelected(r); setReviewNote(r.reviewNote || "") }}
                             disabled={actioning}
                             className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl group/btn ${
                               actioning
                                 ? 'bg-[#1a1c1b]/50 border border-white/5 text-[#f3cf7a]/50 cursor-wait'
                                 : 'bg-[#1a1c1b] hover:bg-[#202221] border border-white/5 hover:border-[#d4af37]/30 text-[#f3cf7a]'
                             }`}>
                             {actioning ? (
                               <RefreshCw size={16} className="animate-spin" />
                             ) : (
                               <Eye size={16} className="group-hover/btn:scale-110 transition-transform" />
                             )}
                             {actioning ? 'Processing...' : 'REVIEW'}
                           </button>

                           {/* Secondary Context Actions (Horizontal) */}
                           {r.status === "check_in" && (
                             <button onClick={() => handleAction(r._id, "guests")}
                               disabled={actioning}
                               className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                 actioning
                                   ? 'bg-emerald-900/10 border border-emerald-500/20 text-emerald-400/50 cursor-wait'
                                   : 'bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/30'
                               }`}>
                               {actioning ? (
                                 <RefreshCw size={11} className="animate-spin" />
                               ) : (
                                 <CheckCircle2 size={11} />
                               )}
                               {actioning ? 'Processing...' : 'Complete Check-In'}
                             </button>
                           )}
                           {r.status === "guests" && (
                             <div className="flex gap-2">
                               <button onClick={() => handleAction(r._id, "pending")}
                                 disabled={actioning}
                                 className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                   actioning
                                     ? 'bg-red-900/10 border border-red-500/20 text-red-400/50 cursor-wait'
                                     : 'bg-red-900/10 border border-red-500/20 text-red-400 hover:bg-red-900/20'
                                 }`}>
                                 {actioning ? <RefreshCw size={11} className="animate-spin" /> : <Key size={11} />}
                                 {actioning ? 'Processing...' : 'Check Out'}
                               </button>
                               <button onClick={() => { setExtendGuest(r); setNewCheckOut(r.checkOut || "") }}
                                 disabled={actioning}
                                 className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                                   actioning
                                     ? 'bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#f3cf7a]/50 cursor-wait'
                                     : 'bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#f3cf7a] hover:bg-[#d4af37]/20'
                                 }`}>
                                 {actioning ? <RefreshCw size={11} className="animate-spin" /> : <Calendar size={11} />}
                                 {actioning ? 'Processing...' : 'Extend'}
                               </button>
                             </div>
                           )}
                        </div>

                        {/* Timestamp Footer */}
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

        {/* Detail Sidebar/Modal Overlay */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-2 sm:p-4 overflow-hidden"
            onClick={e => { if (e.target === e.currentTarget) setSelected(null) }}>
            <div className="bg-[#151716] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setSelected(null)} className="absolute top-3 sm:top-4 right-3 sm:right-4 text-gray-500 hover:text-white transition-colors bg-[#0f1110] p-1.5 rounded-lg border border-white/10">
                <X size={18} />
              </button>

              <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
                {/* Modal Header */}
                <div className="space-y-2 border-l-4 border-[#d4af37] pl-4">
                  <h2 className="text-xl sm:text-2xl font-playfair italic font-bold text-[#f3cf7a] leading-none">{selected.guestName}</h2>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className={`text-[8px] sm:text-[9px] font-black px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full uppercase border ${STATUS_STYLES[selected.status] || STATUS_STYLES.pending}`}>
                      {selected.status}
                    </span>
                    <span className="text-gray-600 text-[8px] sm:text-[10px] font-black uppercase tracking-widest opacity-50">{selected.inquiryType.replace("_", " ")} Request</span>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {[
                    { label: "Phone", value: selected.phone || "—" },
                    { label: "Fayda ID", value: selected.faydaId || "—" },
                    { label: "Room", value: `Room #${selected.roomNumber || "—"}` },
                    { label: "Price", value: `${selected.roomPrice?.toLocaleString()} ETB` },
                    { label: "Stay Dates", value: `${selected.checkIn} → ${selected.checkOut || "—"}`, colSpan: true },
                  ].map((item, idx) => (
                    <div key={idx} className={`bg-[#0f1110] p-3 sm:p-4 rounded-xl border border-white/5 space-y-1 shadow-inner ${item.colSpan ? "col-span-1 sm:col-span-2" : ""}`}>
                      <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-gray-600">{item.label}</p>
                      <p className="text-white font-bold text-xs sm:text-sm tracking-tight">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Review Section */}
                <div className="space-y-4">
                  {selected.notes && (
                    <div className="bg-[#0f1110] rounded-xl p-3 sm:p-5 border border-white/5 shadow-inner">
                      <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-gray-500 mb-2">Guest's Initial Note</p>
                      <p className="text-gray-300 text-xs sm:text-sm italic font-medium leading-relaxed">"{selected.notes}"</p>
                    </div>
                  )}

                  <div className="space-y-2.5">
                    <label className="block text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-[#d4af37]">Internal Feedback Note</label>
                    <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={3}
                      placeholder="Add instructions or feedback for reception staff..."
                      className="w-full bg-[#0f1110] border border-white/10 text-white rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#d4af37]/30 resize-none transition-all placeholder:text-gray-700 shadow-inner" />
                  </div>

                  {/* Dynamic Action Buttons */}
                  <div className="pt-2">
                    {selected.status === "pending" && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                        <button onClick={() => handleAction(selected._id, "rejected")} disabled={actioning}
                          className={`col-span-1 py-2.5 sm:py-4 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                            actioning
                              ? 'bg-red-900/10 border border-red-500/20 text-red-400/50 cursor-wait'
                              : 'bg-red-900/20 border border-red-500/20 text-red-400 hover:bg-red-900/30'
                          }`}>
                          {actioning ? (
                            <RefreshCw size={12} className="sm:w-[14px] sm:h-[14px] animate-spin" />
                          ) : (
                            <XCircle size={12} className="sm:w-[14px] sm:h-[14px]" />
                          )}
                          {actioning ? 'Processing...' : 'Deny'}
                        </button>
                        <button onClick={() => handleAction(selected._id, selected.inquiryType === "check_out" ? "check_out" : "check_in")} disabled={actioning}
                          className={`col-span-1 sm:col-span-2 py-2.5 sm:py-4 rounded-xl text-[8px] sm:text-[11px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                            actioning
                              ? 'bg-gradient-to-b from-[#f3cf7a]/50 to-[#b38822]/50 border border-[#f5db8b]/50 text-[#2a1708]/50 cursor-wait'
                              : 'bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] hover:shadow-[#d4af37]/10'
                          }`}>
                          {actioning ? (
                            <RefreshCw size={12} className="sm:w-[14px] sm:h-[14px] animate-spin" />
                          ) : selected.inquiryType === "check_out" ? (
                            <Key size={12} className="sm:w-[14px] sm:h-[14px]" />
                          ) : (
                            <CheckCircle2 size={12} className="sm:w-[14px] sm:h-[14px]" />
                          )}
                          {actioning ? 'Processing...' : selected.inquiryType === "check_out" ? "Approve Departure" : "Approve Arrival"}
                        </button>
                      </div>
                    )}
                                      
                    {!['pending'].includes(selected.status) && (
                      <div className={`py-3 sm:py-5 rounded-xl border text-center text-[8px] sm:text-[11px] font-black uppercase tracking-widest shadow-inner ${STATUS_STYLES[selected.status] || STATUS_STYLES.pending}`}>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4 overflow-hidden"
            onClick={e => { if (e.target === e.currentTarget) setExtendGuest(null) }}>
            <div className="bg-[#151716] border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-4 sm:p-8 space-y-4 sm:space-y-6 relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setExtendGuest(null)} className="absolute top-2 sm:top-4 right-2 sm:right-4 text-gray-500 hover:text-white transition-colors bg-[#0f1110] p-1 sm:p-1.5 rounded-lg border border-white/10">
                <X size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>

              <div className="space-y-2 border-l-4 border-[#d4af37] pl-4">
                <h2 className="text-lg sm:text-xl font-playfair italic font-bold text-[#f3cf7a] leading-none">Extend Stay</h2>
                <p className="text-gray-500 text-[8px] sm:text-[9px] uppercase font-bold tracking-widest">{extendGuest.guestName}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2.5">
                  <label className="block text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-[#d4af37]">New Check-Out Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="w-full bg-[#0f1110] border border-white/10 text-white rounded-xl px-3 sm:px-4 py-3 sm:py-4 text-xs sm:text-sm font-bold flex items-center justify-between hover:border-[#d4af37]/30 transition-all shadow-inner">
                        {newCheckOut ? format(new Date(newCheckOut), "PPP") : <span className="text-gray-600">Select Date</span>}
                        <Calendar className="h-3.5 sm:h-4 w-3.5 sm:w-4 text-[#d4af37]" />
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

                <div className="pt-2 sm:pt-4 flex gap-2 sm:gap-3">
                  <button onClick={() => setExtendGuest(null)}
                    disabled={extending}
                    className={`flex-1 py-2.5 sm:py-4 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${
                      extending
                        ? 'bg-[#1a1c1b]/50 border border-white/5 text-gray-500/50 cursor-wait'
                        : 'bg-[#1a1c1b] border border-white/5 text-gray-500 hover:border-white/10'
                    }`}>
                    Cancel
                  </button>
                  <button onClick={handleExtend} disabled={extending || !newCheckOut}
                    className={`flex-[2] py-2.5 sm:py-4 rounded-xl text-[8px] sm:text-[11px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 ${
                      extending || !newCheckOut
                        ? 'bg-gradient-to-b from-[#f3cf7a]/50 to-[#b38822]/50 border border-[#f5db8b]/50 text-[#2a1708]/50 cursor-wait'
                        : 'bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] hover:shadow-[#d4af37]/10'
                    }`}>
                    {extending ? (
                      <RefreshCw className="h-3.5 sm:h-4 w-3.5 sm:w-4 animate-spin" />
                    ) : (
                      <Calendar size={14} className="sm:w-4 sm:h-4" />
                    )}
                    {extending ? 'Processing...' : 'Confirm Extension'}
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
