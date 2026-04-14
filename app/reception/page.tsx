"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { TransactionPreview as TxPreview } from "@/components/transaction-preview"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarPicker } from "@/components/ui/calendar"
import { format } from "date-fns"
import {
  RefreshCw, Hotel, Key, Utensils, Megaphone, Calendar, MessageSquare,
  ConciergeBell, ClipboardList, DoorOpen, Users, CheckCircle2,
  Phone, Upload, X, CreditCard, Banknote, Smartphone, IdCard, Link2, FileText, XCircle
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
  pending:   "bg-yellow-900/30 text-yellow-400 border-yellow-500/30",
  guests:    "bg-emerald-900/30 text-emerald-400 border-emerald-500/30",
  rejected:  "bg-red-900/30 text-red-400 border-red-500/30",
  check_in:  "bg-blue-900/30 text-blue-400 border-blue-500/30",
  check_out: "bg-purple-900/30 text-purple-400 border-purple-500/30",
}

interface Room  { _id: string; roomNumber: string; floorId: any; price: number; type: string }
interface Floor { _id: string; floorNumber: string; isVIP: boolean }

const EMPTY_FORM = {
  guestName: "", faydaId: "", phone: "", roomNumber: "", floorId: "",
  inquiryType: "", checkIn: "", checkOut: "", checkInTime: "", checkOutTime: "",
  guests: "1", paymentMethod: "cash", chequeNumber: "", notes: "",
  idPhotoFront: "", idPhotoBack: "", roomPrice: "", paymentReference: "", transactionUrl: "", photoUrl: "",
}

function SubmissionCard({ s }: { s: any }) {
  const INQUIRY_TYPES = [
    { value: "check_in",  label: "Check-In" },
    { value: "check_out", label: "Check-Out" },
  ]
  const PAYMENT_METHODS = [
    { value: "cash",           label: "Cash" },
    { value: "mobile_banking", label: "Mobile Banking" },
    { value: "telebirr",       label: "Telebirr" },
    { value: "cheque",         label: "Cheque" },
  ]
  const STATUS_STYLES: Record<string, string> = {
    pending:   "bg-yellow-900/30 text-yellow-400 border-yellow-500/30",
    guests:    "bg-emerald-900/30 text-emerald-400 border-emerald-500/30",
    rejected:  "bg-red-900/30 text-red-400 border-red-500/30",
    check_in:  "bg-blue-900/30 text-blue-400 border-blue-500/30",
    check_out: "bg-purple-900/30 text-purple-400 border-purple-500/30",
  }
  const type = INQUIRY_TYPES.find(t => t.value === s.inquiryType)
  const pm   = PAYMENT_METHODS.find(p => p.value === s.paymentMethod)
  return (
    <div className={`bg-[#0f1110] rounded-xl p-4 border transition-all ${s.status === "rejected" ? "border-red-500/10" : "border-white/5 hover:border-white/10"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-black text-white text-sm">{s.guestName}</span>
        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase border shrink-0 ${STATUS_STYLES[s.status] || STATUS_STYLES.pending}`}>
          {s.status}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 text-[10px] text-gray-500 font-bold">
        {s.roomNumber && <span>{type?.label} · Room {s.roomNumber}</span>}
        {s.phone      && <span>{s.phone}</span>}
        {s.checkIn    && <span>{s.checkIn} → {s.checkOut || "?"}</span>}
        {s.paymentMethod && <span>{pm?.label || s.paymentMethod}</span>}
        {s.paymentReference && <span className="text-[#f3cf7a]">Ref #{s.paymentReference}</span>}
      </div>
      {s.reviewNote && (
        <p className="mt-2 text-[10px] text-red-400 bg-red-900/20 rounded-lg px-2 py-1 border border-red-500/20">
          ↩ {s.reviewNote}
        </p>
      )}
    </div>
  )
}

export default function ReceptionDashboard() {
  const { user, token } = useAuth()
  const { notificationState, notify, closeNotification } = useConfirmation()

  const [formData, setFormData] = useState({ ...EMPTY_FORM, inquiryType: "check_in" })
  const [submitting, setSubmitting] = useState(false)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(true)
  const [rightTab, setRightTab] = useState<"submissions" | "guests" | "rejected" | "check_in" | "check_out">("guests")
  const [extendGuest, setExtendGuest] = useState<any | null>(null)
  const [newCheckOut, setNewCheckOut] = useState("")
  const [extending, setExtending] = useState(false)
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

  // Auto-calculate duration and total payment
  const calcDuration = () => {
    if (!formData.checkIn || !formData.checkOut) return null
    const inDate  = new Date(`${formData.checkIn}T${formData.checkInTime || "12:00"}`)
    const outDate = new Date(`${formData.checkOut}T${formData.checkOutTime || "12:00"}`)
    const diffMs  = outDate.getTime() - inDate.getTime()
    if (diffMs <= 0) return null
    const totalHours = diffMs / (1000 * 60 * 60)
    const nights = Math.ceil(totalHours / 24)
    const savedPrice = parseFloat(formData.roomPrice || "0")
    const pricePerNight = savedPrice > 0 ? savedPrice : (selectedRoom?.price || 0)
    const total = nights * pricePerNight
    return { nights, totalHours: Math.round(totalHours), total, pricePerNight }
  }

  const duration = calcDuration()

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
        setFormData({ ...EMPTY_FORM, inquiryType: "check_in" }); setSelectedRoom(null); fetchSubmissions()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to submit", type: "error" })
      }
    } catch { notify({ title: "Error", message: "Network error", type: "error" }) }
    setSubmitting(false)
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
          reviewNote: `Extension requested: new check-out ${newCheckOut}`,
          checkOut: newCheckOut,
        }),
      })
      if (res.ok) {
        notify({ title: "Extension Requested", message: `New check-out date ${newCheckOut} sent for admin approval.`, type: "success" })
        setExtendGuest(null)
        setNewCheckOut("")
        fetchSubmissions()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed", type: "error" })
      }
    } catch { notify({ title: "Error", message: "Network error", type: "error" }) }
    setExtending(false)
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
                <h2 className="text-[10px] font-black text-gray-500 mb-6 uppercase tracking-widest flex items-center gap-2">
                  <Hotel size={13} className="text-[#d4af37]" /> New Check-In
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">

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
                      <input name="checkIn" type="date" value={formData.checkIn} onChange={handleChange}
                        className={ic + " [color-scheme:dark]"} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Check-Out Date</label>
                      <input name="checkOut" type="date" value={formData.checkOut} onChange={handleChange}
                        min={formData.checkIn || undefined}
                        className={ic + " [color-scheme:dark]"} />
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

                  {/* Duration & Payment Summary */}
                  {duration && (
                    <div className="bg-[#0f1110] border border-[#d4af37]/20 rounded-xl p-4 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#d4af37] flex items-center gap-2">
                        <Calendar size={11} /> Stay Summary
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <p className="text-2xl font-black text-white">{duration.nights}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Night{duration.nights !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="text-center border-x border-white/5">
                          <p className="text-2xl font-black text-white">{duration.totalHours}h</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Total Hours</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-black text-[#f3cf7a]">{duration.total.toLocaleString()}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">ETB Total</p>
                        </div>
                      </div>
                      {duration.pricePerNight > 0 && (
                        <p className="text-[10px] text-gray-500 text-center">
                          {duration.pricePerNight.toLocaleString()} ETB/night × {duration.nights} night{duration.nights !== 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  )}

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
                        {(formData.paymentMethod === "mobile_banking" || formData.paymentMethod === "telebirr") && (
                          <div className="mt-2">
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                              <Link2 size={11} />
                              {formData.paymentMethod === "telebirr" ? "Telebirr" : "Mobile Banking"} Receipt URL
                              <span className="text-red-400">*</span>
                            </label>
                            <input name="transactionUrl" value={formData.transactionUrl} onChange={handleChange}
                              placeholder="Paste receipt link from Telebirr / CBE Birr / HelloCash…"
                              className={ic} />
                            {formData.transactionUrl && (
                              <TxPreview url={formData.transactionUrl} />
                            )}
                          </div>
                        )}
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
              </div>
            </div>

            {/* ── SUBMISSIONS ── */}
            <div className="lg:col-span-5">
              <div className="bg-[#151716] rounded-xl shadow-2xl border border-white/5 p-6 h-full flex flex-col">

                {/* Tab bar */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex gap-1 bg-[#0f1110] border border-white/5 p-1 rounded-xl overflow-x-auto">
                    <button onClick={() => setRightTab("guests")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${rightTab === "guests" ? "bg-emerald-900/40 text-emerald-400 border border-emerald-500/30" : "text-gray-500 hover:text-gray-300"}`}>
                      <Users size={11} /> Guests ({submissions.filter(s => s.status === "guests" && s.inquiryType !== "check_in" && s.inquiryType !== "check_out").length})
                    </button>
                    <button onClick={() => setRightTab("check_in")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${rightTab === "check_in" ? "bg-blue-900/40 text-blue-400 border border-blue-500/30" : "text-gray-500 hover:text-gray-300"}`}>
                      <Hotel size={11} /> Check-In ({submissions.filter(s => s.status === "check_in" || (s.status === "guests" && s.inquiryType === "check_in")).length})
                    </button>
                    <button onClick={() => setRightTab("check_out")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${rightTab === "check_out" ? "bg-purple-900/40 text-purple-400 border border-purple-500/30" : "text-gray-500 hover:text-gray-300"}`}>
                      <Key size={11} /> Check-Out ({submissions.filter(s => s.status === "check_out" || (s.status === "guests" && s.inquiryType === "check_out")).length})
                    </button>
                    <button onClick={() => setRightTab("submissions")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${rightTab === "submissions" ? "bg-yellow-900/40 text-yellow-400 border border-yellow-500/30" : "text-gray-500 hover:text-gray-300"}`}>
                      <ClipboardList size={11} /> Pending ({submissions.filter(s => s.status === "pending").length})
                    </button>
                    <button onClick={() => setRightTab("rejected")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px) font-black uppercase tracking-widest transition-all whitespace-nowrap ${rightTab === "rejected" ? "bg-red-900/40 text-red-400 border border-red-500/30" : "text-gray-500 hover:text-gray-300"}`}>
                      <XCircle size={11} /> Rejected ({submissions.filter(s => s.status === "rejected").length})
                    </button>
                  </div>
                  <button onClick={fetchSubmissions} className="text-gray-500 hover:text-[#d4af37] transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loadingSubmissions ? "animate-spin" : ""}`} />
                  </button>
                </div>

                {loadingSubmissions ? (
                  <div className="flex items-center justify-center py-16 flex-1">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-600" />
                  </div>
                ) : (
                  <div className="overflow-y-auto flex-1 space-y-3 pr-1">

                    {/* ── GUESTS TAB ── */}
                    {rightTab === "guests" && (() => {
                      const guests = submissions.filter(s => s.status === "guests" && s.inquiryType !== "check_in" && s.inquiryType !== "check_out")
                      if (guests.length === 0) return (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Users size={40} className="text-gray-700 mb-3" />
                          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">No guests yet</p>
                        </div>
                      )
                      return guests.map((s: any) => {
                        // Calculate duration for this guest
                        const calcGuestDuration = () => {
                          if (!s.checkIn || !s.checkOut) return null
                          const inDate  = new Date(`${s.checkIn}T${s.checkInTime || "12:00"}`)
                          const outDate = new Date(`${s.checkOut}T${s.checkOutTime || "12:00"}`)
                          const diffMs  = outDate.getTime() - inDate.getTime()
                          if (diffMs <= 0) return null
                          const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
                          // Use saved roomPrice, fallback to rooms list
                          const savedPrice = parseFloat(s.roomPrice || "0")
                          const roomFromList = rooms.find(r => r.roomNumber === s.roomNumber)
                          const pricePerNight = savedPrice > 0 ? savedPrice : (roomFromList?.price || 0)
                          const total = nights * pricePerNight
                          return { nights, total, pricePerNight }
                        }
                        const gd = calcGuestDuration()

                        return (
                        <div key={s._id} className="bg-[#0f1110] rounded-xl p-4 border border-emerald-500/10 hover:border-emerald-500/20 transition-all">
                          <div className="flex items-start gap-3">
                            {s.photoUrl ? (
                              <img src={s.photoUrl} alt={s.guestName} className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-emerald-900/30 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                <Users size={20} className="text-emerald-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-black text-white text-sm truncate">{s.guestName}</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 ${STATUS_STYLES[s.status] || STATUS_STYLES.guests}`}>
                                  {s.status === "guests" ? "Checked In" : s.status === "check_in" ? "Checking In" : s.status === "check_out" ? "Checking Out" : s.status}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-gray-500 font-bold">
                                {s.roomNumber && <span className="flex items-center gap-1"><DoorOpen size={10} /> Room {s.roomNumber}</span>}
                                {s.phone      && <span className="flex items-center gap-1"><Phone size={10} /> {s.phone}</span>}
                                {s.faydaId    && <span className="flex items-center gap-1"><IdCard size={10} /> {s.faydaId}</span>}
                                {s.checkIn    && <span className="flex items-center gap-1"><Calendar size={10} /> {s.checkIn}{s.checkInTime ? ` ${s.checkInTime}` : ""} → {s.checkOut || "?"}{s.checkOutTime ? ` ${s.checkOutTime}` : ""}</span>}
                                {s.guests     && <span className="flex items-center gap-1"><Users size={10} /> {s.guests} guest{parseInt(s.guests) > 1 ? "s" : ""}</span>}
                              </div>

                              {/* Duration & Payment Summary */}
                              {gd && (
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                  <div className="bg-[#151716] rounded-lg p-2 text-center border border-white/5">
                                    <p className="text-sm font-black text-white">{gd.nights}</p>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-600">Night{gd.nights !== 1 ? "s" : ""}</p>
                                  </div>
                                  <div className="bg-[#151716] rounded-lg p-2 text-center border border-white/5">
                                    <p className="text-sm font-black text-[#f3cf7a]">{gd.pricePerNight.toLocaleString()}</p>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-600">ETB/Night</p>
                                  </div>
                                  <div className="bg-[#d4af37]/10 rounded-lg p-2 text-center border border-[#d4af37]/20">
                                    <p className="text-sm font-black text-[#f3cf7a]">{gd.total.toLocaleString()}</p>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-[#d4af37]/60">Total ETB</p>
                                  </div>
                                </div>
                              )}

                              {s.reviewNote && <p className="mt-1.5 text-[10px] text-blue-400 bg-blue-900/20 rounded-lg px-2 py-1 border border-blue-500/20">↩ {s.reviewNote}</p>}
                              <div className="mt-2 flex gap-2">
                                <button type="button"
                                  onClick={() => { setExtendGuest(s); setNewCheckOut(s.checkOut || "") }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#d4af37]/10 border border-[#d4af37]/30 rounded-lg text-[10px] font-black uppercase tracking-widest text-[#f3cf7a] hover:bg-[#d4af37]/20 transition-all">
                                  <Calendar size={11} /> Extend Stay
                                </button>
                                <button type="button"
                                  onClick={async () => {
                                    const res = await fetch(`/api/reception-requests/${s._id}`, {
                                      method: "PUT",
                                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                      body: JSON.stringify({ status: "pending", reviewNote: "Check-out requested by reception" }),
                                    })
                                    if (res.ok) { notify({ title: "Check-Out Requested", message: `${s.guestName} check-out sent for admin approval.`, type: "success" }); fetchSubmissions() }
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/20 border border-red-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-900/30 transition-all">
                                  <Key size={11} /> Check Out
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        )
                      })
                    })()}

                    {/* ── CHECK-IN TAB ── */}
                    {rightTab === "check_in" && (() => {
                      const checkIns = submissions.filter(s => s.status === "check_in" || (s.status === "guests" && s.inquiryType === "check_in"))
                      if (checkIns.length === 0) return (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Hotel size={40} className="text-gray-700 mb-3" />
                          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">No guests checking in</p>
                        </div>
                      )
                      return (
                        <div className="space-y-3">
                          {checkIns.map((s: any) => <SubmissionCard key={s._id} s={s} />)}
                        </div>
                      )
                    })()}

                    {/* ── CHECK-OUT TAB ── */}
                    {rightTab === "check_out" && (() => {
                      const checkOuts = submissions.filter(s => s.status === "check_out" || (s.status === "guests" && s.inquiryType === "check_out"))
                      if (checkOuts.length === 0) return (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Key size={40} className="text-gray-700 mb-3" />
                          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">No guests checking out</p>
                        </div>
                      )
                      return (
                        <div className="space-y-3">
                          {checkOuts.map((s: any) => <SubmissionCard key={s._id} s={s} />)}
                        </div>
                      )
                    })()}

                    {/* ── SUBMISSIONS TAB: pending only ── */}
                    {rightTab === "submissions" && (() => {
                      const pending = submissions.filter(s => s.status === "pending")
                      if (pending.length === 0) return (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <ClipboardList size={40} className="text-gray-700 mb-3" />
                          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">No pending requests</p>
                        </div>
                      )
                      return (
                        <div className="space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-yellow-500 mb-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                            Awaiting Admin Approval ({pending.length})
                          </p>
                          {pending.map((s: any) => <SubmissionCard key={s._id} s={s} />)}
                        </div>
                      )
                    })()}

                    {/* ── REJECTED TAB ── */}
                    {rightTab === "rejected" && (() => {
                      const rejected = submissions.filter(s => s.status === "rejected")
                      if (rejected.length === 0) return (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <XCircle size={40} className="text-gray-700 mb-3" />
                          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">No rejected requests</p>
                        </div>
                      )
                      return (
                        <div className="space-y-2">
                          <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Rejected by Admin ({rejected.length})
                          </p>
                          {rejected.map((s: any) => <SubmissionCard key={s._id} s={s} />)}
                        </div>
                      )
                    })()}

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

        {/* Extend Stay Modal */}
        {extendGuest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={e => { if (e.target === e.currentTarget) setExtendGuest(null) }}>
            <div className="bg-[#151716] border border-white/10 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-playfair italic font-bold text-[#f3cf7a]">Extend Stay</h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5">{extendGuest.guestName} · Room {extendGuest.roomNumber}</p>
                </div>
                <button onClick={() => setExtendGuest(null)} className="w-8 h-8 bg-[#0f1110] border border-white/20 rounded-xl flex items-center justify-center text-white hover:text-red-400 transition-all">
                  <X size={14} />
                </button>
              </div>

              <div className="bg-[#0f1110] rounded-xl p-3 border border-white/5 text-[10px] text-gray-500 font-bold space-y-1">
                <p>Current check-out: <span className="text-white">{extendGuest.checkOut || "—"}</span></p>
                <p>Room price: <span className="text-[#f3cf7a]">{extendGuest.roomPrice} ETB/night</span></p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">New Check-Out Date</label>
                <input type="date" value={newCheckOut}
                  min={extendGuest.checkOut || extendGuest.checkIn || undefined}
                  onChange={e => setNewCheckOut(e.target.value)}
                  className="w-full bg-[#0f1110] border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-[#d4af37]/50 transition-all [color-scheme:dark]" />
              </div>

              <div className="bg-[#0f1110] rounded-xl p-3 border border-[#d4af37]/10 text-[10px] text-gray-500">
                This will send an extension request to admin for approval.
              </div>

              <div className="flex gap-3">
                <button onClick={() => setExtendGuest(null)}
                  className="flex-1 py-3 bg-[#0f1110] border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">
                  Cancel
                </button>
                <button onClick={handleExtend} disabled={extending || !newCheckOut}
                  className="flex-[2] py-3 bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] rounded-xl font-black text-[10px] uppercase tracking-widest shadow-[0_4px_15px_rgba(212,175,55,0.2)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all">
                  {extending ? <><RefreshCw size={12} className="animate-spin" /> Sending…</> : <><Calendar size={12} /> Request Extension</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
