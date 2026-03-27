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
  Wine, 
  RefreshCw, 
  Utensils, 
  Bed, 
  Layers, 
  Building, 
  Plus, 
  Trash2, 
  Pencil, 
  X
} from "lucide-react"

interface VIPMenuItem {
  _id: string
  name: string
  category: string
  price: number
  available: boolean
  description?: string
  image?: string
}

export default function AdminServicesPage() {
  const router = useRouter()
  const { token } = useAuth()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

  const [activeTab, setActiveTab] = useState<Tab>("menu")
  const [rooms, setRooms] = useState<Room[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [vipMenuItems, setVipMenuItems] = useState<VIPMenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [vipSubTab, setVipSubTab] = useState<"floors" | "menu">("floors")
  
  const [roomForm, setRoomForm] = useState({
    roomNumber: "", name: "", floorId: "", type: "standard", category: "Standard", price: "", status: "available"
  })
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  const [vipMenuForm, setVipMenuForm] = useState({
    name: "", category: "VIP Special", price: "", description: "", available: true
  })
  const [editingVipItem, setEditingVipItem] = useState<VIPMenuItem|null>(null)

  const [formLoading, setFormLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const headers = { Authorization: `Bearer ${token}` }
      const [resRooms, resFloors, resVipMenu] = await Promise.all([
        fetch("/api/admin/rooms", { headers }),
        fetch("/api/admin/floors", { headers }),
        fetch("/api/admin/vip-menu", { headers })
      ])

      if (resRooms.ok) setRooms(await resRooms.json())
      if (resFloors.ok) setFloors(await resFloors.json())
      if (resVipMenu.ok) setVipMenuItems(await resVipMenu.json())
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

  const handleVipMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vipMenuForm.name || !vipMenuForm.price) {
      notify({ title: "Missing Fields", message: "Name and price are required.", type: "error" })
      return
    }
    setFormLoading(true)
    try {
      const url = editingVipItem ? `/api/admin/vip-menu/${editingVipItem._id}` : "/api/admin/vip-menu"
      const method = editingVipItem ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...vipMenuForm, price: parseFloat(vipMenuForm.price || "0") }),
      })
      if (res.ok) {
        notify({ title: "Success", message: "VIP Menu item saved", type: "success" })
        resetVipMenuForm()
        fetchData()
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

  const handleVipDelete = async (item: VIPMenuItem) => {
    const confirmed = await confirm({ title: "Delete Item", message: `Remove "${item.name}" from VIP menu?`, type: "danger" })
    if (!confirmed) return
    try {
      const res = await fetch(`/api/admin/vip-menu/${item._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) fetchData()
    } catch { notify({ title: "Error", message: "Failed to delete", type: "error" }) }
  }

  const handleToggleVip = async (type: 'floor' | 'menu', id: string, current: boolean) => {
    try {
      let url = ""
      let body = {}
      if (type === 'floor') {
        url = "/api/admin/floors"
        body = { id, isVIP: !current }
      } else if (type === 'menu') {
        url = `/api/admin/menu/${id}`
        body = { isVIP: !current }
      }
      
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (res.ok) fetchData()
    } catch { /* silent */ }
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

  const handleEditVip = (item: VIPMenuItem) => {
    setEditingVipItem(item)
    setVipMenuForm({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      description: item.description || "",
      available: item.available
    })
    setShowForm(true)
  }

  const resetRoomForm = () => {
    setEditingRoom(null)
    setRoomForm({ roomNumber: "", name: "", floorId: "", type: "standard", category: "Standard", price: "", status: "available" })
    setShowForm(false)
  }

  const resetVipMenuForm = () => {
    setEditingVipItem(null)
    setVipMenuForm({ name: "", category: "VIP Special", price: "", description: "", available: true })
    setShowForm(false)
  }

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Master Tabs */}
          <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-gray-200 overflow-x-auto gap-2">
            {[
              { id: "menu", label: "Menu Items", icon: <Utensils size={18} /> },
              { id: "rooms", label: "Hotel Rooms", icon: <Bed size={18} /> },
              { id: "floors", label: "VIP Management", icon: <Layers size={18} /> }
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shrink-0 ${activeTab === tab.id ? "bg-[#8B4513] text-white shadow-lg" : "text-gray-400 hover:bg-gray-50"}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sidebar - Hidden for Menu tab to avoid double sidebars */}
            {activeTab !== "menu" && (
              <div className="lg:col-span-3 flex flex-col gap-4 lg:sticky lg:top-4">
                <div className="bg-[#8B4513] rounded-2xl p-6 shadow-xl shadow-[#8B4513]/20 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <h1 className="text-2xl font-black mb-1 tracking-tight flex items-center gap-2">
                    {activeTab === "rooms" ? "Rooms" : "VIP Management"}
                    {activeTab === "rooms" ? <Bed size={24} /> : <Building size={24} />}
                  </h1>
                  <p className="opacity-70 text-xs font-bold uppercase tracking-widest mb-5">
                    {activeTab === "rooms" ? `${rooms.length} rooms` : `${floors.length} floors`}
                  </p>
                    
                    {activeTab === "rooms" ? (
                      <button onClick={() => { resetRoomForm(); setShowForm(true) }}
                        className="w-full bg-white text-[#8B4513] px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-gray-100 transition-all flex items-center justify-center gap-2 active:scale-95">
                        <Plus size={16} /> Add Room
                      </button>
                    ) : (
                      <button onClick={() => { resetVipMenuForm(); setShowForm(true) }}
                         className="w-full bg-white text-[#8B4513] px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-gray-100 transition-all flex items-center justify-center gap-2 active:scale-95">
                         <Plus size={16} /> New VIP Item
                       </button>
                    )}
                    
                    <button onClick={fetchData} className="mt-2 w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                      <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                  </div>
                  <div className="absolute -bottom-4 -right-4 text-8xl opacity-10 transform -rotate-12">
                     {activeTab === "rooms" ? <Bed size={96} /> : <Building size={96} />}
                  </div>
                </div>

                {/* Summary Info */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">📊 Statistics</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-medium">Total Items</span>
                      <span className="font-black text-gray-900">{activeTab === "rooms" ? rooms.length : floors.length}</span>
                    </div>
                    {activeTab === "floors" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 font-medium">VIP Menu Items</span>
                        <span className="font-black text-amber-600">{vipMenuItems.length}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className={activeTab === "menu" ? "lg:col-span-12" : "lg:col-span-9"}>
              <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 min-h-[70vh]">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                      {activeTab === "menu" ? "Dining Integration" : activeTab === "rooms" ? "Room Inventory" : "VIP Management"}
                    </h2>
                    <p className="text-[#8B4513]/40 text-xs font-bold uppercase tracking-widest mt-1">
                      {activeTab === "menu" ? "Sync and flag menu items for room service" : activeTab === "rooms" ? "Monitor and manage hotel rooms" : "Manage VIP floor access and status"}
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-40">
                    <RefreshCw className="w-12 h-12 animate-spin text-gray-200 mb-6" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading...</p>
                  </div>
                ) : (
                  <>
                    {activeTab === "menu" && (
                      <MenuManagementSection 
                        confirm={confirm} 
                        notify={notify} 
                        showTitle={false} 
                      />
                    )}

                    {activeTab === "rooms" && (
                      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {rooms.map(room => (
                          <div key={room._id} className="group bg-gray-50 rounded-[2.5rem] p-6 border-2 border-transparent hover:border-[#8B4513]/10 hover:bg-white transition-all relative">
                            <div className="flex flex-col items-center text-center">
                              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-[#8B4513] shadow-sm mb-4 group-hover:scale-110 transition-transform"><Bed size={32} /></div>
                              <h3 className="font-black text-gray-900 text-xl leading-none">Room {room.roomNumber}</h3>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">{room.category} • {room.price} Br</p>
                              
                              <div className="flex gap-2 mt-6">
                                <button onClick={() => handleEdit(room)} className="p-3 bg-white rounded-2xl text-gray-400 hover:text-[#8B4513] shadow-sm hover:shadow transition-all"><Pencil size={16} /></button>
                                <button onClick={() => handleRoomDelete(room)} className="p-3 bg-white rounded-2xl text-gray-400 hover:text-red-500 shadow-sm hover:shadow transition-all"><Trash2 size={16} /></button>
                              </div>
                            </div>
                            <div className={`absolute top-5 right-5 w-3 h-3 rounded-full shadow-sm border-2 border-white ${room.status === 'available' ? 'bg-green-500' : room.status === 'occupied' ? 'bg-red-500' : 'bg-amber-500'}`} />
                          </div>
                        ))}
                        {rooms.length === 0 && (
                          <div className="col-span-full py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">No rooms registered</div>
                        )}
                      </div>
                    )}

                    {activeTab === "floors" && (
                      <div className="space-y-8">
                        {/* Sub-tabs for VIP Management */}
                        <div className="flex gap-3 bg-gray-50 p-1.5 rounded-2xl w-fit">
                           <button onClick={() => setVipSubTab("floors")}
                             className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${vipSubTab === "floors" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                             Floor Status
                           </button>
                           <button onClick={() => setVipSubTab("menu")}
                             className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${vipSubTab === "menu" ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                             Special Menu
                           </button>
                        </div>

                        {vipSubTab === "floors" ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {floors.map(floor => (
                              <div key={floor._id} className="flex items-center justify-between p-6 bg-gray-50 rounded-[2.5rem] border-2 border-transparent hover:border-[#8B4513]/10 transition-all">
                                 <div className="flex items-center gap-5">
                                   <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-2xl shadow-sm font-black text-[#8B4513]">F{floor.floorNumber}</div>
                                   <div>
                                     <h3 className="font-black text-gray-900 text-xl">Floor {floor.floorNumber}</h3>
                                     <div className="flex gap-2 mt-2">
                                       <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${floor.type === 'vip' ? 'bg-purple-600/10 text-purple-600' : 'bg-blue-600/10 text-blue-600'}`}>
                                         {floor.type}
                                       </span>
                                       {floor.isVIP && <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/10 text-amber-500">VIP Enabled</span>}
                                     </div>
                                   </div>
                                 </div>
                                 
                                 <div className="flex items-center gap-6 pr-4">
                                   <div className="flex flex-col items-center gap-2">
                                     <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">VIP FLOOR</span>
                                     <button onClick={() => handleToggleVip('floor', floor._id, floor.isVIP)}
                                       className={`w-14 h-7 rounded-full relative transition-all shadow-inner ${floor.isVIP ? "bg-amber-500" : "bg-gray-200"}`}>
                                       <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-all ${floor.isVIP ? "left-8" : "left-1"}`} />
                                     </button>
                                   </div>
                                 </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {vipMenuItems.map(item => (
                              <div key={item._id} className="flex items-center justify-between p-6 bg-gray-50 rounded-[2.5rem] border-2 border-transparent hover:border-[#8B4513]/10 transition-all group">
                                <div className="flex items-center gap-5">
                                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-2xl shadow-sm text-[#8B4513] group-hover:scale-110 transition-transform">
                                    <Wine size={28} />
                                  </div>
                                  <div>
                                    <h3 className="font-black text-gray-900 text-xl leading-none">{item.name}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">{item.category} • {item.price} Br</p>
                                  </div>
                                </div>
                                <div className="flex gap-2 pr-2">
                                  <button onClick={() => handleEditVip(item)} className="p-3 bg-white rounded-2xl text-gray-400 hover:text-[#8B4513] shadow-sm hover:shadow transition-all"><Pencil size={16} /></button>
                                  <button onClick={() => handleVipDelete(item)} className="p-3 bg-white rounded-2xl text-gray-400 hover:text-red-500 shadow-sm hover:shadow transition-all"><Trash2 size={16} /></button>
                                </div>
                              </div>
                            ))}
                            {vipMenuItems.length === 0 && (
                              <div className="col-span-full py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-gray-100 rounded-[2.5rem]">No special VIP items yet</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-lg w-full relative overflow-hidden flex flex-col max-h-[90vh]">
              <button onClick={() => { activeTab === 'rooms' ? resetRoomForm() : resetVipMenuForm() }} 
                className="absolute top-6 right-6 w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-bold text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all z-10"><X size={20} /></button>
              
              <div className="flex-1 overflow-y-auto p-8 pt-16">
                {activeTab === 'rooms' ? (
                  <>
                    <h2 className="text-3xl font-black text-gray-900 mb-8 leading-none">{editingRoom ? "Edit Room" : "New Room"}</h2>
                    <form onSubmit={handleRoomSubmit} className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Room Number</label>
                          <input required value={roomForm.roomNumber} onChange={e => setRoomForm({ ...roomForm, roomNumber: e.target.value })} placeholder="e.g. 101"
                            className="w-full bg-gray-50 rounded-[1.25rem] px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10" />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Floor</label>
                          <select required value={roomForm.floorId} onChange={e => setRoomForm({ ...roomForm, floorId: e.target.value })}
                            className="w-full bg-gray-50 rounded-[1.25rem] px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10 appearance-none">
                            <option value="">Select Floor…</option>
                            {floors.map(f => <option key={f._id} value={f._id}>Floor {f.floorNumber} ({f.type})</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Price (Br)</label>
                          <input required type="number" min="0" value={roomForm.price} onChange={e => setRoomForm({ ...roomForm, price: e.target.value })} placeholder="0"
                            className="w-full bg-gray-50 rounded-[1.25rem] px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10" />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Category</label>
                          <select value={roomForm.category} onChange={e => setRoomForm({ ...roomForm, category: e.target.value })}
                            className="w-full bg-gray-50 rounded-[1.25rem] px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10 appearance-none">
                            <option value="Standard">Standard</option>
                            <option value="Deluxe">Deluxe</option>
                            <option value="Suite">Suite</option>
                            <option value="VIP">VIP</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Status</label>
                        <select value={roomForm.status} onChange={e => setRoomForm({ ...roomForm, status: e.target.value })}
                          className="w-full bg-gray-50 rounded-[1.25rem] px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10 appearance-none">
                          <option value="available">Available</option>
                          <option value="occupied">Occupied</option>
                          <option value="maintenance">Maintenance</option>
                        </select>
                      </div>
                      <button type="submit" disabled={formLoading} className="w-full bg-[#8B4513] text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[#8B4513]/30 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50">
                        {formLoading ? "Processing…" : editingRoom ? "Update Room" : "Create Room"}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-black text-gray-900 mb-8 leading-none">{editingVipItem ? "Edit VIP Item" : "New VIP Item"}</h2>
                    <form onSubmit={handleVipMenuSubmit} className="space-y-6">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Item Name</label>
                        <input required value={vipMenuForm.name} onChange={e => setVipMenuForm({ ...vipMenuForm, name: e.target.value })} placeholder="e.g. Premium Champagne"
                          className="w-full bg-gray-50 rounded-[1.25rem] px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Category</label>
                          <input value={vipMenuForm.category} onChange={e => setVipMenuForm({ ...vipMenuForm, category: e.target.value })} placeholder="VIP Special"
                            className="w-full bg-gray-50 rounded-[1.25rem] px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10" />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Price (Br)</label>
                          <input required type="number" min="0" value={vipMenuForm.price} onChange={e => setVipMenuForm({ ...vipMenuForm, price: e.target.value })} placeholder="0"
                            className="w-full bg-gray-50 rounded-[1.25rem] px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Short Description</label>
                        <textarea rows={2} value={vipMenuForm.description} onChange={e => setVipMenuForm({ ...vipMenuForm, description: e.target.value })} placeholder="Exquisite selection for VIPs..."
                          className="w-full bg-gray-50 rounded-[1.25rem] px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10 resize-none" />
                      </div>
                      <button type="submit" disabled={formLoading} className="w-full bg-[#8B4513] text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[#8B4513]/30 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50">
                        {formLoading ? "Processing…" : editingVipItem ? "Update VIP Item" : "Create VIP Item"}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <ConfirmationCard isOpen={confirmationState.isOpen} onClose={closeConfirmation} onConfirm={confirmationState.onConfirm}
          title={confirmationState.options.title} message={confirmationState.options.message} type={confirmationState.options.type}
          confirmText={confirmationState.options.confirmText} cancelText={confirmationState.options.cancelText} icon={confirmationState.options.icon} />
        <NotificationCard isOpen={notificationState.isOpen} onClose={closeNotification}
          title={notificationState.options.title} message={notificationState.options.message}
          type={notificationState.options.type} autoClose={notificationState.options.autoClose} duration={notificationState.options.duration} />
      </div>
    </ProtectedRoute>
  )
}
