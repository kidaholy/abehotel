"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { MenuManagementSection } from "@/components/admin/menu-management-section"
import { 
  Plus, 
  Trash2, 
  Pencil, 
  X,
  Building,
  RefreshCw,
  Wine,
  Bed,
  Utensils,
  Crown,
  ArrowRight,
  ChefHat
} from "lucide-react"

type Tab = "menu-standard" | "vip" | "rooms"

interface TabButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
        active 
          ? "bg-[#8B4513] text-white shadow-lg" 
          : "bg-white text-gray-400 hover:text-gray-600 border border-gray-100"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

interface Room {
  _id: string
  roomNumber: string
  name?: string
  floorId: any
  type: string
  category: string
  price: number
  status: string
}

interface Floor {
  _id: string
  floorNumber: number
  type: string
  isVIP: boolean
}

export default function AdminServicesPage() {
  const { token } = useAuth()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

  const [activeTab, setActiveTab] = useState<Tab>("menu-standard")
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<Room[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [showForm, setShowForm] = useState(false)
  
  const [roomForm, setRoomForm] = useState({
    roomNumber: "", name: "", floorId: "", type: "standard", category: "Standard", price: "", status: "available"
  })
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const [roomsRes, floorsRes] = await Promise.all([
        fetch("/api/admin/rooms", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/floors", { headers: { Authorization: `Bearer ${token}` } })
      ])
      
      if (roomsRes.ok) setRooms(await roomsRes.json())
      if (floorsRes.ok) setFloors(await floorsRes.json())
    } catch (error) {
      console.error("Fetch error:", error)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomForm.roomNumber || !roomForm.floorId) {
      notify({ title: "Missing Fields", message: "Room number and floor are required.", type: "error" })
      return
    }
    setFormLoading(true)
    try {
      const url = editingRoom ? `/api/admin/rooms/${editingRoom._id}` : "/api/admin/rooms"
      const method = editingRoom ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...roomForm, price: parseFloat(roomForm.price || "0") }),
      })
      if (res.ok) {
        notify({ title: editingRoom ? "Room Updated" : "Room Created", message: `Room ${roomForm.roomNumber} has been saved.`, type: "success" })
        resetRoomForm()
        fetchData()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to save room", type: "error" })
      }
    } catch {
      notify({ title: "Error", message: "Network error", type: "error" })
    } finally {
      setFormLoading(false)
    }
  }

  const handleRoomDelete = async (room: Room) => {
    const confirmed = await confirm({
      title: "Delete Room", 
      message: `Delete Room "${room.roomNumber}"?`,
      type: "danger", confirmText: "Delete", cancelText: "Cancel"
    })
    if (!confirmed) return
    try {
      const res = await fetch(`/api/admin/rooms/${room._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { fetchData(); notify({ title: "Deleted", message: `Room removed.`, type: "success" }) }
    } catch { notify({ title: "Error", message: "Failed to delete", type: "error" }) }
  }

  const handleEdit = (room: Room) => {
    setEditingRoom(room)
    setRoomForm({
      roomNumber: room.roomNumber, 
      name: room.name || "", 
      floorId: room.floorId?._id || room.floorId || "",
      type: room.type, 
      category: room.category, 
      price: room.price.toString(), 
      status: room.status
    })
    setShowForm(true)
  }

  const resetRoomForm = () => {
    setEditingRoom(null)
    setRoomForm({ roomNumber: "", name: "", floorId: "", type: "standard", category: "Standard", price: "", status: "available" })
    setShowForm(false)
  }

  const router = useRouter()

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Tab Bar — 3 tabs only */}
          <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-gray-200 overflow-x-auto gap-2">
            <TabButton active={activeTab === "rooms"} onClick={() => setActiveTab("rooms")} icon={<Building size={18} />} label="Room Management" />
            <TabButton active={activeTab === "menu-standard"} onClick={() => setActiveTab("menu-standard")} icon={<Utensils size={18} />} label="Standard Menu" />
            <TabButton active={activeTab === "vip"} onClick={() => setActiveTab("vip")} icon={<Crown size={18} />} label="VIP Menus" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {activeTab === "rooms" && (
              <div className="lg:col-span-3 flex flex-col gap-4 lg:sticky lg:top-4">
                <div className="bg-[#8B4513] rounded-2xl p-6 shadow-xl shadow-[#8B4513]/20 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <h1 className="text-2xl font-black mb-1 tracking-tight flex items-center gap-2">
                      Rooms <Bed size={24} />
                    </h1>
                    <p className="opacity-70 text-xs font-bold uppercase tracking-widest mb-5">
                      {rooms.length} units
                    </p>
                    <button onClick={() => { resetRoomForm(); setShowForm(true) }}
                      className="w-full bg-white text-[#8B4513] px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-gray-100 transition-all flex items-center justify-center gap-2">
                      <Plus size={16} /> Add Room
                    </button>
                    <button onClick={fetchData} className="mt-2 w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                      <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className={activeTab === "rooms" ? "lg:col-span-9" : "lg:col-span-12"}>
              <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 min-h-[70vh]">
                {loading && activeTab === "rooms" ? (
                  <div className="flex flex-col items-center justify-center py-40">
                    <RefreshCw className="w-12 h-12 animate-spin text-gray-200 mb-6" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading...</p>
                  </div>
                ) : (
                  <>
                    {activeTab === "menu-standard" && (
                      <MenuManagementSection
                        confirm={confirm}
                        notify={notify}
                        showTitle={true}
                        title="Standard Menu Management"
                        apiBaseUrl="/api/admin/menu"
                        categoryType="menu"
                      />
                    )}

                    {/* VIP Landing Page */}
                    {activeTab === "vip" && (
                      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
                        <div className="text-center">
                          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 mb-4">
                            <Crown size={40} className="text-purple-600" />
                          </div>
                          <h2 className="text-3xl font-black text-gray-900 mb-2">VIP Menu Management</h2>
                          <p className="text-gray-400 font-medium text-sm">Select a VIP tier to manage its menu items independently</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                          {/* VIP 1 Card */}
                          <button
                            onClick={() => router.push("/admin/vip1-menu")}
                            className="group bg-gradient-to-br from-purple-600 to-purple-800 text-white rounded-3xl p-8 shadow-xl shadow-purple-500/20 hover:shadow-2xl hover:shadow-purple-500/30 hover:-translate-y-1 transition-all flex flex-col items-center gap-4 text-left"
                          >
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Wine size={32} className="text-white" />
                            </div>
                            <div className="text-center">
                              <h3 className="text-2xl font-black mb-1">VIP 1 Menu</h3>
                              <p className="text-purple-200 text-xs font-bold uppercase tracking-widest">Manage vip1menuitems</p>
                            </div>
                            <div className="flex items-center gap-2 text-purple-200 text-sm font-bold mt-2 group-hover:gap-3 transition-all">
                              Open Manager <ArrowRight size={16} />
                            </div>
                          </button>

                          {/* VIP 2 Card */}
                          <button
                            onClick={() => router.push("/admin/vip2-menu")}
                            className="group bg-gradient-to-br from-amber-600 to-amber-800 text-white rounded-3xl p-8 shadow-xl shadow-amber-500/20 hover:shadow-2xl hover:shadow-amber-500/30 hover:-translate-y-1 transition-all flex flex-col items-center gap-4 text-left"
                          >
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                              <ChefHat size={32} className="text-white" />
                            </div>
                            <div className="text-center">
                              <h3 className="text-2xl font-black mb-1">VIP 2 Menu</h3>
                              <p className="text-amber-200 text-xs font-bold uppercase tracking-widest">Manage vip2menuitems</p>
                            </div>
                            <div className="flex items-center gap-2 text-amber-200 text-sm font-bold mt-2 group-hover:gap-3 transition-all">
                              Open Manager <ArrowRight size={16} />
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === "rooms" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.map(room => (
                          <div key={room._id} className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
                             <div className="flex justify-between items-start mb-4">
                               <div className="flex gap-4 items-center">
                                 <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-[#8B4513] group-hover:scale-110 transition-transform"><Bed size={24} /></div>
                                 <div>
                                   <h3 className="text-xl font-black text-gray-900 leading-none">Room {room.roomNumber}</h3>
                                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{room.category} • Floor {floors.find(f => f._id === room.floorId)?.floorNumber || '?'}</p>
                                 </div>
                               </div>
                               <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${room.status === 'available' ? 'bg-green-100 text-green-600' : room.status === 'occupied' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                 {room.status}
                               </span>
                             </div>
                             <div className="flex justify-between items-center mt-6">
                               <span className="text-lg font-black text-gray-900">{room.price} Br</span>
                               <div className="flex gap-2">
                                 <button onClick={() => handleEdit(room)} className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-[#8B4513] transition-colors"><Pencil size={16} /></button>
                                 <button onClick={() => handleRoomDelete(room)} className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                               </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full relative overflow-hidden">
              <button onClick={resetRoomForm} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
              <div className="p-8">
                <h2 className="text-3xl font-black text-gray-900 mb-8">{editingRoom ? "Edit Room" : "New Room"}</h2>
                <form onSubmit={handleRoomSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Room Number</label>
                      <input required value={roomForm.roomNumber} onChange={e => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#8B4513]/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Floor</label>
                      <select required value={roomForm.floorId} onChange={e => setRoomForm({ ...roomForm, floorId: e.target.value })}
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#8B4513]/20">
                        <option value="">Select Floor…</option>
                        {floors.map(f => <option key={f._id} value={f._id}>Floor {f.floorNumber}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Price (Br)</label>
                      <input required type="number" value={roomForm.price} onChange={e => setRoomForm({ ...roomForm, price: e.target.value })}
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#8B4513]/20" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Category</label>
                      <select value={roomForm.category} onChange={e => setRoomForm({ ...roomForm, category: e.target.value })}
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#8B4513]/20">
                        <option value="Standard">Standard</option>
                        <option value="Deluxe">Deluxe</option>
                        <option value="Suite">Suite</option>
                        <option value="VIP">VIP</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={formLoading} className="w-full bg-[#8B4513] text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-[#8B4513]/20">
                    {formLoading ? "Saving…" : "Save Room"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        <ConfirmationCard isOpen={confirmationState.isOpen} onClose={closeConfirmation} onConfirm={confirmationState.onConfirm}
          title={confirmationState.options.title} message={confirmationState.options.message} type={confirmationState.options.type} />
        <NotificationCard isOpen={notificationState.isOpen} onClose={closeNotification}
          title={notificationState.options.title} message={notificationState.options.message} type={notificationState.options.type} />
      </div>
    </ProtectedRoute>
  )
}
