"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import {
  RefreshCw, Hotel, Key, Utensils, Megaphone, Calendar, MessageSquare,
  ConciergeBell, ClipboardList, DoorOpen, Users, CheckCircle2,
  Phone, Upload, X, CreditCard, Banknote, Smartphone, IdCard, Link2, FileText
} from "lucide-react"

const INQUIRY_TYPES = [
  { value: "check_in",  label: "Check-In",  icon: <Hotel size={18} /> },
  { value: "check_out", label: "Check-Out", icon: <Key size={18} /> },
]

const PAYMENT_METHODS = [
  { value: "cash",           label: "Cash",           icon: <Banknote size={15} /> },
  { value: "mobile_banking", label: "Mobile Banking", icon: <Smartphone size={15} /> },
  { value: "telebirr",       label: "Telebirr",       icon: <CreditCard size={15} /> },
  { value: "cheque",         label: "Cheque",         icon: <CreditCard size={15} /> },
]

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-yellow-900/30 text-yellow-400 border-yellow-500/30",
  approved: "bg-emerald-900/30 text-emerald-400 border-emerald-500/30",
  denied:   "bg-red-900/30 text-red-400 border-red-500/30",
}

interface Room  { _id: string; roomNumber: string; floorId: any; price: number; type: string }
interface Floor { _id: string; floorNumber: string; isVIP: boolean }

const EMPTY_FORM = {
  guestName: "", faydaId: "", phone: "", roomNumber: "", floorId: "",
  inquiryType: "", checkIn: "", checkOut: "", checkInTime: "", checkOutTime: "",
  guests: "1", paymentMethod: "cash", chequeNumber: "", notes: "",
  idPhotoFront: "", idPhotoBack: "", roomPrice: "", paymentReference: "", transactionUrl: "", photoUrl: "",
}

function TransactionPreview({ url }: { url: string }) {
  const proxyUrl = `/api/proxy-pdf?url=${encodeURIComponent(url)}`
  const filename = url.split("/").pop() || "receipt.pdf"
  const isPdf = url.toLowerCase().includes(".pdf") || url.toLowerCase().includes("receipt")

  return (
    <a href={proxyUrl} target="_blank" rel="noreferrer"
      className="mt-2 flex items-center gap-3 bg-[#1a1c1b] border border-white/10 rounded-xl px-4 py-3 hover:border-[#d4af37]/30 hover:bg-[#d4af37]/5 transition-all group">
      <div className="w-10 h-10 bg-blue-900/40 border border-blue-500/30 rounded-xl flex items-center justify-center shrink-0">
        <FileText size={20} className="text-blue-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-black truncate group-hover:text-[#f3cf7a] transition-colors">{filename}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{isPdf ? "PDF Document" : "File"} · Click to open</p>
      </div>
      <Link2 size={14} className="text-gray-600 group-hover:text-[#d4af37] transition-colors shrink-0" />
    </a>
  )
}

export default function ReceptionDashboard() {
  const { user, token } = useAuth()
  const { notificationState, notify, closeNotification } = useConfirmation()

  const [formData, setFormData] = useState({ ...EMPTY_FORM })
  const [step, setStep] = useState<1 | 2>(1)
  const [submitting, setSubmitting] = useState(false)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(true)
  const [rooms, setRooms] = useState<Room[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [uploadingFront, setUploadingFront] = useState(false)
  const [uploadingBack, setUploadingBack]   = useState(false)
  const [photoUploadMode, setPhotoUploadMode] = useState<"url" | "file">("url")
  const frontRef = useRef<HTMLInputElement>(null)
  const backRef  = useRef<HTMLInputElement>(null)

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoadingSubmissions(true)
      const res = await fetch("/api/reception-requests", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setSubmissions(await res.json())
    } catch { /* silent */ }
    finally { setLoadingSubmissions(false) }
  }, [token])

  const fetchMetadata = useCallback(async () => {
    try {
      const h = { Authorization: `Bearer ${token}` }
      const [rr, rf] = await Promise.all([fetch("/api/admin/rooms", { headers: h }), fetch("/api/floors", { headers: h })])
      if (rr.ok) setRooms((await rr.json()).sort((a: any, b: any) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })))
      if (rf.ok) setFloors(await rf.json())
    } catch { /* silent */ }
  }, [token])

  useEffect(() => { if (token) { fetchSubmissions(); fetchMetadata() } }, [token, fetchSubmissions, fetchMetadata])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }))

  const handleRoomChange = (roomNumber: string) => {
    const room = rooms.find(r => r.roomNumber === roomNumber) || null
    setSelectedRoom(room)
    const roomFloorId = room ? String(room.floorId?._id || room.floorId) : null
    const floor = roomFloorId ? floors.find(f => String(f._id) === roomFloorId) : null
    setFormData(p => ({ ...p, roomNumber, floorId: floor?._id || p.floorId, roomPrice: room?.price ? String(room.price) : "" }))
  }

  const handleFloorChange = (floorId: string) => {
    setFormData(p => ({ ...p, floorId, roomNumber: "", roomPrice: "" }))
    setSelectedRoom(null)
  }

  const handlePhotoUpload = (file: File, side: "front" | "back") => {
    const set = side === "front" ? setUploadingFront : setUploadingBack
    set(true)
    const reader = new FileReader()
    reader.onload = e => {
      setFormData(p => ({ ...p, [side === "front" ? "idPhotoFront" : "idPhotoBack"]: e.target?.result as string }))
      set(false)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.inquiryType) { notify({ title: "Missing Field", message: "Please select an inquiry type.", type: "error" }); return }
    setSubmitting(true)
    try {
      const res = await fetch("/api/reception-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        notify({ title: "Submitted!", message: `Request for ${formData.guestName} recorded.`, type: "success" })
        setFormData({ ...EMPTY_FORM }); setSelectedRoom(null); setStep(1); fetchSubmissions()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to submit", type: "error" })
      }
    } catch { notify({ title: "Error", message: "Network error", type: "error" }) }
    setSubmitting(false)
  }

  const filteredRooms = formData.floorId
    ? rooms.filter(r => String(r.floorId?._id || r.floorId) === String(formData.floorId))
    : rooms

  // shared input class — dark theme
  const ic = "w-full bg-[#0f1110] border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-[#d4af37]/50 focus:ring-0 transition-all placeholder:text-gray-600"

  return (
    <ProtectedRoute requiredRoles={["reception", "admin"]}>
      <div className="min-h-screen bg-[#0f1110] p-6 text-white selection:bg-[#d4af37] selection:text-[#0f1110]">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Header */}
          <div className="bg-[#151716] rounded-xl p-6 shadow-2xl border border-white/5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#1a1c1b] rounded-lg border border-[#d4af37]/20">
                <ConciergeBell className="h-7 w-7 text-[#d4af37]" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-playfair italic font-bold text-[#f3cf7a] tracking-tight">Reception Desk</h1>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-0.5">Welcome, {user?.name} — log guest requests below</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ── FORM ── */}
            <div className="lg:col-span-7">
              <div className="bg-[#151716] rounded-xl shadow-2xl border border-white/5 p-6 md:p-8">

                {/* Step indicator */}
                <div className="flex items-center gap-3 mb-6">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black border transition-all ${step === 1 ? "bg-[#d4af37] text-[#0f1110] border-[#d4af37]" : "bg-emerald-900/40 text-emerald-400 border-emerald-500/30"}`}>
                    {step === 1 ? "1" : "✓"}
                  </div>
                  <div className="h-px flex-1 bg-white/5" />
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black border transition-all ${step === 2 ? "bg-[#d4af37] text-[#0f1110] border-[#d4af37]" : "bg-[#0f1110] text-gray-600 border-white/10"}`}>2</div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {step === 1 ? "Select Inquiry Type" : "Guest Details"}
                  </span>
                </div>

                {/* ── STEP 1: Inquiry Type ── */}
                {step === 1 && (
                  <div>
                    <p className="text-gray-400 text-sm mb-6">What is the guest requesting?</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {INQUIRY_TYPES.map(t => (
                        <button key={t.value} type="button"
                          onClick={() => { setFormData(p => ({ ...p, inquiryType: t.value })); setStep(2) }}
                          className="flex flex-col items-center gap-3 py-6 px-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all bg-[#0f1110] text-gray-400 border-white/5 hover:border-[#d4af37]/40 hover:text-[#f3cf7a] hover:bg-[#d4af37]/5 hover:shadow-[0_0_20px_rgba(212,175,55,0.1)] active:scale-95">
                          <span className="text-[#d4af37]">{t.icon}</span>
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── STEP 2: Guest Details Form ── */}
                {step === 2 && (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Selected type badge + back button */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-xl px-3 py-2">
                        <span className="text-[#d4af37]">{INQUIRY_TYPES.find(t => t.value === formData.inquiryType)?.icon}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#f3cf7a]">
                          {INQUIRY_TYPES.find(t => t.value === formData.inquiryType)?.label}
                        </span>
                      </div>
                      <button type="button" onClick={() => setStep(1)}
                        className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-[#d4af37] transition-colors flex items-center gap-1">
                        ← Change
                      </button>
                    </div>

                  {/* Guest Name */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Guest Name *</label>
                    <input required name="guestName" value={formData.guestName} onChange={handleChange} placeholder="Full name" className={ic} />
                  </div>

                  {/* Fayda ID + Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><IdCard size={11} /> Fayda ID (FAN)</label>
                      <input
                        name="faydaId"
                        value={formData.faydaId}
                        onChange={e => {
                          const v = e.target.value.replace(/\D/g, "").slice(0, 16)
                          setFormData(p => ({ ...p, faydaId: v }))
                        }}
                        placeholder="16-digit FAN number"
                        maxLength={16}
                        className={ic}
                      />
                      {formData.faydaId && formData.faydaId.length < 16 && (
                        <p className="text-[9px] text-gray-600 mt-1">{formData.faydaId.length}/16 digits</p>
                      )}
                      {formData.faydaId.length === 16 && (
                        <p className="text-[9px] text-emerald-500 mt-1 flex items-center gap-1"><CheckCircle2 size={10} /> Valid FAN</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Phone size={11} /> Phone</label>
                      <input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+251 9XX XXX XXX" className={ic} />
                    </div>
                  </div>

                  {/* ID Photo */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">ID Photo</label>

                    {/* Mode toggle */}
                    <div className="flex gap-1 bg-[#0f1110] border border-white/5 p-1 rounded-xl w-fit mb-3">
                      <button type="button" onClick={() => setPhotoUploadMode("url")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${photoUploadMode === "url" ? "bg-[#d4af37]/10 text-[#f3cf7a] border border-[#d4af37]/30" : "text-gray-500 hover:text-gray-300"}`}>
                        <Link2 size={11} /> URL
                      </button>
                      <button type="button" onClick={() => setPhotoUploadMode("file")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${photoUploadMode === "file" ? "bg-[#d4af37]/10 text-[#f3cf7a] border border-[#d4af37]/30" : "text-gray-500 hover:text-gray-300"}`}>
                        <Upload size={11} /> File
                      </button>
                    </div>

                    {/* URL mode */}
                    {photoUploadMode === "url" && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1.5">Photo URL</p>
                          <input
                            name="photoUrl"
                            value={formData.photoUrl}
                            onChange={handleChange}
                            placeholder="https://example.com/photo.jpg"
                            className={ic}
                          />
                        </div>
                        {formData.photoUrl && (
                          <div className="relative rounded-xl overflow-hidden border border-white/10 h-36 w-36">
                            <img src={formData.photoUrl} alt="Guest Photo"
                              className="w-full h-full object-cover"
                              onError={e => { (e.target as HTMLImageElement).src = "" }} />
                            <button type="button" onClick={() => setFormData(p => ({ ...p, photoUrl: "" }))}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-500">
                              <X size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* File mode — front & back */}
                    {photoUploadMode === "file" && (
                      <div className="grid grid-cols-2 gap-3">
                        {(["front", "back"] as const).map(side => {
                          const val     = side === "front" ? formData.idPhotoFront : formData.idPhotoBack
                          const loading = side === "front" ? uploadingFront : uploadingBack
                          const ref     = side === "front" ? frontRef : backRef
                          const key     = side === "front" ? "idPhotoFront" : "idPhotoBack"
                          return (
                            <div key={side}>
                              <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1.5">{side === "front" ? "Front" : "Back"}</p>
                              <input ref={ref} type="file" accept="image/*" className="hidden"
                                onChange={e => e.target.files?.[0] && handlePhotoUpload(e.target.files[0], side)} />
                              {val ? (
                                <div className="relative rounded-xl overflow-hidden border border-white/10 h-24">
                                  <img src={val} alt={`ID ${side}`} className="w-full h-full object-cover" />
                                  <button type="button" onClick={() => setFormData(p => ({ ...p, [key]: "" }))}
                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-500">
                                    <X size={11} />
                                  </button>
                                </div>
                              ) : (
                                <button type="button" onClick={() => ref.current?.click()}
                                  className="w-full h-24 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-600 hover:border-[#d4af37]/30 hover:text-gray-400 transition-all">
                                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                                  <span className="text-[9px] font-black uppercase tracking-widest">Upload {side === "front" ? "Front" : "Back"}</span>
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Floor + Room */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Floor</label>
                      <select value={formData.floorId} onChange={e => handleFloorChange(e.target.value)} className={ic + " appearance-none"}>
                        <option value="">All Floors</option>
                        {floors.map(f => <option key={f._id} value={f._id}>Floor {f.floorNumber}{f.isVIP ? " (VIP)" : ""}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Room *</label>
                      <select required name="roomNumber" value={formData.roomNumber}
                        onChange={e => handleRoomChange(e.target.value)}
                        disabled={!formData.floorId}
                        className={ic + " appearance-none disabled:opacity-40 disabled:cursor-not-allowed"}>
                        <option value="">{formData.floorId ? "Select Room…" : "Select a floor first"}</option>
                        {filteredRooms.map(r => <option key={r._id} value={r.roomNumber}>Room {r.roomNumber}{r.price ? ` — ${r.price} ETB` : ""}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Room Price */}
                  {selectedRoom && (
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Room Price (ETB)</label>
                      <input name="roomPrice" type="number" value={formData.roomPrice} onChange={handleChange} placeholder="Auto-filled from room" className={ic} />
                    </div>
                  )}

                  {/* Guests */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Number of Guests</label>
                    <select name="guests" value={formData.guests} onChange={handleChange} className={ic + " appearance-none"}>
                      {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} Guest{n > 1 ? "s" : ""}</option>)}
                    </select>
                  </div>

                  {/* Check-In / Check-Out */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Check-In Date</label>
                      <input name="checkIn" type="date" value={formData.checkIn} onChange={handleChange} className={ic} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Check-Out Date</label>
                      <input name="checkOut" type="date" value={formData.checkOut} onChange={handleChange} className={ic} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Check-In Time</label>
                      <input name="checkInTime" type="time" value={formData.checkInTime} onChange={handleChange} className={ic} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Check-Out Time</label>
                      <input name="checkOutTime" type="time" value={formData.checkOutTime} onChange={handleChange} className={ic} />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Payment Method</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {PAYMENT_METHODS.map(pm => (
                        <button key={pm.value} type="button"
                          onClick={() => setFormData(p => ({ ...p, paymentMethod: pm.value }))}
                          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                            formData.paymentMethod === pm.value
                              ? "bg-[#d4af37]/10 text-[#f3cf7a] border-[#d4af37]/40 shadow-[0_0_12px_rgba(212,175,55,0.15)]"
                              : "bg-[#0f1110] text-gray-500 border-white/5 hover:border-[#d4af37]/20 hover:text-gray-300"
                          }`}>
                          {pm.icon} {pm.label}
                        </button>
                      ))}
                    </div>
                    {formData.paymentMethod && (
                      <div className="mt-3">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
                          {formData.paymentMethod === "cash"            ? "Receipt Number"
                           : formData.paymentMethod === "mobile_banking" ? "Transaction Number"
                           : formData.paymentMethod === "telebirr"       ? "Telebirr Transaction Number"
                           : "Cheque Number"}
                        </label>
                        <input name="paymentReference" value={formData.paymentReference} onChange={handleChange}
                          placeholder={
                            formData.paymentMethod === "cash"            ? "Enter receipt number"
                            : formData.paymentMethod === "mobile_banking" ? "Enter transaction number"
                            : formData.paymentMethod === "telebirr"       ? "Enter Telebirr transaction number"
                            : "Enter cheque number"
                          }
                          className={ic} />
                        <div className="mt-2">
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                            <Link2 size={11} /> Transaction Screenshot URL
                          </label>
                          <input name="transactionUrl" value={formData.transactionUrl} onChange={handleChange}
                            placeholder="https://..." className={ic} />
                          {formData.transactionUrl && (
                            <TransactionPreview url={formData.transactionUrl} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Notes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3}
                      placeholder="Additional details or remarks..."
                      className={ic + " resize-none"} />
                  </div>

                  <button type="submit" disabled={submitting}
                    className="w-full bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.4)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? "Submitting…" : (
                      <span className="flex items-center justify-center gap-2"><CheckCircle2 size={16} /> Submit Request</span>
                    )}
                  </button>
                  </form>
                )}
              </div>
            </div>

            {/* ── SUBMISSIONS ── */}
            <div className="lg:col-span-5">
              <div className="bg-[#151716] rounded-xl shadow-2xl border border-white/5 p-6 h-full">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <ClipboardList size={13} /> My Submissions ({submissions.length})
                  </h2>
                  <button onClick={fetchSubmissions} className="text-gray-500 hover:text-[#d4af37] transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loadingSubmissions ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {loadingSubmissions ? (
                  <div className="flex items-center justify-center py-16">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-600" />
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Hotel size={48} className="text-gray-700 mb-3" />
                    <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">No submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                    {submissions.map((s: any) => {
                      const type = INQUIRY_TYPES.find(t => t.value === s.inquiryType)
                      const pm   = PAYMENT_METHODS.find(p => p.value === s.paymentMethod)
                      return (
                        <div key={s._id} className="bg-[#0f1110] rounded-xl p-4 border border-white/5 hover:border-white/10 transition-all">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 text-[#d4af37]">
                              {type?.icon ?? <MessageSquare size={16} />}
                              <span className="font-black text-white text-sm">{s.guestName}</span>
                            </div>
                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase border ${STATUS_STYLES[s.status] || STATUS_STYLES.pending}`}>
                              {s.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 font-bold">
                            {s.faydaId    && <span className="flex items-center gap-1"><IdCard size={11} /> {s.faydaId}</span>}
                            {s.phone      && <span className="flex items-center gap-1"><Phone size={11} /> {s.phone}</span>}
                            {s.roomNumber && <span className="flex items-center gap-1"><DoorOpen size={11} /> Room {s.roomNumber}</span>}
                            {s.roomPrice  && <span>💰 {s.roomPrice} ETB</span>}
                            {s.guests     && <span className="flex items-center gap-1"><Users size={11} /> {s.guests} guest{parseInt(s.guests) > 1 ? "s" : ""}</span>}
                            {s.checkIn    && <span className="flex items-center gap-1"><Calendar size={11} /> {s.checkIn}{s.checkInTime ? ` ${s.checkInTime}` : ""} → {s.checkOut || "?"}{s.checkOutTime ? ` ${s.checkOutTime}` : ""}</span>}
                            {s.paymentMethod && <span className="flex items-center gap-1">{pm?.icon} {pm?.label || s.paymentMethod}</span>}
                            {s.paymentReference && <span className="text-[9px] bg-[#1a1c1b] text-[#f3cf7a] border border-[#d4af37]/20 px-2 py-0.5 rounded">Ref #{s.paymentReference}</span>}
                            {s.transactionUrl && (
                              <a href={`/api/proxy-pdf?url=${encodeURIComponent(s.transactionUrl)}`} target="_blank" rel="noreferrer"
                                className="text-[9px] text-blue-400 flex items-center gap-1 hover:text-blue-300">
                                <Link2 size={10} /> Transaction
                              </a>
                            )}
                          </div>
                          {(s.idPhotoFront || s.idPhotoBack) && (
                            <div className="flex gap-2 mt-2">
                              {s.idPhotoFront && <a href={s.idPhotoFront} target="_blank" rel="noreferrer"><img src={s.idPhotoFront} alt="ID Front" className="h-12 w-20 object-cover rounded-lg border border-white/10" /></a>}
                              {s.idPhotoBack  && <a href={s.idPhotoBack}  target="_blank" rel="noreferrer"><img src={s.idPhotoBack}  alt="ID Back"  className="h-12 w-20 object-cover rounded-lg border border-white/10" /></a>}
                            </div>
                          )}
                          {s.notes      && <p className="mt-2 text-[11px] text-gray-500 bg-[#151716] rounded-lg p-2 border border-white/5 italic">"{s.notes}"</p>}
                          {s.reviewNote && <p className="mt-2 text-[11px] text-blue-400 bg-blue-900/20 rounded-lg p-2 border border-blue-500/20 flex items-center gap-2"><MessageSquare size={11} /> {s.reviewNote}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <NotificationCard isOpen={notificationState.isOpen} onClose={closeNotification}
          title={notificationState.options.title} message={notificationState.options.message}
          type={notificationState.options.type} autoClose={notificationState.options.autoClose}
          duration={notificationState.options.duration} />
      </div>
    </ProtectedRoute>
  )
}
