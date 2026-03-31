"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { MenuManagementSection, CategoryManager } from "@/components/admin/menu-management-section"
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
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${
        active 
          ? "bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] shadow-[0_0_15px_rgba(212,175,55,0.2)]" 
          : "bg-[#0f1110] text-gray-500 hover:text-white border border-white/5 hover:border-[#d4af37]/30"
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
  
  const [categories, setCategories] = useState<any[]>([])
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  const [roomForm, setRoomForm] = useState({
    roomNumber: "", name: "", floorId: "", type: "standard", category: "Standard", price: "", status: "available"
  })
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const [roomsRes, floorsRes, categoriesRes] = await Promise.all([
        fetch("/api/admin/rooms", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/floors", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/categories?type=room", { headers: { Authorization: `Bearer ${token}` } })
      ])
      
      if (roomsRes.ok) setRooms(await roomsRes.json())
      if (floorsRes.ok) setFloors(await floorsRes.json())
      if (categoriesRes.ok) setCategories(await categoriesRes.json())
    } catch (error) {
      console.error("Fetch error:", error)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    setCategoryLoading(true)
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newCategoryName, type: "room" }),
      })
      if (response.ok) { setNewCategoryName(""); fetchData() }
    } catch (error) { console.error("Error adding category:", error) } 
    finally { setCategoryLoading(false) }
  }

  const handleDeleteCategory = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Category", message: "Are you sure you want to delete this category?", type: "warning",
      confirmText: "Delete", cancelText: "Cancel"
    })
    if (!confirmed) return
    try {
      const response = await fetch(`/api/categories/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (response.ok) fetchData()
    } catch (error) { console.error("Error deleting category:", error) }
  }

  const handleUpdateCategory = async (id: string, newName: string) => {
    if (!newName.trim()) return
    setCategoryLoading(true)
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName }),
      })
      if (response.ok) fetchData()
    } catch (error) { console.error("Error updating category:", error) } 
    finally { setCategoryLoading(false) }
  }

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
      <div className="min-h-screen bg-[#0f1110] p-6 text-white selection:bg-[#c5a059] selection:text-[#0f1110]">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Tab Bar — 3 tabs only */}
          <div className="flex bg-[#151716] p-2 rounded-2xl shadow-sm border border-white/5 overflow-x-auto gap-2">
            <TabButton active={activeTab === "rooms"} onClick={() => setActiveTab("rooms")} icon={<Building size={16} />} label="Room Management" />
            <TabButton active={activeTab === "menu-standard"} onClick={() => setActiveTab("menu-standard")} icon={<Utensils size={16} />} label="Standard Menu" />
            <TabButton active={activeTab === "vip"} onClick={() => setActiveTab("vip")} icon={<Crown size={16} />} label="VIP Menus" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {activeTab === "rooms" && (
              <div className="lg:col-span-3 flex flex-col gap-4 lg:sticky lg:top-4">
                <div className="bg-gradient-to-br from-[#1a1c1b] to-[#0f1110] border border-white/10 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform duration-500">
                      <Bed className="w-32 h-32 text-[#d4af37]" />
                  </div>
                  <div className="relative z-10">
                    <h1 className="text-2xl font-playfair italic font-bold mb-1 tracking-tight flex items-center gap-2 text-[#f3cf7a]">
                      Rooms <Bed size={24} className="text-[#d4af37]" />
                    </h1>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-5">
                      {rooms.length} units
                    </p>
                    <button onClick={() => { resetRoomForm(); setShowForm(true) }}
                      className="w-full bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] px-4 py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-2">
                       <Plus size={16} /> Add Room
                    </button>
                    <button onClick={() => setShowCategoryManager(true)}
                      className="mt-3 w-full bg-[#151716] text-[#f3cf7a] px-4 py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#1a1c1b] transition-all border border-[#d4af37]/30">
                      Manage Categories
                    </button>
                    <button onClick={fetchData} className="mt-2 w-full bg-[#0f1110] hover:bg-[#1a1c1b] text-gray-400 hover:text-white px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/5">
                      <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className={activeTab === "rooms" ? "lg:col-span-9" : "lg:col-span-12"}>
              <div className="bg-[#151716] rounded-[2.5rem] p-6 shadow-2xl border border-white/5 min-h-[70vh]">
                {loading && activeTab === "rooms" ? (
                  <div className="flex flex-col items-center justify-center py-40">
                    <RefreshCw className="w-12 h-12 animate-spin text-[#f3cf7a] mb-6" />
                    <p className="text-[#f3cf7a] font-bold uppercase tracking-widest text-[10px]">Loading...</p>
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
                          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#1a1c1b] border border-[#d4af37]/20 mb-4 shadow-[0_0_30px_rgba(212,175,55,0.1)]">
                            <Crown size={40} className="text-[#f3cf7a]" />
                          </div>
                          <h2 className="text-3xl font-playfair italic font-bold text-[#f3cf7a] mb-2">VIP Menu Management</h2>
                          <p className="text-gray-500 font-medium text-sm">Select a VIP tier to manage its menu items independently</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                          {/* VIP 1 Card */}
                          <button
                            onClick={() => router.push("/admin/vip1-menu")}
                            className="group bg-[#0f1110] border border-white/10 hover:border-[#d4af37]/50 text-white rounded-3xl p-8 shadow-xl hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] hover:-translate-y-1 transition-all flex flex-col items-center gap-4 text-left relative overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-16 h-16 bg-[#151716] border border-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:border-[#d4af37]/30 transition-all relative z-10">
                              <Wine size={32} className="text-[#f3cf7a]" />
                            </div>
                            <div className="text-center relative z-10">
                              <h3 className="text-2xl font-playfair italic font-bold mb-1 text-white group-hover:text-[#f3cf7a] transition-colors">VIP 1 Menu</h3>
                              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Manage vip1menuitems</p>
                            </div>
                            <div className="flex items-center gap-2 text-[#d4af37] text-[10px] font-bold uppercase tracking-widest mt-2 group-hover:gap-3 transition-all relative z-10">
                              Open Manager <ArrowRight size={14} />
                            </div>
                          </button>

                          {/* VIP 2 Card */}
                          <button
                            onClick={() => router.push("/admin/vip2-menu")}
                            className="group bg-[#0f1110] border border-white/10 hover:border-[#d4af37]/50 text-white rounded-3xl p-8 shadow-xl hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] hover:-translate-y-1 transition-all flex flex-col items-center gap-4 text-left relative overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-[#d4af37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-16 h-16 bg-[#151716] border border-white/5 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:border-[#d4af37]/30 transition-all relative z-10">
                              <ChefHat size={32} className="text-[#f3cf7a]" />
                            </div>
                            <div className="text-center relative z-10">
                              <h3 className="text-2xl font-playfair italic font-bold mb-1 text-white group-hover:text-[#f3cf7a] transition-colors">VIP 2 Menu</h3>
                              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Manage vip2menuitems</p>
                            </div>
                            <div className="flex items-center gap-2 text-[#d4af37] text-[10px] font-bold uppercase tracking-widest mt-2 group-hover:gap-3 transition-all relative z-10">
                              Open Manager <ArrowRight size={14} />
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === "rooms" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.map(room => (
                          <div key={room._id} className="bg-[#0f1110] rounded-3xl p-6 shadow-sm border border-white/5 hover:border-[#d4af37]/30 transition-all group">
                             <div className="flex justify-between items-start mb-4">
                               <div className="flex gap-4 items-center">
                                 <div className="w-14 h-14 bg-[#151716] border border-white/5 rounded-2xl flex items-center justify-center text-[#d4af37] group-hover:scale-110 transition-transform"><Bed size={24} /></div>
                                 <div>
                                   <h3 className="text-xl font-black text-white leading-none">Room {room.roomNumber}</h3>
                                   <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{room.category} • Floor {floors.find(f => f._id === room.floorId)?.floorNumber || '?'}</p>
                                 </div>
                               </div>
                               <span className={`px-2.5 py-1 rounded-md border text-[9px] font-bold uppercase tracking-widest ${room.status === 'available' ? 'bg-[#1a2e20] text-[#4ade80] border-[#4ade80]/30' : room.status === 'occupied' ? 'bg-red-950/30 text-red-500 border-red-500/30' : 'bg-[#b38822]/10 text-[#f3cf7a] border-[#d4af37]/30'}`}>
                                 {room.status}
                               </span>
                             </div>
                             <div className="flex justify-between items-center mt-6">
                               <span className="text-lg font-black text-[#f3cf7a]">{room.price} Br</span>
                               <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => handleEdit(room)} className="p-2 bg-[#151716] rounded-xl text-gray-500 hover:text-[#f3cf7a] hover:bg-[#1a1c1b] border border-transparent hover:border-[#d4af37]/30 transition-all"><Pencil size={14} /></button>
                                 <button onClick={() => handleRoomDelete(room)} className="p-2 bg-[#151716] rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-950/50 border border-transparent hover:border-red-500/30 transition-all"><Trash2 size={14} /></button>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-[#151716] border border-white/10 rounded-3xl shadow-2xl max-w-lg w-full relative overflow-hidden">
              <button onClick={resetRoomForm} className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
              <div className="p-8">
                <h2 className="text-2xl font-playfair italic font-bold text-[#f3cf7a] mb-8">{editingRoom ? "Edit Room" : "New Room"}</h2>
                <form onSubmit={handleRoomSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Room Number</label>
                      <input required value={roomForm.roomNumber} onChange={e => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                        className="w-full bg-[#0f1110] border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Floor</label>
                      <select required value={roomForm.floorId} onChange={e => setRoomForm({ ...roomForm, floorId: e.target.value })}
                        className="w-full bg-[#0f1110] border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 transition-all">
                        <option value="" className="text-gray-500">Select Floor…</option>
                        {floors.map(f => <option key={f._id} value={f._id} className="text-black bg-white">Floor {f.floorNumber}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Price (Br)</label>
                      <input required type="number" value={roomForm.price} onChange={e => setRoomForm({ ...roomForm, price: e.target.value })}
                        className="w-full bg-[#0f1110] border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-[#d4af37] outline-none focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 transition-all" />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Category</label>
                        <button type="button" onClick={() => setShowCategoryManager(true)} className="text-[10px] font-bold uppercase tracking-widest text-[#d4af37] hover:text-[#f3cf7a] transition-colors hover:underline">Manage</button>
                      </div>
                      <select value={roomForm.category} onChange={e => setRoomForm({ ...roomForm, category: e.target.value })}
                        className="w-full bg-[#0f1110] border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 transition-all">
                        <option value="" className="text-gray-500">Select Category...</option>
                        {categories.map((c: any) => <option key={c._id} value={c.name} className="text-black bg-white">{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={formLoading} className="w-full bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] py-4 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all">
                    {formLoading ? "Saving…" : "Save Room"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        <CategoryManager
          show={showCategoryManager}
          onClose={() => setShowCategoryManager(false)}
          categories={categories}
          onAdd={handleAddCategory}
          onDelete={handleDeleteCategory}
          onUpdate={handleUpdateCategory}
          loading={categoryLoading}
          title="Manage Room Categories"
          value={newCategoryName}
          onChange={setNewCategoryName}
          t={(k: string) => {
            const map: any = {
              "adminMenu.newCatPlaceholder": "New category name...",
              "adminMenu.add": "Add",
              "adminMenu.noCats": "No categories found.",
              "adminMenu.close": "Close"
            }
            return map[k] || k.split('.').pop()
          }}
        />

        <ConfirmationCard isOpen={confirmationState.isOpen} onClose={closeConfirmation} onConfirm={confirmationState.onConfirm}
          title={confirmationState.options.title} message={confirmationState.options.message} type={confirmationState.options.type} />
        <NotificationCard isOpen={notificationState.isOpen} onClose={closeNotification}
          title={notificationState.options.title} message={notificationState.options.message} type={notificationState.options.type} />
      </div>
    </ProtectedRoute>
  )
}
