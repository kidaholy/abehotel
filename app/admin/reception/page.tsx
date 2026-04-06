"use client"

import { useState, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import {
  RefreshCw, ConciergeBell, Hotel, Key, Utensils, Megaphone,
  Calendar, MessageSquare, DoorOpen, Users, Phone, IdCard,
  CheckCircle2, XCircle, Clock, Banknote, Smartphone, CreditCard, Eye, X
} from "lucide-react"

const INQUIRY_TYPES: Record<string, { label: string; icon: any }> = {
  check_in:     { label: "Check-In",       icon: <Hotel size={14} /> },
  check_out:    { label: "Check-Out",       icon: <Key size={14} /> },
  room_service: { label: "Room Service",    icon: <Utensils size={14} /> },
  complaint:    { label: "Complaint",       icon: <Megaphone size={14} /> },
  reservation:  { label: "Reservation",     icon: <Calendar size={14} /> },
  general:      { label: "General Inquiry", icon: <MessageSquare size={14} /> },
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash", mobile_banking: "Mobile Banking", telebirr: "Telebirr", cheque: "Cheque"
}

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-yellow-900/30 text-yellow-400 border-yellow-500/30",
  approved: "bg-emerald-900/30 text-emerald-400 border-emerald-500/30",
  denied:   "bg-red-900/30 text-red-400 border-red-500/30",
}

export default function AdminReceptionPage() {
  const { token } = useAuth()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "denied">("pending")
  const [selected, setSelected] = useState<any | null>(null)
  const [reviewNote, setReviewNote] = useState("")
  const [actioning, setActioning] = useState(false)

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/reception-requests", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setRequests(await res.json())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { if (token) fetchRequests() }, [token, fetchRequests])

  const handleAction = async (id: string, status: "approved" | "denied") => {
    const label = status === "approved" ? "Approve" : "Deny"
    const confirmed = await confirm({
      title: `${label} Request`,
      message: `Are you sure you want to ${label.toLowerCase()} this request?`,
      type: status === "approved" ? "success" : "danger",
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
        notify({ title: `Request ${label}d`, message: `The request has been ${status}.`, type: status === "approved" ? "success" : "error" })
        setSelected(null)
        setReviewNote("")
        fetchRequests()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed", type: "error" })
      }
    } catch { notify({ title: "Error", message: "Network error", type: "error" }) }
    setActioning(false)
  }

  const filtered = requests.filter(r => filter === "all" || r.status === filter)

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    approved: requests.filter(r => r.status === "approved").length,
    denied: requests.filter(r => r.status === "denied").length,
  }

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="min-h-screen bg-[#0f1110] p-6 text-white selection:bg-[#d4af37] selection:text-[#0f1110]">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Header */}
          <div className="bg-[#151716] rounded-xl p-6 border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#1a1c1b] rounded-lg border border-[#d4af37]/20">
                <ConciergeBell className="h-7 w-7 text-[#d4af37]" />
              </div>
              <div>
                <h1 className="text-2xl font-playfair italic font-bold text-[#f3cf7a]">Reception Requests</h1>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-0.5">Review and approve guest requests</p>
              </div>
            </div>
            <button onClick={fetchRequests} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 bg-[#151716] p-1.5 rounded-xl border border-white/5 w-fit">
            {(["pending", "approved", "denied", "all"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  filter === f
                    ? f === "pending"  ? "bg-yellow-900/40 text-yellow-400 border border-yellow-500/30"
                    : f === "approved" ? "bg-emerald-900/40 text-emerald-400 border border-emerald-500/30"
                    : f === "denied"   ? "bg-red-900/40 text-red-400 border border-red-500/30"
                    : "bg-[#d4af37]/10 text-[#f3cf7a] border border-[#d4af37]/30"
                    : "text-gray-500 hover:text-gray-300"
                }`}>
                {f === "pending" && <Clock size={11} />}
                {f === "approved" && <CheckCircle2 size={11} />}
                {f === "denied" && <XCircle size={11} />}
                {f} <span className="opacity-60">({counts[f]})</span>
              </button>
            ))}
          </div>

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <RefreshCw className="h-8 w-8 animate-spin text-[#d4af37]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-gray-600">
              <ConciergeBell size={48} className="mb-4 opacity-30" />
              <p className="text-[10px] font-black uppercase tracking-widest">No {filter} requests</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(r => {
                const type = INQUIRY_TYPES[r.inquiryType]
                return (
                  <div key={r._id} className="bg-[#151716] rounded-xl border border-white/5 hover:border-white/10 transition-all p-5 flex flex-col gap-3">
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 text-[#d4af37]">
                        {type?.icon ?? <MessageSquare size={14} />}
                        <span className="font-black text-white text-sm">{r.guestName}</span>
                      </div>
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase border shrink-0 ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                        {r.status}
                      </span>
                    </div>

                    {/* Type badge */}
                    <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 bg-[#0f1110] border border-white/5 px-2 py-1 rounded w-fit">
                      {type?.label || r.inquiryType}
                    </span>

                    {/* Details */}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500 font-bold">
                      {r.faydaId    && <span className="flex items-center gap-1"><IdCard size={10} /> {r.faydaId}</span>}
                      {r.phone      && <span className="flex items-center gap-1"><Phone size={10} /> {r.phone}</span>}
                      {r.roomNumber && <span className="flex items-center gap-1"><DoorOpen size={10} /> Room {r.roomNumber}</span>}
                      {r.roomPrice  && <span className="flex items-center gap-1"><Banknote size={10} /> {r.roomPrice} ETB</span>}
                      {r.guests     && <span className="flex items-center gap-1"><Users size={10} /> {r.guests} guest{parseInt(r.guests) > 1 ? "s" : ""}</span>}
                      {r.checkIn    && <span className="flex items-center gap-1"><Calendar size={10} /> {r.checkIn}{r.checkInTime ? ` ${r.checkInTime}` : ""} → {r.checkOut || "?"}{r.checkOutTime ? ` ${r.checkOutTime}` : ""}</span>}
                      {r.paymentMethod && <span className="flex items-center gap-1">
                        {r.paymentMethod === "cash" ? <Banknote size={10} /> : r.paymentMethod === "telebirr" || r.paymentMethod === "cheque" ? <CreditCard size={10} /> : <Smartphone size={10} />}
                        {PAYMENT_LABELS[r.paymentMethod] || r.paymentMethod}
                      </span>}
                      {r.chequeNumber && <span className="text-yellow-400">Ref #{r.chequeNumber || r.paymentReference}</span>}
                    </div>

                    {r.notes && <p className="text-[11px] text-gray-500 bg-[#0f1110] rounded-lg p-2 border border-white/5 italic">"{r.notes}"</p>}
                    {r.reviewNote && <p className="text-[11px] text-blue-400 bg-blue-900/20 rounded-lg p-2 border border-blue-500/20">↩ {r.reviewNote}</p>}

                    <p className="text-[9px] text-gray-600 mt-auto">{new Date(r.createdAt).toLocaleString()}</p>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => { setSelected(r); setReviewNote(r.reviewNote || "") }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#0f1110] border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-white/20 transition-all">
                        <Eye size={12} /> Review
                      </button>
                      {r.status === "pending" && (
                        <>
                          <button onClick={() => handleAction(r._id, "approved")}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-900/30 border border-emerald-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-900/50 transition-all">
                            <CheckCircle2 size={12} /> Approve
                          </button>
                          <button onClick={() => handleAction(r._id, "denied")}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-900/30 border border-red-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-900/50 transition-all">
                            <XCircle size={12} /> Deny
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail / Review Modal */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-[#151716] border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                <h2 className="text-lg font-playfair italic text-[#f3cf7a]">Request Detail</h2>
                <button onClick={() => setSelected(null)} className="w-8 h-8 bg-[#0f1110] border border-white/20 rounded-xl flex items-center justify-center text-white hover:text-red-400 hover:border-red-500/30 hover:bg-red-950/30 transition-all">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Guest info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Guest", selected.guestName],
                    ["Type", INQUIRY_TYPES[selected.inquiryType]?.label || selected.inquiryType],
                    ["Fayda ID", selected.faydaId],
                    ["Phone", selected.phone],
                    ["Room", selected.roomNumber ? `Room ${selected.roomNumber}` : null],
                    ["Price", selected.roomPrice ? `${selected.roomPrice} ETB` : null],
                    ["Guests", selected.guests],
                    ["Payment", PAYMENT_LABELS[selected.paymentMethod] || selected.paymentMethod],
                    ["Ref #", selected.paymentReference || selected.chequeNumber],
                    ["Check-In", selected.checkIn ? `${selected.checkIn}${selected.checkInTime ? ` ${selected.checkInTime}` : ""}` : null],
                    ["Check-Out", selected.checkOut ? `${selected.checkOut}${selected.checkOutTime ? ` ${selected.checkOutTime}` : ""}` : null],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label as string} className="bg-[#0f1110] rounded-lg p-3 border border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1">{label}</p>
                      <p className="text-white text-xs font-bold">{value}</p>
                    </div>
                  ))}
                </div>

                {/* ID Photos */}
                {(selected.idPhotoFront || selected.idPhotoBack) && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-3">ID Photos</p>
                    <div className="grid grid-cols-2 gap-3">
                      {selected.idPhotoFront && (
                        <div>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Front</p>
                          <a href={selected.idPhotoFront} target="_blank" rel="noreferrer" className="block group">
                            <img src={selected.idPhotoFront} alt="ID Front"
                              className="w-full h-44 object-cover rounded-xl border border-white/10 group-hover:border-[#d4af37]/40 transition-all shadow-lg" />
                          </a>
                        </div>
                      )}
                      {selected.idPhotoBack && (
                        <div>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Back</p>
                          <a href={selected.idPhotoBack} target="_blank" rel="noreferrer" className="block group">
                            <img src={selected.idPhotoBack} alt="ID Back"
                              className="w-full h-44 object-cover rounded-xl border border-white/10 group-hover:border-[#d4af37]/40 transition-all shadow-lg" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selected.notes && (
                  <div className="bg-[#0f1110] rounded-lg p-3 border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1">Notes</p>
                    <p className="text-gray-300 text-xs italic">"{selected.notes}"</p>
                  </div>
                )}

                {/* Review Note */}
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Review Note (optional)</label>
                  <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2}
                    placeholder="Add a note for the reception staff..."
                    className="w-full bg-[#0f1110] border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-[#d4af37]/50 resize-none placeholder:text-gray-600" />
                </div>

                {/* Action Buttons */}
                {selected.status === "pending" && (
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => handleAction(selected._id, "denied")} disabled={actioning}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-900/30 border border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-900/50 transition-all disabled:opacity-50">
                      <XCircle size={14} /> Deny
                    </button>
                    <button onClick={() => handleAction(selected._id, "approved")} disabled={actioning}
                      className="flex-[2] flex items-center justify-center gap-2 py-3 bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.4)] transition-all disabled:opacity-50">
                      <CheckCircle2 size={14} /> Approve
                    </button>
                  </div>
                )}
                {selected.status !== "pending" && (
                  <div className={`p-3 rounded-xl border text-center text-[10px] font-black uppercase tracking-widest ${STATUS_STYLES[selected.status]}`}>
                    This request has been {selected.status}
                  </div>
                )}
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
