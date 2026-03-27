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

interface Room {
  _id: string
  roomNumber: string
  floorId: any
}

interface Floor {
  _id: string
  floorNumber: string
  isVIP: boolean
}

interface Service {
  _id: string
  name: string
  category: string
  price: number
  isAvailable: boolean
}

interface MenuItem {
  _id: string
  name: string
  category: string
  price: number
  isVIP: boolean
}

export default function ReceptionDashboard() {
  const { user, token } = useAuth()
  const { notificationState, notify, closeNotification } = useConfirmation()

  const [formData, setFormData] = useState({
    guestName: "", phone: "", roomNumber: "", inquiryType: "",
    checkIn: "", checkOut: "", guests: "1", notes: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(true)

  const [rooms, setRooms] = useState<Room[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [loadingMetadata, setLoadingMetadata] = useState(false)

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoadingSubmissions(true)
      const res = await fetch("/api/reception-requests", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setSubmissions(await res.json())
    } catch { /* silent */ }
    finally { setLoadingSubmissions(false) }
  }, [token])

  const fetchMetadata = useCallback(async () => {
    try {
      setLoadingMetadata(true)
      const headers = { Authorization: `Bearer ${token}` }
      const [resRooms, resFloors, resServices, resMenu] = await Promise.all([
        fetch("/api/admin/rooms", { headers }),
        fetch("/api/admin/floors", { headers }),
        fetch("/api/admin/services", { headers }),
        fetch("/api/admin/menu", { headers })
      ])

      if (resRooms.ok) setRooms((await resRooms.json()).sort((a: any, b: any) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })))
      if (resFloors.ok) setFloors(await resFloors.json())
      if (resServices.ok) setServices(await resServices.json())
      if (resMenu.ok) setMenuItems(await resMenu.json())
    } catch (error) {
      console.error("Metadata fetch error:", error)
    } finally {
      setLoadingMetadata(false)
    }
  }, [token])

  useEffect(() => { 
    if (token) {
      fetchSubmissions()
      fetchMetadata()
    }
  }, [token, fetchSubmissions, fetchMetadata])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.inquiryType) {
      notify({ title: "Missing Field", message: "Please select an inquiry type.", type: "error" })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/reception-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(formData),
      })
      if (res.ok) {
        notify({ title: "Submitted!", message: `Request for ${formData.guestName} has been recorded.`, type: "success" })
        setFormData({ guestName: "", phone: "", roomNumber: "", inquiryType: "", checkIn: "", checkOut: "", guests: "1", notes: "" })
        setSelectedRoom(null)
        fetchSubmissions()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to submit", type: "error" })
      }
    } catch {
      notify({ title: "Error", message: "Network error", type: "error" })
    }
    setSubmitting(false)
  }

  return (
    <ProtectedRoute requiredRoles={["reception", "admin"]}>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6 overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-6 w-full">
          <BentoNavbar />

          {/* Header */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="text-2xl">🛎️</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Reception Desk</h1>
                <p className="text-sm text-gray-500 mt-0.5">Welcome, {user?.name} — log guest requests and inquiries below.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
                <h2 className="text-xs font-black text-gray-500 mb-6 uppercase tracking-widest">📝 New Guest Request</h2>
                <form onSubmit={handleSubmit} className="space-y-5">

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Inquiry Type *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {INQUIRY_TYPES.map((type) => (
                        <button key={type.value} type="button"
                          onClick={() => setFormData({ ...formData, inquiryType: type.value })}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-bold transition-all ${
                            formData.inquiryType === type.value
                              ? "bg-[#8B4513] text-white border-[#8B4513] shadow-lg"
                              : "bg-gray-50 text-gray-500 border-gray-100 hover:border-[#8B4513]/30 hover:bg-orange-50"
                          }`}
                        >
                          <span className="text-lg">{type.icon}</span>
                          <span>{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Guest Name *</label>
                      <input required name="guestName" value={formData.guestName} onChange={handleChange}
                        placeholder="Full name"
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Phone Number</label>
                      <input name="phone" type="tel" value={formData.phone} onChange={handleChange}
                        placeholder="+251 9XX XXX XXX"
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Room *</label>
                      <select required name="roomNumber" value={formData.roomNumber} 
                        onChange={(e) => {
                          const room = rooms.find(r => r.roomNumber === e.target.value)
                          setSelectedRoom(room || null)
                          setFormData({ ...formData, roomNumber: e.target.value })
                        }}
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10 appearance-none">
                        <option value="">Select Room…</option>
                        {rooms.map(r => <option key={r._id} value={r.roomNumber}>Room {r.roomNumber}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Number of Guests</label>
                      <select name="guests" value={formData.guests} onChange={handleChange}
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10 appearance-none">
                        {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} Guest{n > 1 ? "s" : ""}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* VIP Status Indicator (Context Aware) */}
                  {selectedRoom && (
                    <div className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${
                      floors.find(f => f._id === (selectedRoom.floorId?._id || selectedRoom.floorId))?.isVIP 
                        ? "bg-purple-50 border-purple-200 text-purple-700" 
                        : "bg-blue-50 border-blue-200 text-blue-700"
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{floors.find(f => f._id === (selectedRoom.floorId?._id || selectedRoom.floorId))?.isVIP ? "💎" : "🚪"}</span>
                        <div>
                          <p className="font-black text-xs uppercase tracking-widest">
                            {floors.find(f => f._id === (selectedRoom.floorId?._id || selectedRoom.floorId))?.isVIP ? "VIP Location" : "Standard Location"}
                          </p>
                          <p className="text-[10px] opacity-70">Floor {floors.find(f => f._id === (selectedRoom.floorId?._id || selectedRoom.floorId))?.floorNumber}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Service / Menu Browser (Conditional) */}
                  {formData.inquiryType === 'room_service' && (
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                         <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">🍽️ Service Catalog</h3>
                         <span className="text-[10px] font-bold text-gray-400">
                           {floors.find(f => f._id === (selectedRoom?.floorId?._id || selectedRoom?.floorId))?.isVIP ? "Showing All Items (VIP Access)" : "Standard Menu Only"}
                         </span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2">
                         {/* Core Services */}
                         {services.map(s => (
                           <button key={s._id} type="button" 
                             onClick={() => setFormData({ ...formData, notes: `${formData.notes}\n- Request: ${s.name} (${s.price} Br)`.trim() })}
                             className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-[#8B4513]/10 transition-all text-left">
                             <div>
                               <p className="font-bold text-sm text-gray-900">{s.name}</p>
                               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.category}</p>
                             </div>
                             <span className="font-black text-[#8B4513] text-sm">{s.price} Br</span>
                           </button>
                         ))}
                         
                         {/* Menu Items (Filtered by VIP) */}
                         {menuItems
                           .filter(item => !item.isVIP || floors.find(f => f._id === (selectedRoom?.floorId?._id || selectedRoom?.floorId))?.isVIP)
                           .map(item => (
                             <button key={item._id} type="button"
                               onClick={() => setFormData({ ...formData, notes: `${formData.notes}\n- Menu: ${item.name} (${item.price} Br)`.trim() })}
                               className={`flex items-center justify-between p-3 rounded-xl hover:bg-white hover:shadow-md border border-transparent hover:border-[#8B4513]/10 transition-all text-left ${
                                 item.isVIP ? "bg-purple-50/50" : "bg-gray-50"
                               }`}>
                               <div className="flex items-center gap-3">
                                 {item.isVIP && <span className="text-sm">💎</span>}
                                 <div>
                                   <p className="font-bold text-sm text-gray-900">{item.name}</p>
                                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.category} {item.isVIP && "• VIP"}</p>
                                 </div>
                               </div>
                               <span className="font-black text-[#8B4513] text-sm">{item.price} Br</span>
                             </button>
                           ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Check-In Date</label>
                      <input name="checkIn" type="date" value={formData.checkIn} onChange={handleChange}
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Check-Out Date</label>
                      <input name="checkOut" type="date" value={formData.checkOut} onChange={handleChange}
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Special Requests / Notes</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3}
                      placeholder="Additional details or remarks..."
                      className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10 resize-none" />
                  </div>

                  <button type="submit" disabled={submitting}
                    className="w-full bg-[#8B4513] text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[#8B4513]/20 hover:bg-[#A0522D] transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                    {submitting ? "Submitting…" : "✓ Submit Request"}
                  </button>
                </form>
              </div>
            </div>

            {/* Recent Submissions */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest">📋 My Submissions ({submissions.length})</h2>
                  <button onClick={fetchSubmissions} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <RefreshCw className={`w-4 h-4 ${loadingSubmissions ? "animate-spin" : ""}`} />
                  </button>
                </div>
                {loadingSubmissions ? (
                  <div className="flex items-center justify-center py-16"><RefreshCw className="w-6 h-6 animate-spin text-gray-300" /></div>
                ) : submissions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="text-5xl mb-3 opacity-20">🏨</div>
                    <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">No submissions yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                    {submissions.map((s: any) => {
                      const type = INQUIRY_TYPES.find(t => t.value === s.inquiryType)
                      return (
                        <div key={s._id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{type?.icon ?? "💬"}</span>
                              <span className="font-black text-gray-900 text-sm">{s.guestName}</span>
                            </div>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${STATUS_STYLES[s.status] || STATUS_STYLES.pending}`}>
                              {s.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[11px] text-gray-500 font-medium">
                            {s.roomNumber && <span>🚪 Room {s.roomNumber}</span>}
                            {s.phone && <span>📞 {s.phone}</span>}
                            {s.guests && <span>👥 {s.guests} guest{parseInt(s.guests) > 1 ? "s" : ""}</span>}
                            {s.checkIn && <span>📅 {s.checkIn} → {s.checkOut || "?"}</span>}
                          </div>
                          {s.notes && (
                            <p className="mt-2 text-xs text-gray-500 bg-white rounded-lg p-2 border border-gray-100 italic">"{s.notes}"</p>
                          )}
                          {s.reviewNote && (
                            <p className="mt-2 text-xs text-blue-600 bg-blue-50 rounded-lg p-2 border border-blue-100">💬 {s.reviewNote}</p>
                          )}
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
