"use client"

import { useState, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { RefreshCw } from "lucide-react"

const INQUIRY_TYPES = [
  { value: "check_in", label: "Check-In", icon: "🏨" },
  { value: "check_out", label: "Check-Out", icon: "🔑" },
  { value: "room_service", label: "Room Service", icon: "🍽️" },
  { value: "complaint", label: "Complaint", icon: "📢" },
  { value: "reservation", label: "Reservation", icon: "📅" },
  { value: "general", label: "General Inquiry", icon: "💬" },
]

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  denied:   "bg-red-50 text-red-700 border-red-200",
}

export default function ReceptionRequestsPage() {
  const { token } = useAuth()
  const { notificationState, notify, closeNotification } = useConfirmation()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "denied">("pending")
  const [reviewModal, setReviewModal] = useState<{ request: any; action: "approved" | "denied" } | null>(null)
  const [reviewNote, setReviewNote] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/reception-requests", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setRequests(await res.json())
      else if (res.status === 403) notify({ title: "Access Denied", message: "You do not have permission to view reception requests.", type: "error" })
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { if (token) fetchRequests() }, [token, fetchRequests])

  const handleReview = async () => {
    if (!reviewModal) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reception-requests/${reviewModal.request._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: reviewModal.action, reviewNote }),
      })
      if (res.ok) {
        notify({ title: `Request ${reviewModal.action}`, message: `Guest "${reviewModal.request.guestName}" request has been ${reviewModal.action}.`, type: "success" })
        setReviewModal(null)
        setReviewNote("")
        fetchRequests()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to update", type: "error" })
      }
    } catch {
      notify({ title: "Error", message: "Network error", type: "error" })
    }
    setSubmitting(false)
  }

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter)
  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    denied: requests.filter(r => r.status === "denied").length,
  }

  return (
    <ProtectedRoute requiredRoles={["cashier", "admin"]}>
      <div className="min-h-screen bg-[#0f1110] p-4 md:p-6 overflow-x-hidden text-white selection:bg-[#c5a059] selection:text-[#0f1110]">
        <div className="max-w-7xl mx-auto space-y-6 w-full">
          <BentoNavbar />

          {/* Header */}
          <div className="bg-[#151716] rounded-xl p-6 shadow-2xl border border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <span className="text-2xl">📋</span>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-playfair italic font-bold text-white tracking-tight">Reception Requests</h1>
                  <p className="text-sm text-gray-500 mt-0.5">Review and manage incoming guest requests from the reception desk.</p>
                </div>
              </div>
              <button onClick={fetchRequests} className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {(["all", "pending", "approved", "denied"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                  filter === f
                    ? f === "pending" ? "bg-yellow-500 text-white shadow-md"
                      : f === "approved" ? "bg-green-600 text-white shadow-md"
                      : f === "denied" ? "bg-red-500 text-white shadow-md"
                      : "bg-gray-800 text-white shadow-md"
                    : "bg-[#151716] text-gray-500 border border-white/5 hover:text-white"
                }`}>
                {f} ({counts[f]})
              </button>
            ))}
          </div>

          {/* Requests Grid */}
          <div className="bg-[#151716] rounded-xl shadow-2xl border border-white/5 p-6 min-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-24"><RefreshCw className="w-8 h-8 animate-spin text-gray-300" /></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="text-5xl mb-3 opacity-20">📭</div>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No {filter} requests</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((req: any) => {
                  const type = INQUIRY_TYPES.find(t => t.value === req.inquiryType)
                  return (
                    <div key={req._id} className={`rounded-xl p-5 border flex flex-col gap-3 transition-all ${req.status === "pending" ? "border-yellow-500/30 bg-yellow-500/5" : req.status === "approved" ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{type?.icon ?? "💬"}</span>
                          <div>
                            <p className="font-playfair italic font-bold text-white text-sm leading-tight">{req.guestName}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{type?.label ?? req.inquiryType}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border shrink-0 ${STATUS_STYLES[req.status]}`}>
                          {req.status}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 font-medium">
                        {req.roomNumber && <span>🚪 Room {req.roomNumber}</span>}
                        {req.phone && <span>📞 {req.phone}</span>}
                        {req.guests && <span>👥 {req.guests} guest{parseInt(req.guests) > 1 ? "s" : ""}</span>}
                        {req.checkIn && <span>📅 {req.checkIn}{req.checkOut ? ` → ${req.checkOut}` : ""}</span>}
                      </div>

                      {req.notes && (
                        <p className="text-xs text-gray-400 bg-[#0f1110] rounded-lg p-3 border border-white/5 italic">"{req.notes}"</p>
                      )}

                      {req.reviewNote && (
                        <p className="text-xs text-[#f3cf7a] bg-blue-900/20 rounded-lg p-3 border border-blue-500/30">💬 {req.reviewNote}</p>
                      )}

                      {/* Actions for pending */}
                      {req.status === "pending" && (
                        <div className="flex gap-2 mt-auto pt-1">
                          <button
                            onClick={() => { setReviewModal({ request: req, action: "approved" }); setReviewNote("") }}
                            className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-700 transition-colors active:scale-95"
                          >✓ Approve</button>
                          <button
                            onClick={() => { setReviewModal({ request: req, action: "denied" }); setReviewNote("") }}
                            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-600 transition-colors active:scale-95"
                          >✕ Deny</button>
                        </div>
                      )}

                      <p className="text-[10px] text-gray-400">{new Date(req.createdAt).toLocaleString()}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Review Modal */}
        {reviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-[#151716] rounded-3xl shadow-2xl max-w-sm w-full p-8 border border-white/5">
              <div className={`text-4xl mb-4 text-center ${reviewModal.action === "approved" ? "✅" : "❌"}`}>
                {reviewModal.action === "approved" ? "✅" : "❌"}
              </div>
              <h3 className="text-xl font-playfair italic font-bold text-center text-white mb-1">
                {reviewModal.action === "approved" ? "Approve" : "Deny"} Request
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Guest: <strong>{reviewModal.request.guestName}</strong>
              </p>
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Note (optional)</label>
                <textarea rows={3} value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                  placeholder="Add a note for this decision..."
                  className="w-full bg-[#0f1110] rounded-xl px-4 py-3 text-sm font-medium text-white border border-white/5 outline-none focus:ring-4 focus:ring-[#d4af37]/10 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setReviewModal(null)} className="flex-1 py-3 text-gray-400 font-bold hover:bg-white/5 rounded-xl transition-colors">
                  Cancel
                </button>
                <button onClick={handleReview} disabled={submitting}
                  className={`flex-[2] py-3 text-white rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 ${reviewModal.action === "approved" ? "bg-green-600 hover:bg-green-700" : "bg-red-500 hover:bg-red-600"}`}>
                  {submitting ? "Saving…" : `Confirm ${reviewModal.action === "approved" ? "Approve" : "Deny"}`}
                </button>
              </div>
            </div>
          </div>
        )}

        <NotificationCard isOpen={notificationState.isOpen} onClose={closeNotification}
          title={notificationState.options.title} message={notificationState.options.message}
          type={notificationState.options.type} autoClose={notificationState.options.autoClose}
          duration={notificationState.options.duration} />
      </div>
    </ProtectedRoute>
  )
}
