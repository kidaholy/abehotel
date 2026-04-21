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
import { format, isToday, isThisWeek, isThisMonth, isThisYear, isSameDay } from "date-fns"
import {
  RefreshCw, Hotel, Key, Utensils, Megaphone, Calendar, MessageSquare,
  ConciergeBell, ClipboardList, DoorOpen, Users, CheckCircle2, Clock,
  Phone, Upload, X, CreditCard, Banknote, Smartphone, IdCard, Link2, FileText, XCircle,
  Search
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
  CHECKIN_PENDING:  "bg-yellow-900/30 text-yellow-400 border-yellow-500/30",
  CHECKIN_APPROVED: "bg-blue-900/30 text-blue-400 border-blue-500/30",
  ACTIVE:           "bg-emerald-900/30 text-emerald-400 border-emerald-500/30",
  EXTEND_PENDING:   "bg-amber-900/30 text-amber-400 border-amber-500/30",
  CHECKOUT_PENDING: "bg-orange-900/30 text-orange-400 border-orange-500/30",
  CHECKOUT_APPROVED: "bg-purple-900/30 text-purple-400 border-purple-500/30",
  CHECKED_OUT:      "bg-gray-800/50 text-gray-500 border-gray-700/50",
}

const STATUS_LABELS: Record<string, string> = {
  pending:   "PENDING",
  guests:    "CHECKED IN",
  rejected:  "REJECTED",
  check_in:  "CHECK-IN APPROVED",
  check_out: "CHECKED OUT",
  CHECKIN_PENDING:  "CHECK-IN PENDING",
  CHECKIN_APPROVED: "CHECKED IN",
  ACTIVE:           "CHECKED IN",
  EXTEND_PENDING:   "EXTEND PENDING",
  CHECKOUT_PENDING: "CHECKOUT PENDING",
  CHECKOUT_APPROVED: "CHECKOUT APPROVED",
  CHECKED_OUT:      "CHECKED OUT",
}

interface Room  { _id: string; roomNumber: string; floorId: any; price: number; type: string }
interface Floor { _id: string; floorNumber: string; isVIP: boolean }

const EMPTY_FORM = {
  guestName: "", faydaId: "", phone: "", roomNumber: "", floorId: "",
  inquiryType: "", stayDays: "",
  guests: "1", paymentMethod: "cash", chequeNumber: "", notes: "",
  idPhotoFront: "", idPhotoBack: "", roomPrice: "", paymentReference: "", transactionUrl: "", photoUrl: "",
}

function GuestCard({ s, rooms, token, notify, fetchSubmissions, setExtendGuest, setNewCheckOut }: { s: any; rooms: any[]; token: string | null; notify: any; fetchSubmissions: () => void; setExtendGuest: (s: any) => void; setNewCheckOut: (d: string) => void }) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  const STATUS_STYLES: Record<string, string> = {
    pending:   "bg-yellow-900/40 text-yellow-400 border-yellow-500/30",
    guests:    "bg-emerald-900/40 text-emerald-400 border-emerald-500/30",
    rejected:  "bg-red-900/40 text-red-400 border-red-500/30",
    check_in:  "bg-blue-900/40 text-blue-400 border-blue-500/30",
    check_out: "bg-purple-900/40 text-purple-400 border-purple-500/30",
    CHECKIN_APPROVED: "bg-emerald-900/40 text-emerald-400 border-emerald-500/30",
    CHECKOUT_PENDING: "bg-orange-900/40 text-orange-400 border-orange-500/30",
    CHECKED_OUT: "bg-gray-800/50 text-gray-500 border-gray-700/50",
  }

  const calcGuestDuration = () => {
    if (!s.checkIn || !s.checkOut) return null
    const inDate  = new Date(`${s.checkIn}T${s.checkInTime || "12:00"}`)
    const outDate = new Date(`${s.checkOut}T${s.checkOutTime || "12:00"}`)
    const diffMs  = outDate.getTime() - inDate.getTime()
    if (diffMs <= 0) return null
    const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    const savedPrice = parseFloat(s.roomPrice || "0")
    const roomFromList = rooms.find(r => r.roomNumber === s.roomNumber)
    const pricePerNight = savedPrice > 0 ? savedPrice : (roomFromList?.price || 0)
    const total = nights * pricePerNight
    return { nights, total, pricePerNight }
  }
  const gd = calcGuestDuration()

  // Remaining days: positive = days left, negative = overdue
  const calcRemainingDays = () => {
    if (!s.checkOut || !["CHECKIN_APPROVED", "check_in", "guests", "ACTIVE"].includes(s.status)) return null
    const now = new Date()
    const outDate = new Date(`${s.checkOut}T${s.checkOutTime || "12:00"}`)
    const diffMs = outDate.getTime() - now.getTime()
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }
  const remainingDays = calcRemainingDays()

  return (
    <div key={s._id} className="relative bg-[#151716] rounded-[2rem] border border-white/5 overflow-hidden group hover:border-[#d4af37]/30 transition-all flex flex-col shadow-2xl min-w-[380px] w-[380px] flex-shrink-0 snap-start">
      {/* Top Accent Bar */}
      <div className={`h-1.5 w-full ${
        s.status === 'check_in' ? 'bg-blue-500' : 
        s.status === 'rejected' ? 'bg-red-500' : 
        s.status === 'check_out' ? 'bg-purple-500' : 
        s.status === 'guests' ? 'bg-emerald-500' : 'bg-yellow-500'
      }`} />
      
      {/* Profile Image Banner Overlay */}
      <div className="w-full h-40 min-h-[160px] flex-shrink-0 relative bg-[#0f1110] border-b border-white/5 overflow-hidden">
         {s.photoUrl || s.idPhotoFront ? (
           <img src={s.photoUrl || s.idPhotoFront} alt={s.guestName} className="w-full h-full object-cover" />
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
          {s.photoUrl || s.idPhotoFront ? (
            <img src={s.photoUrl || s.idPhotoFront} alt={s.guestName} className="w-full h-full object-cover" />
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
            <span className="font-bold text-white text-lg tracking-tight leading-none">{s.guestName}</span>
            <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Guest Profile</span>
          </div>
          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase border shadow-sm ${STATUS_STYLES[s.status] || STATUS_STYLES.guests}`}>
            {STATUS_LABELS[s.status] || s.status.replace("_", " ").toUpperCase()}
          </span>
        </div>

        {/* Detailed Info Grid */}
        <div className="space-y-4">
          {/* Row 1: ID, Phone, Room, Price */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-gray-400 font-bold">
            <div className="flex items-center gap-1.5 min-w-fit">
              <IdCard size={12} className="text-gray-600" />
              <span className="text-gray-300">{s.faydaId || "No ID"}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-fit">
              <Phone size={12} className="text-gray-600" />
              <span className="text-gray-300">{s.phone || "No Phone"}</span>
            </div>
            <div className="flex items-center gap-1.5 min-w-fit">
              <DoorOpen size={12} className="text-gray-600" />
              <span className="text-white">Room {s.roomNumber || "?"}</span>
            </div>
          </div>

          {/* Row 2: Duration Summary */}
          {gd && (
            <div className="bg-[#0f1110] border border-white/5 rounded-2xl p-4 grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xl font-black text-white">{gd.nights}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-600">Night{gd.nights !== 1 ? "s" : ""}</p>
              </div>
              <div className="text-center border-x border-white/5">
                <p className="text-xl font-black text-[#f3cf7a]">{gd.pricePerNight.toLocaleString()}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-gray-600">ETB/NIGHT</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-white">{gd.total.toLocaleString()}</p>
                <p className="text-[8px] font-black uppercase tracking-widest text-[#d4af37]">TOTAL ETB</p>
              </div>
            </div>
          )}

          {/* Row 3: Dates + Remaining Days */}
          <div className="space-y-2 border-t border-white/5 pt-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="p-1.5 bg-[#1a1c1b] rounded-lg border border-white/5">
                 <Calendar size={12} className="text-[#d4af37]" />
              </div>
              <span className="text-[10px] font-bold text-gray-300">{s.checkIn} → {s.checkOut || "?"}</span>
              {s.guests && (
                <span className="ml-auto text-[9px] font-black px-2 py-0.5 bg-[#1a1c1b] text-gray-500 rounded uppercase tracking-widest border border-white/5">
                  {s.guests} Guest{parseInt(s.guests) > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Remaining Days Badge */}
            {remainingDays !== null && (
              <div className={`flex items-center justify-between px-4 py-2.5 rounded-xl border ${
                remainingDays < 0
                  ? "bg-red-950/40 border-red-500/30"
                  : remainingDays === 0
                  ? "bg-amber-950/40 border-amber-500/30"
                  : remainingDays <= 2
                  ? "bg-orange-950/30 border-orange-500/20"
                  : "bg-emerald-950/30 border-emerald-500/20"
              }`}>
                <span className={`text-[9px] font-black uppercase tracking-widest ${
                  remainingDays < 0 ? "text-red-400" : remainingDays === 0 ? "text-amber-400" : remainingDays <= 2 ? "text-orange-400" : "text-emerald-400"
                }`}>
                  {remainingDays < 0 ? "⚠ Overdue" : remainingDays === 0 ? "⚡ Due Today" : "🕐 Remaining"}
                </span>
                <span className={`text-lg font-black ${
                  remainingDays < 0 ? "text-red-400" : remainingDays === 0 ? "text-amber-400" : remainingDays <= 2 ? "text-orange-300" : "text-emerald-400"
                }`}>
                  {remainingDays < 0 ? Math.abs(remainingDays) : remainingDays}
                  <span className={`text-[10px] ml-1 font-bold ${
                    remainingDays < 0 ? "text-red-600" : remainingDays === 0 ? "text-amber-600" : "text-emerald-700"
                  }`}>
                    {remainingDays < 0 ? "day(s) past checkout" : remainingDays === 1 ? "day left" : "days left"}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Notes & Review Row */}
        {s.reviewNote && (
          <p className="text-[11px] text-blue-400 bg-blue-900/20 rounded-xl p-3 border border-blue-500/20 flex items-start gap-2">
            <RefreshCw size={12} className="mt-0.5 shrink-0" />
            <span>{s.reviewNote}</span>
          </p>
        )}

        {/* Actions Row */}
        <div className="mt-auto flex gap-2 pt-2">
          {["CHECKIN_APPROVED", "check_in", "guests", "ACTIVE"].includes(s.status) && (
            <button type="button"
              disabled={actionLoading === 'checkout'}
              onClick={async () => {
                setActionLoading('checkout')
                try {
                  const res = await fetch(`/api/reception-requests/${s._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ status: "CHECKOUT_PENDING", inquiryType: "check_out", reviewNote: "Check-out requested by reception" }),
                  })
                  if (res.ok) { 
                    notify({ title: "Departure Requested", message: `Check-out for ${s.guestName} sent to admin for approval.`, type: "success" })
                    fetchSubmissions() 
                  } else {
                    const err = await res.json()
                    notify({ title: "Error", message: err.message || "Failed to request check-out", type: "error" })
                  }
                } catch (error) {
                  notify({ title: "Error", message: "Network error", type: "error" })
                } finally {
                  setActionLoading(null)
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                actionLoading === 'checkout'
                  ? 'bg-red-900/20 border border-red-500/30 text-red-400/50 cursor-wait'
                  : 'bg-[#1a1c1b] border border-red-500/30 text-red-500 hover:bg-red-900/10'
              }`}>
              {actionLoading === 'checkout' ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Key size={14} />
              )}
              {actionLoading === 'checkout' ? 'Processing...' : 'Check Out'}
            </button>
          )}
          {["CHECKIN_APPROVED", "check_in", "guests", "ACTIVE"].includes(s.status) && (
            <button type="button"
              onClick={() => { setExtendGuest(s); setNewCheckOut(""); setExtendDays("") }}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#d4af37]/10 border border-[#d4af37]/30 text-[#f3cf7a] hover:bg-[#d4af37]/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
              <Calendar size={14} /> Extend
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SubmissionCard({ s }: { s: any }) {
  const INQUIRY_TYPES = [
    { value: "check_in",  label: "Check-In" },
    { value: "check_out", label: "Check-Out" },
  ]
  const STATUS_STYLES: Record<string, string> = {
    pending:   "bg-yellow-900/40 text-yellow-400 border-yellow-500/30",
    guests:    "bg-emerald-900/40 text-emerald-400 border-emerald-500/30",
    rejected:  "bg-red-900/40 text-red-400 border-red-500/30",
    check_in:  "bg-blue-900/40 text-blue-400 border-blue-500/30",
    check_out: "bg-purple-900/40 text-purple-400 border-purple-500/30",
  }
  const type = INQUIRY_TYPES.find(t => t.value === s.inquiryType)

  return (
    <div className="relative bg-[#0f1110] rounded-[1.5rem] border border-white/5 overflow-hidden group hover:border-white/10 transition-all flex flex-col shadow-lg p-5 min-w-[380px] w-[380px] flex-shrink-0 snap-start">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1a1c1b] border border-white/5 flex items-center justify-center shrink-0">
            {s.photoUrl || s.idPhotoFront ? (
              <img src={s.photoUrl || s.idPhotoFront} alt={s.guestName} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Users size={16} className="text-gray-700" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-black text-white text-sm">{s.guestName}</span>
            <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">{type?.label || s.inquiryType}</span>
          </div>
        </div>
        <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase border shrink-0 ${STATUS_STYLES[s.status] || STATUS_STYLES.pending}`}>
          {STATUS_LABELS[s.status] || s.status.replace("_", " ").toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-[10px] font-bold">
        {s.roomNumber && (
          <div className="flex items-center gap-1.5 text-gray-400 bg-[#151716] p-2 rounded-lg border border-white/5">
            <DoorOpen size={12} className="text-gray-600" />
            <span>Room {s.roomNumber}</span>
          </div>
        )}
        {s.phone && (
          <div className="flex items-center gap-1.5 text-gray-400 bg-[#151716] p-2 rounded-lg border border-white/5">
            <Phone size={12} className="text-gray-600" />
            <span>{s.phone}</span>
          </div>
        )}
      </div>

      {s.checkIn && (
        <div className="mt-3 flex items-center gap-2 text-[9px] font-black text-gray-500 uppercase tracking-widest bg-[#151716] p-2 rounded-lg border border-white/5">
          <Calendar size={12} className="text-gray-700" />
          <span>{s.checkIn} → {s.checkOut || "?"}</span>
        </div>
      )}

      {s.paymentReference && (
        <div className="mt-3 flex items-center justify-between bg-[#d4af37]/5 p-2 rounded-lg border border-[#d4af37]/20">
          <span className="text-[9px] font-black text-[#d4af37] uppercase tracking-widest">Payment Ref</span>
          <span className="text-[10px] font-black text-[#f3cf7a]">#{s.paymentReference}</span>
        </div>
      )}

      {s.reviewNote && (
        <p className="mt-3 text-[10px] text-red-400 bg-red-900/20 rounded-lg px-3 py-2 border border-red-500/20 italic">
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
  const [rightTab, setRightTab] = useState<"submissions" | "guests" | "rejected" | "check_in" | "check_out">("submissions")
  const [viewMode, setViewMode] = useState<"form" | "status">("form")
  const [searchQuery, setSearchQuery] = useState("")
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "year" | "custom">("all")
  const [customDate, setCustomDate] = useState("")
  const datePickerRef = useRef<HTMLInputElement>(null)
  const [extendGuest, setExtendGuest] = useState<any | null>(null)
  const [newCheckOut, setNewCheckOut] = useState("")
  const [extendDays, setExtendDays] = useState("")
  const [extending, setExtending] = useState(false)
  const [rooms, setRooms] = useState<Room[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [uploadingFront, setUploadingFront] = useState(false)
  const [uploadingBack, setUploadingBack]   = useState(false)
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const frontRef = useRef<HTMLInputElement>(null)
  const backRef  = useRef<HTMLInputElement>(null)
  const profileRef = useRef<HTMLInputElement>(null)

  const fetchSubmissions = useCallback(async () => {
    try {
      if (submissions.length === 0) setLoadingSubmissions(true)
      const res = await fetch("/api/reception-requests?limit=500", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        // Handle both old array format and new paginated format
        setSubmissions(Array.isArray(data) ? data : (data.data || []))
      }
    } catch { /* silent */ }
    finally { setLoadingSubmissions(false) }
  }, [token, submissions.length])

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
    const stayDays = Number(formData.stayDays)
    if (!Number.isInteger(stayDays) || stayDays <= 0) return null
    const nights = stayDays
    const totalHours = nights * 24
    const savedPrice = parseFloat(formData.roomPrice || "0")
    const pricePerNight = savedPrice > 0 ? savedPrice : (selectedRoom?.price || 0)
    const total = nights * pricePerNight
    return { nights, totalHours: Math.round(totalHours), total, pricePerNight }
  }

  const duration = calcDuration()

  const handlePhotoUpload = (file: File, side: "front" | "back" | "profile") => {
    const set = side === "front" ? setUploadingFront : side === "back" ? setUploadingBack : setUploadingProfile
    set(true)
    const reader = new FileReader()
    reader.onload = e => {
      setFormData(p => ({ 
        ...p, 
        [side === "front" ? "idPhotoFront" : side === "back" ? "idPhotoBack" : "photoUrl"]: e.target?.result as string 
      }))
      set(false)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.inquiryType) { notify({ title: "Missing Field", message: "Please select an inquiry type.", type: "error" }); return }
    if (!formData.guestName.trim()) { notify({ title: "Missing Field", message: "Guest name is required.", type: "error" }); return }
    if (!formData.phone.trim()) { notify({ title: "Missing Field", message: "Phone number is required.", type: "error" }); return }
    if (!formData.idPhotoFront || !formData.idPhotoBack) { notify({ title: "Missing Field", message: "Both front and back guest ID photos are required.", type: "error" }); return }
    if (!formData.floorId || !formData.roomNumber) { notify({ title: "Missing Field", message: "Floor and room are required.", type: "error" }); return }
    if (!formData.guests) { notify({ title: "Missing Field", message: "Guest number is required.", type: "error" }); return }
    const stayDays = Number(formData.stayDays)
    if (!Number.isInteger(stayDays) || stayDays <= 0) { notify({ title: "Missing Field", message: "Stay duration in days is required.", type: "error" }); return }
    if (formData.paymentMethod === "cash" && !formData.paymentReference.trim()) {
      notify({ title: "Missing Field", message: "Receipt number is required for cash payment.", type: "error" }); return
    }
    if (formData.paymentMethod !== "cash" && !formData.transactionUrl.trim()) {
      notify({ title: "Missing Field", message: "Receipt URL is required for non-cash payments.", type: "error" }); return
    }
    setSubmitting(true)
    try {
      const checkInDate = new Date()
      const checkOutDate = new Date(checkInDate)
      checkOutDate.setDate(checkOutDate.getDate() + stayDays)
      const payload = {
        ...formData,
        checkIn: checkInDate.toISOString().split("T")[0],
        checkOut: checkOutDate.toISOString().split("T")[0],
      }
      const res = await fetch("/api/reception-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
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
    if (!extendGuest) return
    const daysToAdd = Number(extendDays)
    if (!Number.isInteger(daysToAdd) || daysToAdd <= 0) {
      notify({ title: "Invalid Days", message: "Please enter how many days to extend (minimum 1).", type: "error" })
      return
    }
    const baseDate = extendGuest.checkOut || extendGuest.checkIn
    if (!baseDate) {
      notify({ title: "Missing Date", message: "Cannot extend because current stay date is missing.", type: "error" })
      return
    }
    const nextDate = new Date(`${baseDate}T12:00`)
    nextDate.setDate(nextDate.getDate() + daysToAdd)
    const computedCheckOut = nextDate.toISOString().split("T")[0]
    setNewCheckOut(computedCheckOut)
    setExtending(true)
    try {
      const res = await fetch(`/api/reception-requests/${extendGuest._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          status: "EXTEND_PENDING",
          reviewNote: `Extension requested: +${daysToAdd} day(s), new check-out ${computedCheckOut}`,
          checkOut: computedCheckOut,
        }),
      })
      if (res.ok) {
        notify({ title: "Extension Requested", message: `Extended by ${daysToAdd} day(s). New check-out date ${computedCheckOut} sent for admin approval.`, type: "success" })
        setExtendGuest(null)
        setNewCheckOut("")
        setExtendDays("")
        fetchSubmissions()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed", type: "error" })
          }
    } catch { notify({ title: "Error", message: "Network error", type: "error" }) }
    setExtending(false)
  }

  // Rooms currently held by guests who have checked in but not yet checked out
  const occupiedRoomNumbers = new Set(
    submissions
      .filter(s => ["CHECKIN_APPROVED", "check_in", "guests", "ACTIVE"].includes(s.status) && s.roomNumber)
      .map(s => s.roomNumber)
  )

  const filteredRooms = rooms.filter(r => {
    // If the form's selected floor is set, filter by floor
    if (formData.floorId && String(r.floorId?._id || r.floorId) !== String(formData.floorId)) return false
    // Exclude rooms occupied by currently checked-in guests
    return !occupiedRoomNumbers.has(r.roomNumber)
  })


  // shared input class — dark theme
  const ic = "w-full bg-[#0f1110] border border-white/10 text-white rounded-xl px-4 py-3 text-sm font-medium outline-none focus:border-[#d4af37]/50 focus:ring-0 transition-all placeholder:text-gray-600"

  const filteredSubmissions = submissions.filter(s => {
    let matchText = true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      matchText = Boolean(
        s.guestName?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q) ||
        s.faydaId?.toLowerCase().includes(q) ||
        s.roomNumber?.toLowerCase().includes(q)
      )
    }

    let matchDate = true;
    if (dateFilter !== "all" && s.createdAt) {
      const d = new Date(s.createdAt)
      if (dateFilter === "today"  && !isToday(d)) matchDate = false
      if (dateFilter === "week"   && !isThisWeek(d)) matchDate = false
      if (dateFilter === "month"  && !isThisMonth(d)) matchDate = false
      if (dateFilter === "year"   && !isThisYear(d)) matchDate = false
      if (dateFilter === "custom" && customDate && !isSameDay(d, new Date(customDate))) matchDate = false
    }

    return matchText && matchDate;
  })

  return (
    <ProtectedRoute requiredRoles={["reception", "admin"]} requiredPermissions={["reception:access"]}>
      <div className="min-h-screen bg-[#0f1110] p-6 text-white selection:bg-[#d4af37] selection:text-[#0f1110]">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Header & Tabs */}
          <div className="bg-[#151716] rounded-xl p-6 shadow-2xl border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#1a1c1b] rounded-lg border border-[#d4af37]/20 flex-shrink-0">
                <ConciergeBell className="h-7 w-7 text-[#d4af37]" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-playfair italic font-bold text-[#f3cf7a] tracking-tight">Reception Desk</h1>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-0.5">Welcome, {user?.name} — Guest Management</p>
              </div>
            </div>

            <div className="flex bg-[#0f1110] p-1.5 rounded-xl border border-white/5 shadow-inner self-stretch md:self-auto">
              <button 
                onClick={() => setViewMode("form")}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  viewMode === "form" ? "bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] shadow-xl" : "text-gray-500 hover:text-white"
                }`}
              >
                <ClipboardList size={14} /> New Check-In
              </button>
              <button 
                onClick={() => setViewMode("status")}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                  viewMode === "status" ? "bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] shadow-xl" : "text-gray-500 hover:text-white"
                }`}
              >
                <Users size={14} /> Guest Status
              </button>
            </div>
          </div>

          <div>
            {/* ── FORM ── */}
            {viewMode === "form" && (
              <div>
                <div className="bg-[#151716] rounded-xl shadow-2xl border border-white/5 p-6 md:p-8">
                <h2 className="text-[10px] font-black text-gray-500 mb-6 uppercase tracking-widest flex items-center gap-2">
                  <Hotel size={13} className="text-[#d4af37]" /> New Check-In
                </h2>

                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* ── LEFT COLUMN ── */}
                  <div className="space-y-5">

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
                      <input required name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="+251 9XX XXX XXX" className={ic} />
                    </div>
                  </div>

                  {/* Photos & Documents */}
                  <div className="space-y-4 bg-[#0f1110] border border-white/5 rounded-2xl p-5">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 border-b border-white/5 pb-3">
                      <IdCard size={13} className="text-[#d4af37]" /> Guest Photos & ID
                    </label>

                    {/* Guest Profile URL */}
                    <div>
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1.5">1. Guest Profile Photo (URL or File Upload)</p>
                      
                      <div className="flex gap-2">
                        <input
                          name="photoUrl"
                          value={formData.photoUrl}
                          onChange={handleChange}
                          placeholder="https://example.com/photo.jpg or Paste/Upload"
                          className={`${ic} flex-1`}
                        />
                        <button type="button" onClick={() => profileRef.current?.click()}
                          className="bg-[#1a1c1b] border border-white/10 text-white rounded-xl px-4 py-3 flex items-center justify-center gap-2 hover:bg-[#d4af37]/20 hover:text-[#f3cf7a] transition-all whitespace-nowrap min-w-[120px]">
                          {uploadingProfile ? <RefreshCw size={14} className="animate-spin text-[#d4af37]" /> : <Upload size={14} />}
                          <span className="text-[10px] font-black uppercase tracking-widest">{uploadingProfile ? "Processing" : "Upload File"}</span>
                        </button>
                        <input ref={profileRef} type="file" accept="image/*" className="hidden" 
                          onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0], "profile") }} />
                      </div>

                      {formData.photoUrl && (
                        <div className="relative rounded-xl overflow-hidden border border-white/10 h-36 w-36 mt-3">
                          <img src={formData.photoUrl} alt="Guest Photo"
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).src = "" }} />
                          <button type="button" onClick={() => setFormData(p => ({ ...p, photoUrl: "" }))}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-500 shadow-lg">
                            <X size={11} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="h-px w-full bg-white/5" />

                    {/* File mode — front & back */}
                    <div>
                      <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        2. ID Card Upload <span className="text-red-400">*</span>
                      </p>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {(["front", "back"] as const).map(side => {
                          const val     = side === "front" ? formData.idPhotoFront : formData.idPhotoBack
                          const loading = side === "front" ? uploadingFront : uploadingBack
                          const ref     = side === "front" ? frontRef : backRef
                          const key     = side === "front" ? "idPhotoFront" : "idPhotoBack"
                          return (
                            <div key={side}>
                              <input ref={ref} type="file" accept="image/*" className="hidden"
                                onChange={e => { if (e.target.files?.[0]) handlePhotoUpload(e.target.files[0], side) }} />
                              {val ? (
                                <div className="relative rounded-xl overflow-hidden border border-[#d4af37]/30 h-24 shadow-inner">
                                  <img src={val} alt={`ID ${side}`} className="w-full h-full object-cover" />
                                  <button type="button" onClick={() => setFormData(p => ({ ...p, [key]: "" }))}
                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-500 shadow-xl">
                                    <X size={11} />
                                  </button>
                                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm text-center py-1">
                                    <span className="text-[8px] font-black text-white uppercase tracking-widest">{side} Image Saved</span>
                                  </div>
                                </div>
                              ) : (
                                <button type="button" onClick={() => ref.current?.click()}
                                  className="w-full h-24 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-1.5 text-gray-600 hover:border-[#d4af37]/30 hover:text-gray-400 hover:bg-white/5 transition-all">
                                  {loading ? <RefreshCw size={16} className="animate-spin text-[#d4af37]" /> : <Upload size={16} />}
                                  <span className="text-[9px] font-black uppercase tracking-widest">Upload {side}</span>
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  </div>{/* end left column */}

                  {/* ── RIGHT COLUMN ── */}
                  <div className="space-y-5">

                  {/* Floor + Room */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Floor</label>
                      <select required value={formData.floorId} onChange={e => handleFloorChange(e.target.value)} className={ic + " appearance-none"}>
                        <option value="">Select Floor…</option>
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
                    <select required name="guests" value={formData.guests} onChange={handleChange} className={ic + " appearance-none"}>
                      {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} Guest{n > 1 ? "s" : ""}</option>)}
                    </select>
                  </div>

                  {/* Stay Duration */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Stay Duration (Days) *</label>
                      <input
                        required
                        name="stayDays"
                        type="number"
                        min={1}
                        step={1}
                        value={formData.stayDays}
                        onChange={handleChange}
                        placeholder="How many days?"
                        className={ic}
                      />
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
                          required={formData.paymentMethod === "cash"}
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
                              required={formData.paymentMethod !== "cash"}
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

                  </div>{/* end right column */}
                  </div>{/* end 2-col grid */}

                  <button type="submit" disabled={submitting}
                    className="w-full mt-4 bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.4)] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? "Submitting…" : (
                      <span className="flex items-center justify-center gap-2"><CheckCircle2 size={16} /> Submit Request</span>
                    )}
                  </button>
                  </form>
                </div>
              </div>
            )}

            {/* ── SUBMISSIONS ── */}
            {viewMode === "status" && (
              <div>
                <div className="bg-[#151716] rounded-xl shadow-2xl border border-white/5 p-6 min-h-[60vh] flex flex-col font-bold">

                {/* Search & Date Filters */}
                <div className="mb-6 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <input 
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search guests by name, phone, room or ID..."
                        className="w-full bg-[#0f1110] border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-xs font-bold uppercase tracking-widest text-[#f3cf7a] outline-none focus:border-[#d4af37]/30 transition-all placeholder:text-gray-700"
                      />
                    </div>
                    {/* Date Filters */}
                    <div className="flex items-center gap-1 bg-[#0f1110] border border-white/5 p-1 rounded-xl w-full md:w-auto overflow-x-auto text-[10px] uppercase font-black tracking-widest text-gray-500 shrink-0">
                       <button onClick={() => setDateFilter("all")} className={`px-3 py-2 rounded-lg transition-all ${dateFilter === "all" ? "bg-[#d4af37]/10 text-[#f3cf7a]" : "hover:text-gray-300"}`}>All Time</button>
                       <button onClick={() => setDateFilter("today")} className={`px-3 py-2 rounded-lg transition-all ${dateFilter === "today" ? "bg-[#d4af37]/10 text-[#f3cf7a]" : "hover:text-gray-300"}`}>Today</button>
                       <button onClick={() => setDateFilter("week")} className={`px-3 py-2 rounded-lg transition-all ${dateFilter === "week" ? "bg-[#d4af37]/10 text-[#f3cf7a]" : "hover:text-gray-300"}`}>Week</button>
                       <button onClick={() => setDateFilter("year")} className={`px-3 py-2 rounded-lg transition-all ${dateFilter === "year" ? "bg-[#d4af37]/10 text-[#f3cf7a]" : "hover:text-gray-300"}`}>Year</button>
                                               <div className="relative flex items-center">
                          <input
                            ref={datePickerRef}
                            type="date"
                            value={customDate}
                            onChange={e => { setCustomDate(e.target.value); setDateFilter("custom") }}
                            className="sr-only"
                          />
                          <button
                            type="button"
                            onClick={() => (datePickerRef.current as any)?.showPicker?.() ?? datePickerRef.current?.click()}
                            className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1 ${dateFilter === "custom" ? "bg-[#d4af37]/10 text-[#f3cf7a]" : "hover:text-gray-300"}`}>
                             <Calendar size={12} /> {dateFilter === "custom" && customDate ? customDate : "Pick Date"}
                          </button>
                        </div>
                    </div>
                  </div>

                  {/* ── Revenue Summary ── */}
                  {(() => {
                    const approved = filteredSubmissions.filter((s: any) => ["CHECKIN_APPROVED", "guests", "check_in", "ACTIVE"].includes(s.status))
                    const calcNights = (checkIn?: string, checkOut?: string) => {
                      if (!checkIn || !checkOut) return 1
                      const diff = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
                      return diff > 0 ? diff : 1
                    }
                    const totalRevenue = approved.reduce((sum, s) => sum + (Number(s.roomPrice) || 0) * calcNights(s.checkIn, s.checkOut), 0)
                    const totalNights  = approved.reduce((sum, s) => sum + calcNights(s.checkIn, s.checkOut), 0)
                    const avgNights    = approved.length > 0 ? (totalNights / approved.length).toFixed(1) : "—"
                    const periodLabel  = dateFilter === "all" ? "All Time" : dateFilter === "today" ? "Today" : dateFilter === "week" ? "This Week" : dateFilter === "year" ? "This Year" : customDate || "Custom"
                    return (
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-[#0f1110] border border-[#d4af37]/20 rounded-2xl p-4 text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Total Revenue</p>
                          <p className="text-xl font-black text-[#f3cf7a]">{totalRevenue.toLocaleString()}</p>
                          <p className="text-[9px] text-gray-600 font-bold">ETB · {periodLabel}</p>
                        </div>
                        <div className="bg-[#0f1110] border border-white/5 rounded-2xl p-4 text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Approved Guests</p>
                          <p className="text-xl font-black text-white">{approved.length}</p>
                          <p className="text-[9px] text-gray-600 font-bold">Checked In / Active</p>
                        </div>
                        <div className="bg-[#0f1110] border border-white/5 rounded-2xl p-4 text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Avg. Stay</p>
                          <p className="text-xl font-black text-white">{avgNights}</p>
                          <p className="text-[9px] text-gray-600 font-bold">Nights per Guest</p>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Tab bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 bg-[#0f1110] border border-white/5 p-1 rounded-xl overflow-x-auto">
                      <button onClick={() => setRightTab("submissions")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${rightTab === "submissions" ? "bg-yellow-900/40 text-yellow-400 border border-yellow-500/30" : "text-gray-500 hover:text-gray-300"}`}>
                        <Clock size={11} /> CHECKIN WAITING ({filteredSubmissions.filter(s => ["CHECKIN_PENDING"].includes(s.status)).length})
                      </button>
                      <button onClick={() => setRightTab("check_in")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${rightTab === "check_in" ? "bg-emerald-900/40 text-emerald-400 border border-emerald-500/30" : "text-gray-500 hover:text-gray-300"}`}>
                        <Hotel size={11} /> CHECKED IN ({filteredSubmissions.filter(s => ["CHECKIN_APPROVED", "check_in", "guests", "ACTIVE"].includes(s.status)).length})
                      </button>
                      <button onClick={() => setRightTab("check_out")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${rightTab === "check_out" ? "bg-orange-900/40 text-orange-400 border border-orange-500/30" : "text-gray-500 hover:text-gray-300"}`}>
                        <Key size={11} /> CHECKOUT ({filteredSubmissions.filter(s => ["CHECKOUT_PENDING", "CHECKED_OUT", "CHECKOUT_APPROVED", "check_out", "pending"].includes(s.status)).length})
                      </button>
                      <button onClick={() => setRightTab("guests")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${rightTab === "guests" ? "bg-blue-900/40 text-blue-400 border border-blue-500/30" : "text-gray-500 hover:text-gray-300"}`}>
                        <Users size={11} /> ALL ({filteredSubmissions.length})
                      </button>
                      <button onClick={() => setRightTab("rejected")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${rightTab === "rejected" ? "bg-red-900/40 text-red-400 border border-red-500/30" : "text-gray-500 hover:text-gray-300"}`}>
                        <XCircle size={11} /> DENIED ({filteredSubmissions.filter(s => ["REJECTED", "rejected"].includes(s.status)).length})
                      </button>
                    </div>
                    <button onClick={fetchSubmissions} className="text-gray-500 hover:text-[#d4af37] transition-colors ml-2">
                      <RefreshCw className={`w-4 h-4 ${loadingSubmissions ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>

                {loadingSubmissions ? (
                  <div className="flex items-center justify-center py-16 flex-1">
                    <RefreshCw className="w-6 h-6 animate-spin text-gray-600" />
                  </div>
                ) : (
                  <div className="overflow-y-auto flex-1 space-y-3 pr-1">

                    {/* ── GUESTS TAB ── */}
                    {rightTab === "guests" && (() => {
                      if (filteredSubmissions.length === 0) return (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Users size={40} className="text-gray-700 mb-3" />
                          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">{searchQuery ? "No matches found" : "No guest records"}</p>
                        </div>
                      )
                      return (
                        <div className="flex flex-row overflow-x-auto gap-4 pb-6 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-[#d4af37]/20 scrollbar-track-transparent">
                          {filteredSubmissions.map((s: any) =>
                            ["CHECKIN_APPROVED", "guests", "check_in", "ACTIVE"].includes(s.status) ? (
                              <GuestCard 
                                key={s._id} 
                                s={s} 
                                rooms={rooms} 
                                token={token} 
                                notify={notify} 
                                fetchSubmissions={fetchSubmissions}
                                setExtendGuest={setExtendGuest}
                                setNewCheckOut={setNewCheckOut}
                              />
                            ) : (
                              <SubmissionCard key={s._id} s={s} />
                            )
                          )}
                        </div>
                      )
                    })()}

                    {/* ── CHECK-IN TAB ── */}
                    {rightTab === "check_in" && (() => {
                      const checkIns = filteredSubmissions.filter(s => ["CHECKIN_APPROVED", "check_in", "guests", "ACTIVE"].includes(s.status))
                      if (checkIns.length === 0) return (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Hotel size={40} className="text-gray-700 mb-3" />
                          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">{searchQuery ? "No matches found" : "No guests checking in"}</p>
                        </div>
                      )
                      return (
                        <div className="flex flex-row overflow-x-auto gap-4 pb-6 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-[#d4af37]/20 scrollbar-track-transparent">
                          {checkIns.map((s: any) => (
                            <GuestCard 
                              key={s._id} 
                              s={s} 
                              rooms={rooms} 
                              token={token} 
                              notify={notify} 
                              fetchSubmissions={fetchSubmissions}
                              setExtendGuest={setExtendGuest}
                              setNewCheckOut={setNewCheckOut}
                            />
                          ))}
                        </div>
                      )
                    })()}

                    {/* ── CHECK-OUT TAB ── */}
                    {rightTab === "check_out" && (() => {
                      const checkOuts = filteredSubmissions.filter(s => ["CHECKOUT_PENDING", "CHECKED_OUT", "CHECKOUT_APPROVED", "check_out", "pending"].includes(s.status))
                      if (checkOuts.length === 0) return (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <Key size={40} className="text-gray-700 mb-3" />
                          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">{searchQuery ? "No matches found" : "No guests checking out"}</p>
                        </div>
                      )
                      return (
                        <div className="flex flex-row overflow-x-auto gap-4 pb-6 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-[#d4af37]/20 scrollbar-track-transparent">
                          {checkOuts.map((s: any) => (
                            <GuestCard 
                              key={s._id} 
                              s={s} 
                              rooms={rooms} 
                              token={token} 
                              notify={notify} 
                              fetchSubmissions={fetchSubmissions}
                              setExtendGuest={setExtendGuest}
                              setNewCheckOut={setNewCheckOut}
                            />
                          ))}
                        </div>
                      )
                    })()}

                    {/* ── SUBMISSIONS TAB: pending only ── */}
                    {rightTab === "submissions" && (() => {
                      const pending = filteredSubmissions.filter(s => s.status === "CHECKIN_PENDING")
                      if (pending.length === 0) return (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <ClipboardList size={40} className="text-gray-700 mb-3" />
                          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">{searchQuery ? "No matches found" : "No pending requests"}</p>
                        </div>
                      )
                      return (
                        <div className="space-y-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-yellow-500 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                            Awaiting Admin Approval ({pending.length})
                          </p>
                          <div className="flex flex-row overflow-x-auto gap-4 pb-6 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-[#d4af37]/20 scrollbar-track-transparent">
                            {pending.map((s: any) => <SubmissionCard key={s._id} s={s} />)}
                          </div>
                        </div>
                      )
                    })()}

                    {/* ── REJECTED TAB ── */}
                    {rightTab === "rejected" && (() => {
                      const rejected = filteredSubmissions.filter(s => ["REJECTED", "rejected"].includes(s.status))
                      if (rejected.length === 0) return (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <XCircle size={40} className="text-gray-700 mb-3" />
                          <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest">{searchQuery ? "No matches found" : "No rejected requests"}</p>
                        </div>
                      )
                      return (
                        <div className="space-y-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Denied by Admin ({rejected.length})
                          </p>
                          <div className="flex flex-row overflow-x-auto gap-4 pb-6 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-[#d4af37]/20 scrollbar-track-transparent">
                            {rejected.map((s: any) => <SubmissionCard key={s._id} s={s} />)}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                  )}
                </div>
              </div>
            )}
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
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">How Many Days to Extend?</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={extendDays}
                  onChange={e => setExtendDays(e.target.value)}
                  placeholder="Enter number of days"
                  className="w-full bg-[#0f1110] border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-[#d4af37]/50 transition-all"
                />
              </div>

              <div className="bg-[#0f1110] rounded-xl p-3 border border-[#d4af37]/10 text-[10px] text-gray-500">
                This sends an extension request to admin with the added number of days.
              </div>

              <div className="flex gap-3">
                <button onClick={() => setExtendGuest(null)}
                  className="flex-1 py-3 bg-[#0f1110] border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">
                  Cancel
                </button>
                <button onClick={handleExtend} disabled={extending || !extendDays}
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
