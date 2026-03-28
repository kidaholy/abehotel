"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { MenuManagementSection } from "@/components/admin/menu-management-section"
import { compressImage, validateImageFile } from "@/lib/utils/image-utils"
import { 
  Plus, 
  Trash2, 
  Pencil, 
  X,
  Package,
  Coffee,
  ArrowLeftRight,
  ChevronDown,
  Loader2,
  AlertTriangle,
  Search,
  Check,
  Wine,
  RefreshCw,
  Utensils,
  Bed,
  Layers,
  Building
} from "lucide-react"

type Tab = "menu1" | "menu2" | "rooms" | "store"

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
      className={`flex bg-white p-2 rounded-2xl shadow-sm border border-gray-200 overflow-x-auto gap-2 flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
        active 
          ? "bg-[#8B4513] text-white shadow-lg" 
          : "text-gray-400 hover:bg-white hover:text-gray-600"
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
  isVIP?: boolean
}

interface Floor {
  _id: string
  floorNumber: number
  type: string
  isVIP: boolean
}

interface VIPMenuItem {
  _id: string
  menuId: string
  name: string
  mainCategory: 'Food' | 'Drinks'
  category: string
  price: number
  available: boolean
  description?: string
  image?: string
  preparationTime?: number
  recipe?: any[]
  reportUnit?: string
  reportQuantity?: number
  distributions?: string[]
  vipLevel: 1 | 2
}

export default function AdminServicesPage() {
  const router = useRouter()
  const { token } = useAuth()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

  const [activeTab, setActiveTab] = useState<Tab>("menu1")
  const [rooms, setRooms] = useState<Room[]>([])
  const [floors, setFloors] = useState<Floor[]>([])
  const [vipMenuItems, setVipMenuItems] = useState<VIPMenuItem[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [stockItems, setStockItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  
  const [roomForm, setRoomForm] = useState({
    roomNumber: "", name: "", floorId: "", type: "standard", category: "Standard", price: "", status: "available"
  })
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)

  const [vipMenuForm, setVipMenuForm] = useState({
    menuId: "",
    name: "",
    mainCategory: 'Food' as 'Food' | 'Drinks',
    category: "VIP Special",
    price: "",
    description: "",
    available: true,
    preparationTime: "10",
    image: "",
    recipe: [] as any[],
    reportUnit: 'piece',
    reportQuantity: '0',
    distributions: [] as string[],
    vipLevel: 1 as 1 | 2
  })
  const [editingVipItem, setEditingVipItem] = useState<VIPMenuItem|null>(null)
  const [editingStock, setEditingStock] = useState<any|null>(null)
  const [showStockForm, setShowStockForm] = useState(false)
  const [stockForm, setStockForm] = useState({
    name: "",
    category: "VIP Selection",
    quantity: "0",
    storeQuantity: "0",
    unit: "pcs",
    minLimit: "5",
    storeMinLimit: "10",
    unitCost: "0",
    trackQuantity: true,
    isVIP: true
  })

  const [formLoading, setFormLoading] = useState(false)
  const [imageProcessing, setImageProcessing] = useState(false)
  const [imageInputType, setImageInputType] = useState<'file' | 'url'>('file')

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const headers = { Authorization: `Bearer ${token}` }
      const [vips, r, f, c, s] = await Promise.all([
        fetch("/api/admin/vip-menu", { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
        fetch("/api/admin/rooms", { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
        fetch("/api/admin/floors", { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
        fetch("/api/categories?type=menu", { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json()),
        fetch("/api/stock", { headers: { Authorization: `Bearer ${token}` } }).then(res => res.json())
      ])
      
      if (Array.isArray(vips)) setVipMenuItems(vips)
      if (Array.isArray(r)) setRooms(r)
      if (Array.isArray(f)) setFloors(f)
      if (Array.isArray(c)) setCategories(c)
      if (Array.isArray(s)) setStockItems(s.filter((i: any) => i.isVIP))
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
        body: JSON.stringify({ 
          ...vipMenuForm, 
          vipLevel: activeTab === "menu1" ? 1 : 2,
          price: parseFloat(vipMenuForm.price || "0"),
          preparationTime: parseInt(vipMenuForm.preparationTime || "10"),
          reportQuantity: parseFloat(vipMenuForm.reportQuantity || "0")
        }),
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
      menuId: item.menuId || "",
      name: item.name,
      mainCategory: item.mainCategory || 'Food',
      category: item.category,
      price: item.price.toString(),
      description: item.description || "",
      available: item.available,
      preparationTime: item.preparationTime?.toString() || "10",
      image: item.image || "",
      recipe: item.recipe || [],
      reportUnit: item.reportUnit || 'piece',
      reportQuantity: item.reportQuantity?.toString() || "0",
      distributions: item.distributions || [],
      vipLevel: item.vipLevel || 1
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
    setVipMenuForm({
      menuId: "",
      name: "",
      mainCategory: 'Food',
      category: "VIP Special",
      price: "",
      description: "",
      available: true,
      preparationTime: "10",
      image: "",
      recipe: [],
      reportUnit: 'piece',
      reportQuantity: '0',
      distributions: [],
      vipLevel: activeTab === "menu1" ? 1 : 2
    })
    setShowForm(false)
  }

  const handleVipImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const { valid, error } = validateImageFile(file)
    if (!valid) {
      notify({ title: "Invalid Image", message: error || "Selected file is not a valid image", type: "error" })
      return
    }
    try {
      setImageProcessing(true)
      const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.8 })
      setVipMenuForm(prev => ({ ...prev, image: compressed }))
    } catch {
      notify({ title: "Error", message: "Failed to process image", type: "error" })
    } finally {
      setImageProcessing(false)
    }
  }

  const addVipIngredient = () => {
    setVipMenuForm(prev => ({
      ...prev,
      recipe: [...prev.recipe, { stockItemId: "", quantity: 1, unit: "unit" }]
    }))
  }

  const removeVipIngredient = (index: number) => {
    setVipMenuForm(prev => ({
      ...prev,
      recipe: prev.recipe.filter((_, i) => i !== index)
    }))
  }

  const updateVipIngredient = (index: number, updates: any) => {
    setVipMenuForm(prev => ({
      ...prev,
      recipe: prev.recipe.map((ing, i) => i === index ? { ...ing, ...updates } : ing)
    }))
  }

  const addVipDistribution = (val: string) => {
    if (val && !vipMenuForm.distributions.includes(val)) {
      setVipMenuForm(prev => ({ ...prev, distributions: [...prev.distributions, val] }))
    }
  }

  const removeVipDistribution = (index: number) => {
    setVipMenuForm(prev => ({
      ...prev,
      distributions: prev.distributions.filter((_, i) => i !== index)
    }))
  }

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    try {
      const url = editingStock ? `/api/stock/${editingStock._id}` : "/api/stock"
      const method = editingStock ? "PUT" : "POST"
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...stockForm,
          quantity: Number(stockForm.quantity),
          storeQuantity: Number(stockForm.storeQuantity),
          minLimit: Number(stockForm.minLimit),
          storeMinLimit: Number(stockForm.storeMinLimit),
          unitCost: Number(stockForm.unitCost),
          isVIP: true
        })
      })
      if (response.ok) {
        notify({ title: "Success", message: `VIP stock item ${editingStock ? 'updated' : 'created'}`, type: "success" })
        fetchData()
        resetStockForm()
      }
    } catch (error) {
      notify({ title: "Error", message: "Failed to save stock item", type: "error" })
    } finally {
      setFormLoading(false)
    }
  }

  const handleEditStock = (item: any) => {
    setEditingStock(item)
    setStockForm({
      name: item.name,
      category: item.category,
      quantity: item.quantity.toString(),
      storeQuantity: item.storeQuantity.toString(),
      unit: item.unit,
      minLimit: item.minLimit.toString(),
      storeMinLimit: item.storeMinLimit.toString(),
      unitCost: item.unitCost.toString(),
      trackQuantity: item.trackQuantity,
      isVIP: true
    })
    setShowStockForm(true)
    setShowForm(true)
  }

  const handleStockDelete = async (item: any) => {
    const confirmed = await confirm({
      title: "Delete VIP Stock Item",
      message: `Are you sure you want to delete ${item.name}?`,
      type: "danger"
    })
    if (confirmed) {
      try {
        const response = await fetch(`/api/stock/${item._id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.ok) {
          notify({ title: "Deleted", message: "Stock item removed", type: "success" })
          fetchData()
        }
      } catch (error) {
        notify({ title: "Error", message: "Failed to delete item", type: "error" })
      }
    }
  }

  const resetStockForm = () => {
    setStockForm({
      name: "",
      category: "VIP Selection",
      quantity: "0",
      storeQuantity: "0",
      unit: "pcs",
      minLimit: "5",
      storeMinLimit: "10",
      unitCost: "0",
      trackQuantity: true,
      isVIP: true
    })
    setEditingStock(null)
    setShowStockForm(false)
    setShowForm(false)
  }

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Master Tabs */}
          <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-gray-200 overflow-x-auto gap-2">
            <TabButton active={activeTab === "rooms"} onClick={() => setActiveTab("rooms")} icon={<Building size={18} />} label="Room Management" />
            <TabButton active={activeTab === "menu1"} onClick={() => setActiveTab("menu1")} icon={<Wine size={18} />} label="VIP 1 Menu" />
            <TabButton active={activeTab === "menu2"} onClick={() => setActiveTab("menu2")} icon={<Wine size={18} />} label="VIP 2 Menu" />
            <TabButton active={activeTab === "store"} onClick={() => setActiveTab("store")} icon={<Package size={18} />} label="VIP Store" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sidebar - Hidden for Menu tab to avoid double sidebars */}
            {(activeTab !== "menu1" && activeTab !== "menu2") && (
              <div className="lg:col-span-3 flex flex-col gap-4 lg:sticky lg:top-4">
                <div className="bg-[#8B4513] rounded-2xl p-6 shadow-xl shadow-[#8B4513]/20 text-white relative overflow-hidden">
                  <div className="relative z-10">
                    <h1 className="text-2xl font-black mb-1 tracking-tight flex items-center gap-2">
                    {activeTab === "rooms" ? "Rooms" : "VIP Management"}
                    {activeTab === "rooms" ? <Bed size={24} /> : <Building size={24} />}
                  </h1>
                  <p className="opacity-70 text-xs font-bold uppercase tracking-widest mb-5">
                    {activeTab === "rooms" ? `${rooms.length} rooms` : `${stockItems.length} items`}
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
                      <span className="font-black text-gray-900">
                        {activeTab === "rooms" ? rooms.length : stockItems.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className={(activeTab === "menu1" || activeTab === "menu2") ? "lg:col-span-12" : "lg:col-span-9"}>
              <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-gray-100 min-h-[70vh]">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                      {activeTab === "menu1" ? "VIP 1 Selection" : activeTab === "menu2" ? "VIP 2 Selection" : activeTab === "rooms" ? "Room Inventory" : "VIP Store"}
                    </h2>
                    <p className="text-[#8B4513]/40 text-xs font-bold uppercase tracking-widest mt-1">
                      {(activeTab === "menu1" || activeTab === "menu2") ? "Configure special menu items for VIP service" : activeTab === "rooms" ? "Monitor and manage hotel rooms" : "Independent VIP stock management"}
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
                    {(activeTab === "menu1" || activeTab === "menu2") && (
                      <div className="space-y-12">
                        {/* Standard Menu Integration */}
                        <div>
                          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                             Standard Menu Flags <RefreshCw size={12} />
                          </h3>
                          <MenuManagementSection 
                            confirm={confirm} 
                            notify={notify} 
                            showTitle={false} 
                          />
                        </div>

                        {/* Dedicated VIP Items */}
                        <div>
                          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                             Exclusive VIP Items <Plus size={12} />
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {vipMenuItems.filter(i => activeTab === 'menu1' ? i.vipLevel === 1 : i.vipLevel === 2).map(item => (
                              <div key={item._id} className="group bg-white rounded-[2.5rem] p-6 border border-gray-100 hover:shadow-xl hover:border-[#8B4513]/10 transition-all relative flex flex-col">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-[#8B4513]/5 rounded-3xl flex items-center justify-center text-[#8B4513] group-hover:scale-110 transition-transform">
                                      {item.image ? (
                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-3xl" />
                                      ) : (
                                        <Wine size={32} />
                                      )}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black text-[#8B4513] bg-[#8B4513]/10 px-2 py-0.5 rounded-md">#{item.menuId || "N/A"}</span>
                                        <h3 className="font-black text-gray-900 text-lg leading-none">{item.name}</h3>
                                      </div>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">{item.category} • {item.price} Br</p>
                                    </div>
                                  </div>
                                  <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${item.available ? 'bg-green-500' : 'bg-gray-300'}`} />
                                </div>

                                <div className="flex flex-wrap gap-2 mb-6">
                                  {(item.recipe?.length || 0) > 0 && (
                                    <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-tighter bg-amber-50 text-amber-600 px-2 py-1 rounded-md border border-amber-100">
                                      <Package size={10} /> Stock Linked
                                    </span>
                                  )}
                                  {(item.distributions?.length || 0) > 0 && (
                                    <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-tighter bg-blue-50 text-blue-600 px-2 py-1 rounded-md border border-blue-100">
                                      <ArrowLeftRight size={10} /> {item.distributions?.length} Choices
                                    </span>
                                  )}
                                </div>

                                <div className="flex gap-2 mt-auto">
                                  <button onClick={() => handleEditVip(item)} className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-50 rounded-2xl text-gray-400 hover:text-[#8B4513] hover:bg-[#8B4513]/5 transition-all font-black text-[10px] uppercase tracking-widest">
                                    <Pencil size={14} /> Edit
                                  </button>
                                  <button onClick={() => handleVipDelete(item)} className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button onClick={() => { resetVipMenuForm(); setShowForm(true); }} className="border-4 border-dashed border-gray-50 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 py-12 text-gray-300 hover:text-[#8B4513] hover:border-[#8B4513]/20 transition-all group">
                                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-[#8B4513]/5"><Plus size={24} /></div>
                                <span className="font-black text-[10px] uppercase tracking-widest">New VIP Item</span>
                            </button>
                          </div>
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
                        {rooms.length === 0 && (
                          <div className="col-span-full py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs border-2 border-dashed border-gray-100 rounded-[2.5rem]">No rooms registered</div>
                        )}
                      </div>
                    )}

                    {activeTab === "store" && (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {stockItems.map(item => (
                            <div key={item._id} className="bg-white rounded-[2.5rem] p-6 border border-gray-100 hover:shadow-lg transition-all">
                               <div className="flex justify-between items-start mb-4">
                                 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center"><Package size={20} /></div>
                                 <div className="text-right">
                                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">In Stock</p>
                                   <p className="text-xl font-black text-blue-600">{item.quantity} {item.unit}</p>
                                 </div>
                               </div>
                               <h3 className="font-black text-gray-900 mb-1">{item.name}</h3>
                               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-6">{item.category}</p>
                               
                               <div className="flex gap-2">
                                 <button onClick={() => handleEditStock(item)} className="flex-1 py-3 bg-gray-50 rounded-xl text-gray-400 hover:text-blue-600 transition-all font-black text-[10px] uppercase tracking-widest">Edit</button>
                                 <button onClick={() => handleStockDelete(item)} className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-xl text-gray-400 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                               </div>
                            </div>
                          ))}
                          <button onClick={() => { setShowStockForm(true); setShowForm(true); }} className="border-4 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 py-12 text-gray-300 hover:text-[#8B4513] hover:border-[#8B4513]/20 transition-all group">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-[#8B4513]/5"><Plus size={24} /></div>
                            <span className="font-black text-[10px] uppercase tracking-widest">New VIP Stock</span>
                          </button>
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
                ) : activeTab === 'store' ? (
                  <>
                    <h2 className="text-3xl font-black text-blue-600 mb-8 leading-none flex items-center gap-3">
                      {editingStock ? "Edit VIP Stock" : "New VIP Stock Item"}
                      <Package size={32} />
                    </h2>
                    <form onSubmit={handleStockSubmit} className="space-y-6">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Item Name</label>
                        <input required value={stockForm.name} onChange={e => setStockForm({ ...stockForm, name: e.target.value })} placeholder="e.g. Premium Wine Bottle"
                          className="w-full bg-gray-50 rounded-[1.25rem] px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-blue-500/10" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Unit (e.g. pcs, kg)</label>
                          <input required value={stockForm.unit} onChange={e => setStockForm({ ...stockForm, unit: e.target.value })} placeholder="pcs"
                            className="w-full bg-gray-50 rounded-[1.25rem] px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-blue-500/10" />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Unit Cost (Br)</label>
                          <input required type="number" min="0" value={stockForm.unitCost} onChange={e => setStockForm({ ...stockForm, unitCost: e.target.value })} placeholder="0"
                            className="w-full bg-gray-50 rounded-[1.25rem] px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-blue-500/10" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Active Qty</label>
                          <input required type="number" min="0" value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: e.target.value })} placeholder="0"
                            className="w-full bg-gray-50 rounded-[1.25rem] px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-blue-500/10" />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Store Qty</label>
                          <input required type="number" min="0" value={stockForm.storeQuantity} onChange={e => setStockForm({ ...stockForm, storeQuantity: e.target.value })} placeholder="0"
                            className="w-full bg-gray-50 rounded-[1.25rem] px-5 py-4 text-sm font-bold border-none outline-none focus:ring-4 focus:ring-blue-500/10" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="trackQuantity" checked={stockForm.trackQuantity} onChange={e => setStockForm({...stockForm, trackQuantity: e.target.checked})} className="w-5 h-5 rounded-lg text-blue-600 focus:ring-blue-500 border-gray-300" />
                        <label htmlFor="trackQuantity" className="text-xs font-black text-gray-400 uppercase tracking-widest">Track Inventory Quantity</label>
                      </div>
                      <button type="submit" disabled={formLoading} className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-blue-500/30 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50">
                        {formLoading ? "Processing…" : editingStock ? "Update Stock" : "Create Stock"}
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <h2 className="text-3xl font-black text-[#8B4513] mb-8 leading-none flex items-center gap-3">
                      {editingVipItem ? "Edit VIP Selection" : "New VIP Offering"}
                      <Wine size={32} />
                    </h2>
                    <form onSubmit={handleVipMenuSubmit} className="space-y-8 pb-10">
                      {/* Image & Basic Info Section */}
                      <div className="bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100 space-y-6">
                        <div className="flex items-start gap-6">
                           <div className="w-32 h-32 bg-white rounded-3xl overflow-hidden flex-shrink-0 border-2 border-[#8B4513]/5 shadow-inner group relative">
                             {vipMenuForm.image ? (
                               <img src={vipMenuForm.image} alt="Preview" className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex items-center justify-center text-[#8B4513]/20"><Wine size={48} /></div>
                             )}
                             {imageProcessing && <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center"><RefreshCw className="animate-spin text-white" /></div>}
                           </div>
                           <div className="flex-1 space-y-3">
                             <div className="flex bg-white p-1 rounded-xl w-fit border border-gray-100 shadow-sm">
                               <button type="button" onClick={() => setImageInputType('file')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${imageInputType === 'file' ? 'bg-[#8B4513] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>Upload</button>
                               <button type="button" onClick={() => setImageInputType('url')} className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${imageInputType === 'url' ? 'bg-[#8B4513] text-white shadow-md' : 'text-gray-400 hover:bg-gray-50'}`}>URL</button>
                             </div>
                             {imageInputType === 'file' ? (
                               <input type="file" accept="image/*" onChange={handleVipImageUpload} className="block w-full text-[10px] text-gray-400 font-bold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-[#8B4513]/10 file:text-[#8B4513] hover:file:bg-[#8B4513]/20 cursor-pointer" />
                             ) : (
                               <input type="url" value={vipMenuForm.image} onChange={e => setVipMenuForm({ ...vipMenuForm, image: e.target.value })} placeholder="https://..." className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-[#8B4513]/20 outline-none transition-all" />
                             )}
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Exquisite Item Name</label>
                             <input required value={vipMenuForm.name} onChange={e => setVipMenuForm({ ...vipMenuForm, name: e.target.value })} placeholder="e.g. Vintage 1992 Cristal"
                               className="w-full bg-white rounded-2xl px-5 py-4 text-sm font-bold border border-gray-100 shadow-sm outline-none focus:ring-4 focus:ring-[#8B4513]/5" />
                          </div>
                          <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Menu ID</label>
                             <input value={vipMenuForm.menuId} onChange={e => setVipMenuForm({ ...vipMenuForm, menuId: e.target.value })} placeholder="AUTO"
                               className="w-full bg-white rounded-2xl px-5 py-4 text-sm font-bold border border-gray-100 shadow-sm outline-none focus:ring-4 focus:ring-[#8B4513]/5" />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Main Category</label>
                            <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                              {(['Food', 'Drinks'] as const).map(mc => (
                                <button key={mc} type="button" onClick={() => setVipMenuForm({ ...vipMenuForm, mainCategory: mc })} className={`flex-1 py-3 items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${vipMenuForm.mainCategory === mc ? 'bg-[#8B4513] text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                                  {mc === 'Food' ? <Utensils size={14} className="inline mr-1" /> : <Coffee size={14} className="inline mr-1" />} {mc}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Category</label>
                            <select required value={vipMenuForm.category} onChange={e => setVipMenuForm({ ...vipMenuForm, category: e.target.value })}
                              className="w-full bg-white rounded-2xl px-5 py-4 text-sm font-bold border border-gray-100 shadow-sm outline-none focus:ring-4 focus:ring-[#8B4513]/5 appearance-none">
                              <option value="VIP Special">VIP Special</option>
                              {categories.map(cat => <option key={cat._id} value={cat.name}>{cat.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Price (Br)</label>
                            <input required type="number" min="0" value={vipMenuForm.price} onChange={e => setVipMenuForm({ ...vipMenuForm, price: e.target.value })} placeholder="0"
                              className="w-full bg-white rounded-2xl px-5 py-4 text-sm font-bold border border-gray-100 shadow-sm outline-none focus:ring-4 focus:ring-[#8B4513]/5" />
                          </div>
                        </div>
                      </div>

                      {/* Recipe & Stock Integration */}
                      <div className="bg-[#8B4513]/5 p-6 rounded-[2.5rem] border border-[#8B4513]/10 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-black text-[#8B4513] uppercase tracking-widest flex items-center gap-2">
                            <Package size={16} /> Recipe & Stock Integration
                          </h3>
                          <button type="button" onClick={addVipIngredient} className="text-[10px] font-black text-[#8B4513] bg-white px-3 py-1.5 rounded-lg border border-[#8B4513]/10 hover:bg-[#8B4513] hover:text-white transition-all">+ Add Ingredient</button>
                        </div>
                        
                        {vipMenuForm.recipe.length === 0 ? (
                          <p className="text-[10px] text-gray-400 italic font-medium">No ingredients linked. This item won't affect stock.</p>
                        ) : (
                          <div className="space-y-3">
                            {vipMenuForm.recipe.map((ing, idx) => (
                              <div key={idx} className="flex gap-2 items-end bg-white p-3 rounded-2xl border border-[#8B4513]/5 shadow-sm">
                                <div className="flex-1">
                                  <label className="block text-[8px] font-black text-gray-300 uppercase tracking-wider mb-1">Stock Item</label>
                                  <select value={ing.stockItemId} onChange={e => updateVipIngredient(idx, { stockItemId: e.target.value })} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold border-none outline-none">
                                    <option value="">Select Item…</option>
                                    {stockItems.map(s => <option key={s._id} value={s._id}>{s.name} ({s.unit})</option>)}
                                  </select>
                                </div>
                                <div className="w-20">
                                  <label className="block text-[8px] font-black text-gray-300 uppercase tracking-wider mb-1">Qty</label>
                                  <input type="number" step="any" value={ing.quantity} onChange={e => updateVipIngredient(idx, { quantity: parseFloat(e.target.value) })} className="w-full bg-gray-50 rounded-xl px-3 py-2 text-xs font-bold border-none outline-none" />
                                </div>
                                <button type="button" onClick={() => removeVipIngredient(idx)} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Reporting & Prep Time */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Prep Time (Min)</label>
                          <input type="number" value={vipMenuForm.preparationTime} onChange={e => setVipMenuForm({ ...vipMenuForm, preparationTime: e.target.value })}
                            className="w-full bg-white rounded-2xl px-5 py-4 text-sm font-bold border border-gray-100 shadow-sm outline-none" />
                        </div>
                        <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Reporting Unit</label>
                          <select value={vipMenuForm.reportUnit} onChange={e => setVipMenuForm({ ...vipMenuForm, reportUnit: e.target.value })}
                            className="w-full bg-white rounded-2xl px-5 py-4 text-sm font-bold border border-gray-100 shadow-sm outline-none appearance-none">
                            <option value="piece">Piece / Unit</option>
                            <option value="kg">Kilogram (kg)</option>
                            <option value="liter">Liter (L)</option>
                          </select>
                        </div>
                      </div>

                      {/* Distribution Options */}
                      <div className="bg-blue-50/30 p-6 rounded-[2.5rem] border border-blue-100 space-y-4">
                         <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest flex items-center gap-2">
                              <ArrowLeftRight size={16} /> Choice Variants
                            </h3>
                         </div>
                         <div className="flex gap-2">
                           <input type="text" id="vipDistInput" placeholder="e.g. Hot, Extra Cold..." onKeyDown={e => { if(e.key === 'Enter') { e.preventDefault(); addVipDistribution((e.target as any).value); (e.target as any).value = ''; } }}
                             className="flex-1 bg-white rounded-xl px-4 py-3 text-xs font-bold border border-blue-100 outline-none focus:ring-2 focus:ring-blue-200" />
                           <button type="button" onClick={() => { const i = document.getElementById('vipDistInput') as any; addVipDistribution(i.value); i.value = ''; }}
                             className="px-4 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md">Add</button>
                         </div>
                         <div className="flex flex-wrap gap-2">
                            {vipMenuForm.distributions.map((d, idx) => (
                              <span key={idx} className="bg-white border border-blue-100 text-blue-700 font-bold text-[10px] px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                                {d} <button type="button" onClick={() => removeVipDistribution(idx)} className="hover:text-red-500"><X size={12} /></button>
                              </span>
                            ))}
                         </div>
                      </div>

                      <div className="flex items-center justify-between pt-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className={`w-14 h-7 rounded-full transition-all relative ${vipMenuForm.available ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-gray-300'}`}>
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md ${vipMenuForm.available ? 'left-8' : 'left-1'}`}></div>
                          </div>
                          <input type="checkbox" className="hidden" checked={vipMenuForm.available} onChange={e => setVipMenuForm({ ...vipMenuForm, available: e.target.checked })} />
                          <span className="font-black text-xs uppercase tracking-widest text-gray-500 group-hover:text-gray-900 transition-colors">Available to Order</span>
                        </label>

                        <div className="flex gap-4">
                          <button type="button" onClick={resetVipMenuForm} className="px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 hover:bg-gray-100 transition-all">Discard</button>
                          <button type="submit" disabled={formLoading} className="px-10 py-4 bg-[#8B4513] text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-[#8B4513]/30 hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-50">
                            {formLoading ? "Processing…" : editingVipItem ? "Update Selection" : "Complete Record"}
                          </button>
                        </div>
                      </div>
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
