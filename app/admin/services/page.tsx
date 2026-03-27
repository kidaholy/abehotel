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
  RefreshCw, 
  ConciergeBell, 
  Utensils, 
  Bed, 
  Layers, 
  Building, 
  Search, 
  Plus, 
  Trash2, 
  Pencil, 
  Wine, 
  Sparkles,
  Shirt,
  Car,
  Dumbbell,
  Wrench,
  Stethoscope,
  Briefcase,
  Pizza,
  Coffee,
  Target,
  Waves,
  Grape,
  Package,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  ExternalLink,
  X
} from "lucide-react"

interface Service {
  _id: string
  name: string
  mainCategory?: string
  description?: string
  category: string
  price: number
  unit?: string
  isAvailable: boolean
  icon?: string
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
  isActive: boolean
}

interface MenuItem {
  _id: string
  menuId: string
  name: string
  category: string
  mainCategory?: string
  price: number
  available: boolean
  isVIP: boolean
}

interface Floor {
  _id: string
  floorNumber: string
  isVIP: boolean
  type: string
}

const ICONS = ["ConciergeBell", "Sparkles", "Shirt", "Car", "Dumbbell", "Utensils", "Leaf", "Waves", "Wrench", "Package", "Pizza", "Coffee", "Target", "Waves", "Trophy", "Package", "ShoppingCart", "Stethoscope"]
const ICON_MAP: Record<string, React.ReactNode> = {
  ConciergeBell: <ConciergeBell size={20} />,
  Sparkles: <Sparkles size={20} />,
  Shirt: <Shirt size={20} />,
  Car: <Car size={20} />,
  Dumbbell: <Dumbbell size={20} />,
  Utensils: <Utensils size={20} />,
  Leaf: <Layers size={20} />, // Using layers for greenery/nature vibes
  Waves: <Waves size={20} />,
  Wrench: <Wrench size={20} />,
  Package: <Package size={20} />,
  Pizza: <Pizza size={20} />,
  Coffee: <Coffee size={20} />,
  Target: <Target size={20} />,
  Trophy: <Building size={20} />,
  ShoppingCart: <ShoppingCart size={20} />,
  Stethoscope: <Stethoscope size={20} />
}
const DEFAULT_CATEGORIES = ["Housekeeping", "Laundry", "Transportation", "Wellness", "Dining", "Maintenance", "Business", "Other"]

const emptyForm = {
  name: "", description: "", category: "", price: "", unit: "per request",
  isAvailable: true, icon: "ConciergeBell"
}

type Tab = "services" | "menu" | "rooms" | "floors"

export default function AdminServicesPage() {
  const router = useRouter()
  const { token } = useAuth()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

  const [activeTab, setActiveTab] = useState<Tab>("services")
  const [services, setServices] = useState<Service[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })
  const [formLoading, setFormLoading] = useState(false)
  
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [mainCategoryFilter, setMainCategoryFilter] = useState<'Food' | 'Drinks'>('Food')

  const [roomForm, setRoomForm] = useState({
    roomNumber: "", name: "", floorId: "", type: "standard", category: "Standard", price: "", status: "available"
  })
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const headers = { Authorization: `Bearer ${token}` }
      
      const [resServices, resRooms, resFloors] = await Promise.all([
        fetch("/api/admin/services", { headers }),
        fetch("/api/admin/rooms", { headers }),
        fetch("/api/admin/floors", { headers })
      ])

      if (resServices.ok) setServices(await resServices.json())
      if (resRooms.ok) setRooms(await resRooms.json())
      if (resFloors.ok) setFloors(await resFloors.json())
    } catch (error) {
      console.error("Fetch error:", error)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { if (token) fetchData() }, [token, fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.category || formData.price === "") {
      notify({ title: "Missing Fields", message: "Name, category, and price are required.", type: "error" })
      return
    }
    setFormLoading(true)
    try {
      const url = editingService ? `/api/admin/services/${editingService._id}` : "/api/admin/services"
      const method = editingService ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, price: parseFloat(formData.price) }),
      })
      if (res.ok) {
        notify({ title: editingService ? "Service Updated" : "Service Created", message: `"${formData.name}" has been saved.`, type: "success" })
        resetForm()
        fetchData()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to save", type: "error" })
      }
    } catch {
      notify({ title: "Error", message: "Network error", type: "error" })
    }
    setFormLoading(false)
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
        setEditingRoom(null)
        setRoomForm({ roomNumber: "", name: "", floorId: "", type: "standard", category: "Standard", price: "", status: "available" })
        setShowForm(false)
        fetchData()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to save room", type: "error" })
      }
    } catch {
      notify({ title: "Error", message: "Network error", type: "error" })
    }
    setFormLoading(false)
  }

  const handleDelete = async (service: Service) => {
    const confirmed = await confirm({
      title: "Delete Service", message: `Delete "${service.name}"? This cannot be undone.`,
      type: "danger", confirmText: "Delete", cancelText: "Cancel"
    })
    if (!confirmed) return
    try {
      const res = await fetch(`/api/admin/services/${service._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { fetchData(); notify({ title: "Deleted", message: `"${service.name}" removed.`, type: "success" }) }
    } catch { notify({ title: "Error", message: "Failed to delete", type: "error" }) }
  }

  const handleRoomDelete = async (room: Room) => {
    const confirmed = await confirm({
      title: "Delete Room", message: `Delete Room "${room.roomNumber}"?`,
      type: "danger", confirmText: "Delete", cancelText: "Cancel"
    })
    if (!confirmed) return
    try {
      const res = await fetch(`/api/admin/rooms/${room._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { fetchData(); notify({ title: "Deleted", message: `Room removed.`, type: "success" }) }
    } catch { notify({ title: "Error", message: "Failed to delete", type: "error" }) }
  }

  const handleToggleAvailability = async (service: Service) => {
    try {
      const res = await fetch(`/api/admin/services/${service._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...service, isAvailable: !service.isAvailable }),
      })
      if (res.ok) fetchData()
    } catch { /* silent */ }
  }

  const handleToggleVip = async (type: 'floor' | 'menu' | 'table', id: string, current: boolean) => {
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

  const handleMenuDelete = async (item: MenuItem) => {
    const confirmed = await (confirm as any)({
      title: "Delete Menu Item",
      message: `Delete "${item.name}"?`,
      type: "danger",
      confirmText: "Delete",
      cancelText: "Cancel"
    })
    if (!confirmed) return
    try {
      const res = await fetch(`/api/admin/menu/${item._id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { fetchData(); notify({ title: "Deleted", message: "Menu item removed.", type: "success" }) }
    } catch { notify({ title: "Error", message: "Failed to delete", type: "error" }) }
  }

  const handleEdit = (service: Service | Room) => {
    if ((service as any).roomNumber) {
      const r = service as Room
      setEditingRoom(r)
      setRoomForm({
        roomNumber: r.roomNumber, name: r.name || "", floorId: r.floorId?._id || r.floorId || "",
        type: r.type, category: r.category, price: r.price.toString(), status: r.status
      })
    } else {
      const s = service as Service
      setEditingService(s)
      setFormData({ name: s.name, description: s.description || "", category: s.category, price: s.price.toString(), unit: s.unit || "per request", isAvailable: s.isAvailable, icon: s.icon || "ConciergeBell" })
    }
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingService(null)
    setEditingRoom(null)
    setFormData({ ...emptyForm })
    setRoomForm({ roomNumber: "", name: "", floorId: "", type: "standard", category: "Standard", price: "", status: "available" })
    setShowForm(false)
  }

  const categories = ["all", ...Array.from(new Set(services.map(s => s.category)))]
  const filtered = services.filter(s => {
    const matchCat = categoryFilter === "all" || s.category === categoryFilter
    const matchSearch = !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.category.toLowerCase().includes(searchTerm.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Master Tabs */}
          <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-gray-200 overflow-x-auto gap-2">
            {[
              { id: "services", label: "Core Services", icon: <ConciergeBell size={18} /> },
              { id: "menu", label: "Menu Items", icon: <Utensils size={18} /> },
              { id: "rooms", label: "Hotel Rooms", icon: <Bed size={18} /> },
              { id: "floors", label: "Floor Setup", icon: <Layers size={18} /> }
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
                      {activeTab === "services" ? "Services" : activeTab === "rooms" ? "Rooms" : "Floor Setup"}
                      {activeTab === "services" ? <ConciergeBell size={24} /> : activeTab === "rooms" ? <Bed size={24} /> : <Building size={24} />}
                    </h1>
                    <p className="opacity-70 text-xs font-bold uppercase tracking-widest mb-5">
                      {activeTab === "services" ? `${services.length} registered` : activeTab === "rooms" ? `${rooms.length} rooms` : `${floors.length} floors`}
                    </p>
                    
                    {activeTab !== "floors" && (
                      <button onClick={() => { resetForm(); setShowForm(true) }}
                        className="w-full bg-white text-[#8B4513] px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-gray-100 transition-all flex items-center justify-center gap-2 active:scale-95">
                        <Plus size={16} /> {activeTab === "services" ? "Add New Service" : "Add New Room"}
                      </button>
                    )}
                    
                    <button onClick={fetchData} className="mt-2 w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                      <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                  </div>
                  <div className="absolute -bottom-4 -right-4 text-8xl opacity-10 transform -rotate-12">
                    {activeTab === "services" ? <ConciergeBell size={96} /> : activeTab === "rooms" ? <Bed size={96} /> : <Building size={96} />}
                  </div>
                </div>

                {/* Filters (only for services) */}
                {activeTab === "services" && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 space-y-4">
                    <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">🔍 Search</h2>
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                      className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10" />
                    
                    <div className="space-y-1">
                      {categories.map(cat => (
                        <button key={cat} onClick={() => setCategoryFilter(cat)}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all ${categoryFilter === cat ? "bg-[#8B4513] text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                          {cat === "all" ? "All Categories" : cat} {cat !== "all" && `(${services.filter(s => s.category === cat).length})`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stats Card */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">📊 Summary</h2>
                  <div className="space-y-2">
                     {activeTab === "services" ? (
                       <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">Available</span>
                            <span className="font-black text-green-600">{services.filter(s => s.isAvailable).length}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">Categories</span>
                            <span className="font-black text-gray-900">{new Set(services.map(s => s.category)).size}</span>
                          </div>
                       </>
                     ) : (
                       <>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">VIP Floors</span>
                            <span className="font-black text-purple-600">{floors.filter(f => f.isVIP).length}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500 font-medium">Total Rooms</span>
                            <span className="font-black text-gray-900">{rooms.length}</span>
                          </div>
                       </>
                     )}
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className={activeTab === "menu" ? "lg:col-span-12" : "lg:col-span-9"}>
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 min-h-[600px]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                      {activeTab === "services" ? "Service Catalog" : activeTab === "menu" ? "Dining Integration" : activeTab === "rooms" ? "Room Inventory" : "Floor & VIP Configuration"}
                    </h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-0.5">
                      {activeTab === "services" ? "Manage hotel services and amenities" : activeTab === "menu" ? "Sync and flag menu items for room service" : activeTab === "rooms" ? "Monitor and manage hotel rooms" : "Configure floor types and VIP mappings"}
                    </p>
                  </div>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-32">
                    <RefreshCw className="w-10 h-10 animate-spin text-gray-300 mb-4" />
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Loading data…</p>
                  </div>
                ) : (
                  <>
                    {activeTab === "services" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filtered.map(service => (
                          <div key={service._id} className="group bg-gray-50 rounded-[2rem] p-5 border-2 border-transparent hover:border-[#8B4513]/10 hover:bg-white transition-all">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#8B4513] shadow-sm group-hover:scale-110 transition-transform">
                                  {ICON_MAP[service.icon || "ConciergeBell"] || <ConciergeBell size={24} />}
                                </div>
                                <div>
                                  <h3 className="font-black text-gray-900 leading-tight">{service.name}</h3>
                                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#8B4513]/40 bg-[#8B4513]/5 px-2 py-0.5 rounded-full">{service.category}</span>
                                </div>
                              </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleEdit(service)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-400 hover:text-[#8B4513] shadow-sm"><Pencil size={14} /></button>
                                  <button onClick={() => handleDelete(service)} className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 shadow-sm"><Trash2 size={14} /></button>
                                </div>
                            </div>
                            <div className="flex items-end justify-between">
                              <div>
                                <div className="text-sm font-black text-gray-900">{service.price} Br</div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{service.unit || "per request"}</div>
                              </div>
                              <button onClick={() => handleToggleAvailability(service)}
                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${service.isAvailable ? "bg-green-600/10 text-green-600" : "bg-red-600/10 text-red-600"}`}>
                                {service.isAvailable ? "Available" : "Hidden"}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "menu" && (
                      <MenuManagementSection 
                        confirm={confirm} 
                        notify={notify} 
                        showTitle={false} 
                      />
                    )}

                    {activeTab === "rooms" && (
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {rooms.map(room => (
                          <div key={room._id} className="group bg-gray-50 rounded-2xl p-5 border-2 border-transparent hover:border-[#8B4513]/10 hover:bg-white transition-all relative">
                            <div className="flex flex-col items-center text-center">
                              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-[#8B4513] shadow-sm mb-3 group-hover:scale-110 transition-transform"><Bed size={24} /></div>
                              <h3 className="font-black text-gray-900 text-lg">Room {room.roomNumber}</h3>
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">{room.category} • {room.price} Br</p>
                              
                              <div className="flex gap-2">
                                <button onClick={() => handleEdit(room)} className="p-2 px-3 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all flex items-center gap-1"><Pencil size={12} /> Edit</button>
                                <button onClick={() => handleRoomDelete(room)} className="p-2 px-3 bg-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-red-50 hover:text-red-500 transition-all flex items-center gap-1"><Trash2 size={12} /></button>
                              </div>
                            </div>
                            <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${room.status === 'available' ? 'bg-green-500' : room.status === 'occupied' ? 'bg-red-500' : 'bg-orange-500'}`} />
                          </div>
                        ))}
                      </div>
                    )}

                    {activeTab === "floors" && (
                      <div className="space-y-4">
                        {floors.map(floor => (
                          <div key={floor._id} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border-2 border-transparent hover:border-[#8B4513]/10 transition-all">
                             <div className="flex items-center gap-4">
                               <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-xl shadow-sm font-black">F{floor.floorNumber}</div>
                               <div>
                                 <h3 className="font-black text-gray-900 text-lg">Floor {floor.floorNumber}</h3>
                                 <div className="flex gap-2 mt-1">
                                   <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${floor.type === 'vip' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>
                                     {floor.type}
                                   </span>
                                   {floor.isVIP && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500 text-white">VIP Status</span>}
                                 </div>
                               </div>
                             </div>
                             
                             <div className="flex items-center gap-6">
                               <div className="flex flex-col items-center gap-1">
                                 <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">VIP Floor</span>
                                 <button onClick={() => handleToggleVip('floor', floor._id, floor.isVIP)}
                                   className={`w-12 h-6 rounded-full relative transition-all ${floor.isVIP ? "bg-amber-500" : "bg-gray-300"}`}>
                                   <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${floor.isVIP ? "left-7" : "left-1"}`} />
                                 </button>
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

        {/* Create / Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full relative overflow-hidden flex flex-col max-h-[90vh]">
              <button onClick={resetForm} className="absolute top-5 right-5 w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center font-bold text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all z-10"><X size={18} /></button>
              <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-14">
                <h2 className="text-xl font-black text-gray-900 mb-6">
                  {activeTab === 'services' ? (editingService ? "Edit Service" : "New Service") : (editingRoom ? "Edit Room" : "New Room")}
                </h2>
                
                {activeTab === 'services' ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Icon Picker */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Icon</label>
                      <div className="flex flex-wrap gap-2">
                        {ICONS.map(icon => (
                          <button key={icon} type="button" onClick={() => setFormData({ ...formData, icon })}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${formData.icon === icon ? "border-[#8B4513] bg-[#8B4513]/5 scale-110 shadow-md text-[#8B4513]" : "border-gray-100 bg-gray-50 hover:border-gray-300 text-gray-400"}`}>
                            {ICON_MAP[icon]}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Service Name *</label>
                      <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Room Cleaning"
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10" />
                    </div>

                    {/* Category */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Category *</label>
                      <div className="flex gap-2">
                        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                          className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10 appearance-none">
                          <option value="">Select category…</option>
                          {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="or type custom"
                          className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10" />
                      </div>
                    </div>

                    {/* Price & Unit */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Price (Br) *</label>
                        <input required type="number" min="0" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} placeholder="0"
                          className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Unit</label>
                        <input value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} placeholder="per request"
                          className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10" />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
                      <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description…"
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10 resize-none" />
                    </div>

                    {/* Availability */}
                    <button type="button" onClick={() => setFormData({ ...formData, isAvailable: !formData.isAvailable })}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all font-bold text-sm ${formData.isAvailable ? "bg-green-600 text-white border-green-600" : "bg-gray-50 text-gray-500 border-gray-100"}`}>
                      <span>Available for guests</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${formData.isAvailable ? "bg-white/20" : "bg-gray-200"}`}>{formData.isAvailable ? "ON" : "OFF"}</span>
                    </button>

                    <button type="submit" disabled={formLoading} className="w-full bg-[#8B4513] text-white py-3.5 rounded-xl font-black text-sm shadow-xl shadow-[#8B4513]/20 hover:scale-[1.01] transition-transform active:scale-95 disabled:opacity-50">
                      {formLoading ? "Saving…" : editingService ? "Update Service" : "Create Service"}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRoomSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Room Number *</label>
                        <input required value={roomForm.roomNumber} onChange={e => setRoomForm({ ...roomForm, roomNumber: e.target.value })} placeholder="e.g. 101"
                          className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Floor *</label>
                        <select required value={roomForm.floorId} onChange={e => setRoomForm({ ...roomForm, floorId: e.target.value })}
                          className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10 appearance-none">
                          <option value="">Select Floor…</option>
                          {floors.map(f => <option key={f._id} value={f._id}>Floor {f.floorNumber} ({f.type})</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Price (Br) *</label>
                        <input required type="number" min="0" value={roomForm.price} onChange={e => setRoomForm({ ...roomForm, price: e.target.value })} placeholder="0"
                          className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Category *</label>
                        <select value={roomForm.category} onChange={e => setRoomForm({ ...roomForm, category: e.target.value })}
                          className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10 appearance-none">
                          <option value="Standard">Standard</option>
                          <option value="Deluxe">Deluxe</option>
                          <option value="Suite">Suite</option>
                          <option value="VIP">VIP</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Status</label>
                      <select value={roomForm.status} onChange={e => setRoomForm({ ...roomForm, status: e.target.value })}
                        className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium border-none outline-none focus:ring-4 focus:ring-[#8B4513]/10 appearance-none">
                        <option value="available">Available</option>
                        <option value="occupied">Occupied</option>
                        <option value="maintenance">Maintenance</option>
                      </select>
                    </div>

                    <button type="submit" disabled={formLoading} className="w-full bg-[#8B4513] text-white py-3.5 rounded-xl font-black text-sm shadow-xl shadow-[#8B4513]/20 hover:scale-[1.01] transition-transform active:scale-95 disabled:opacity-50">
                      {formLoading ? "Saving…" : editingRoom ? "Update Room" : "Create Room"}
                    </button>
                  </form>
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
