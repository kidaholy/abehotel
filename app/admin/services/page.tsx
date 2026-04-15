"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { TransactionPreview } from "@/components/transaction-preview"
import { MenuManagementSection, CategoryManager } from "@/components/admin/menu-management-section"
import { QRCodeSVG } from "qrcode.react"
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
  ChefHat,
  ConciergeBell,
  Hotel,
  Key,
  Megaphone,
  Calendar,
  MessageSquare,
  DoorOpen,
  Users,
  Phone,
  IdCard,
  CheckCircle2,
  XCircle,
  Clock,
  Banknote,
  Smartphone,
  CreditCard,
  Eye,
  Link
} from "lucide-react"

type Tab = "menu-standard" | "vip" | "rooms" | "reception"

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
  roomServiceCashierId?: string | null
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
  const [selectedQrRoom, setSelectedQrRoom] = useState<Room | null>(null)
  const [cashiers, setCashiers] = useState<any[]>([])
  
  // Room Order tracking for Admin
  const [roomOrdersCount, setRoomOrdersCount] = useState(0)
  const prevRoomOrdersCount = useRef(0)
  const prevReceptionCount = useRef(0)

  // Reception state
  const [receptionRequests, setReceptionRequests] = useState<any[]>([])
  const [receptionLoading, setReceptionLoading] = useState(false)
  const [receptionFilter, setReceptionFilter] = useState<"all"|"pending"|"guests"|"check_in"|"rejected"|"check_out">("pending")
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)
  const [reviewNote, setReviewNote] = useState("")
  const [actioning, setActioning] = useState(false)
  const [extendDate, setExtendDate] = useState("")

  const INQUIRY_TYPES: Record<string, { label: string; icon: any }> = {
    check_in:     { label: "Check-In",       icon: <Hotel size={13} /> },
    check_out:    { label: "Check-Out",       icon: <Key size={13} /> },
    room_service: { label: "Room Service",    icon: <Utensils size={13} /> },
    complaint:    { label: "Complaint",       icon: <Megaphone size={13} /> },
    reservation:  { label: "Reservation",     icon: <Calendar size={13} /> },
    general:      { label: "General Inquiry", icon: <MessageSquare size={13} /> },
  }
  const PAYMENT_LABELS: Record<string, string> = {
    cash: "Cash", mobile_banking: "Mobile Banking", telebirr: "Telebirr", cheque: "Cheque"
  }
  const STATUS_STYLES: Record<string, string> = {
    pending:   "bg-yellow-900/30 text-yellow-400 border-yellow-500/30",
    guests:    "bg-emerald-900/30 text-emerald-400 border-emerald-500/30",
    check_in:  "bg-blue-900/30 text-blue-400 border-blue-500/30",
    rejected:  "bg-red-900/30 text-red-400 border-red-500/30",
    check_out: "bg-purple-900/30 text-purple-400 border-purple-500/30",
  }

  const fetchReception = async () => {
    if (!token) return
    setReceptionLoading(true)
    try {
      const res = await fetch("/api/reception-requests", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        const pendingCount = data.filter((r: any) => r.status === "pending").length
        if (pendingCount > prevReceptionCount.current) {
          let plays = 0
          const interval = setInterval(() => {
            new Audio('/notification.mp3').play().catch(() => {})
            plays++
            if (plays >= 5) clearInterval(interval)
          }, 1500)
        }
        setReceptionRequests(data)
        prevReceptionCount.current = pendingCount
      }
    } catch { /* silent */ }
    finally { setReceptionLoading(false) }
  }

  const handleReceptionAction = async (id: string, status: "check_in" | "check_out" | "rejected") => {
    const label = status === "check_in" ? "Approve Arrival" : status === "check_out" ? "Approve Check-Out" : "Reject"
    const confirmed = await confirm({
      title: `${label} Request`,
      message: `Are you sure you want to proceed?`,
      type: status === "rejected" ? "danger" : "success",
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
        notify({ title: "Success", message: "Request updated successfully", type: "success" })
        setSelectedRequest(null)
        setReviewNote("")
        fetchReception()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to update", type: "error" })
      }
    } catch { notify({ title: "Error", message: "Network error", type: "error" }) }
    setActioning(false)
  }

  const handleExtendDate = async (id: string) => {
    if (!extendDate) {
      notify({ title: "Error", message: "Please select a new checkout date", type: "error" })
      return
    }
    
    const confirmed = await confirm({
      title: "Extend Stay",
      message: `Extend checkout date to ${extendDate}?`,
      type: "success",
      confirmText: "Extend",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    
    setActioning(true)
    try {
      const res = await fetch(`/api/reception-requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ checkOut: extendDate }),
      })
      if (res.ok) {
        notify({ title: "Success", message: "Stay extended successfully", type: "success" })
        setExtendDate("")
        fetchReception()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to extend", type: "error" })
      }
    } catch { notify({ title: "Error", message: "Network error", type: "error" }) }
    setActioning(false)
  }

  const handleReceptionDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Request",
      message: "Are you sure you want to permanently delete this reception request?",
      type: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    
    setActioning(true)
    try {
      const res = await fetch(`/api/reception-requests/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        notify({ title: "Deleted", message: "Request successfully deleted.", type: "success" })
        setSelectedRequest(null)
        fetchReception()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to delete", type: "error" })
      }
    } catch { notify({ title: "Error", message: "Network error", type: "error" }) }
    setActioning(false)
  }

  const handleReceptionDeleteAll = async () => {
    const confirmed = await confirm({
      title: "Delete All Requests",
      message: "WARNING: This will permanently delete ALL reception requests in the database. This action cannot be undone. Are you absolutely sure?",
      type: "danger",
      confirmText: "DELETE ALL",
      cancelText: "Cancel",
    })
    if (!confirmed) return
    
    setActioning(true)
    try {
      const res = await fetch(`/api/reception-requests`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        notify({ title: "Wiped", message: "All reception records have been permanently deleted.", type: "success" })
        fetchReception()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to bulk delete", type: "error" })
      }
    } catch { notify({ title: "Error", message: "Network error", type: "error" }) }
    setActioning(false)
  }

  const fetchData = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      const fetchOptions = { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' as RequestCache }
      const [roomsRes, floorsRes, categoriesRes] = await Promise.all([
        fetch("/api/admin/rooms", fetchOptions),
        fetch("/api/admin/floors", fetchOptions),
        fetch("/api/categories?type=room", fetchOptions)
      ])
      
      if (roomsRes.ok) setRooms(await roomsRes.json())
      if (floorsRes.ok) setFloors(await floorsRes.json())
      if (categoriesRes.ok) setCategories(await categoriesRes.json())

      // Fetch cashiers for assignment
      const usersRes = await fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } })
      if (usersRes.ok) {
        const users = await usersRes.json()
        setCashiers(users.filter((u: any) => u.role === 'cashier'))
      }
    } catch (error) {
      console.error("Fetch error:", error)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => {
    if (activeTab === "reception") {
      fetchReception()
      const interval = setInterval(fetchReception, 15000)
      return () => clearInterval(interval)
    }
  }, [activeTab, token])

  // Poll room orders for Admin audio notifications
  useEffect(() => {
    if (!token) return
    const fetch_ = async () => {
      try {
        const res = await fetch("/api/room-orders", { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          const newCount = data.length
          if (newCount > prevRoomOrdersCount.current) {
            let plays = 0
            const interval = setInterval(() => {
              new Audio('/notification.mp3').play().catch(() => {})
              plays++
              if (plays >= 5) clearInterval(interval)
            }, 1500)
          }
          setRoomOrdersCount(newCount)
          prevRoomOrdersCount.current = newCount
        }
      } catch { /* silent */ }
    }
    fetch_()
    const interval = setInterval(fetch_, 15000)
    return () => clearInterval(interval)
  }, [token])

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

  const handlePrintQR = () => {
    const printContent = document.getElementById("qr-print-area")
    if (!printContent) return
    const WinPrint = window.open("", "", "width=900,height=650")
    if (!WinPrint) return
    WinPrint.document.write(`
      <html>
        <head>
          <title>Print Room QR Code</title>
          <style>
            body { font-family: 'Inter', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #fff; color: #000; }
            .qr-container { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 40px; border: 2px solid #000; border-radius: 20px; max-width: 400px; text-align: center; }
            h1 { margin: 0; font-size: 32px; font-weight: 900; }
            p { margin: 0; font-size: 16px; color: #444; }
            .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #ccc; padding-bottom: 10px; width: 100%; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    WinPrint.document.close()
    WinPrint.focus()
    // Give it a moment to render the SVG before printing
    setTimeout(() => {
      WinPrint.print()
      WinPrint.close()
    }, 250)
  }

  const handleAssignCashier = async (floorId: string, cashierId: string) => {
    try {
      const res = await fetch("/api/admin/floors", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: floorId, roomServiceCashierId: cashierId || null }),
      })
      if (res.ok) {
        notify({ title: "Assignment Updated", message: "Cashier assigned to floor successfully.", type: "success" })
        fetchData()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to assign cashier", type: "error" })
      }
    } catch {
      notify({ title: "Error", message: "Network error", type: "error" })
    }
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
            <TabButton active={activeTab === "reception"} onClick={() => setActiveTab("reception")} icon={<ConciergeBell size={16} />} label="Reception" />
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

                    {activeTab === "reception" && (
                      <div className="space-y-5">
                        {/* Filter tabs */}
                        <div className="flex gap-2 flex-wrap">
                          {(["all","pending","check_in","rejected","check_out"] as const).map(f => {
                            const count = f === "all" ? receptionRequests.length : receptionRequests.filter(r => {
                              if (f === "pending") return r.status === "pending" || !["guests", "check_in", "check_out", "rejected"].includes(r.status)
                              return r.status === f
                            }).length
                            const label = f === "all" ? "GUESTS" : f === "pending" ? "PENDING" : f === "check_in" ? "CHECKED IN" : f === "rejected" ? "DENIED" : "CHECKED OUT"
                            const icon = f === "all" ? <Users size={10} /> : f === "pending" ? <Clock size={10} /> : f === "check_in" ? <CheckCircle2 size={10} /> : f === "rejected" ? <XCircle size={10} /> : <Key size={10} />
                            return (
                              <button key={f} onClick={() => setReceptionFilter(f)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border ${
                                  receptionFilter === f
                                    ? "bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border-[#f5db8b] shadow-lg"
                                    : "bg-[#1a1c1b] text-gray-500 border-white/5 hover:border-[#d4af37]/20 hover:text-gray-300"
                                }`}>
                                {icon}
                                {label} <span className="opacity-60">({count})</span>
                              </button>
                            )
                          })}
                          
                          <div className="ml-auto flex gap-2">
                            <button onClick={handleReceptionDeleteAll} disabled={receptionRequests.length === 0 || actioning} className="p-2 bg-red-900/10 hover:bg-red-900/30 rounded-lg text-red-500 hover:text-red-400 disabled:opacity-30 border border-red-500/20 transition-all flex items-center gap-1">
                              <Trash2 className="h-4 w-4" /> <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Wipe All</span>
                            </button>
                            <button onClick={fetchReception} className="p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors">
                              <RefreshCw className={`h-4 w-4 ${receptionLoading ? "animate-spin" : ""}`} />
                            </button>
                          </div>
                        </div>

                        {receptionLoading ? (
                          <div className="flex items-center justify-center py-24"><RefreshCw className="h-8 w-8 animate-spin text-[#d4af37]" /></div>
                        ) : receptionRequests.filter(r => {
                          if (receptionFilter === "all") return true
                          if (receptionFilter === "pending") return r.status === "pending" || !["guests", "check_in", "check_out", "rejected"].includes(r.status)
                          return r.status === receptionFilter
                        }).length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-24 text-gray-600">
                            <ConciergeBell size={40} className="mb-3 opacity-30" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No {receptionFilter} requests</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {receptionRequests.filter(r => {
                              if (receptionFilter === "all") return true
                              if (receptionFilter === "pending") return r.status === "pending" || !["guests", "check_in", "check_out", "rejected"].includes(r.status)
                              return r.status === receptionFilter
                            }).map(r => {
                              const type = INQUIRY_TYPES[r.inquiryType]
                              return (
                                <div key={r._id} className="bg-[#0f1110] rounded-2xl border border-white/5 hover:border-white/10 transition-all p-5 flex flex-col gap-3 relative group/card">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 text-[#d4af37]">
                                      {type?.icon ?? <MessageSquare size={13} />}
                                      <span className="font-black text-white text-sm">{r.guestName}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => handleReceptionDelete(r._id)} 
                                        className="opacity-0 group-hover/card:opacity-100 p-1.5 bg-red-900/10 hover:bg-red-900/30 text-red-500 rounded-md border border-red-500/20 transition-all shadow-sm">
                                        <Trash2 size={10} />
                                      </button>
                                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase border shrink-0 ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>{r.status}</span>
                                    </div>
                                  </div>
                                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 bg-[#151716] border border-white/5 px-2 py-1 rounded w-fit">{type?.label || r.inquiryType}</span>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-gray-500 font-bold">
                                    {r.faydaId    && <span className="flex items-center gap-1"><IdCard size={10} /> {r.faydaId}</span>}
                                    {r.phone      && <span className="flex items-center gap-1"><Phone size={10} /> {r.phone}</span>}
                                    {r.roomNumber && <span className="flex items-center gap-1"><DoorOpen size={10} /> Room {r.roomNumber}</span>}
                                    {r.roomPrice  && <span className="flex items-center gap-1"><Banknote size={10} /> {r.roomPrice} ETB</span>}
                                    {r.guests     && <span className="flex items-center gap-1"><Users size={10} /> {r.guests} guest{parseInt(r.guests) > 1 ? "s" : ""}</span>}
                                    {r.checkIn    && <span className="flex items-center gap-1"><Calendar size={10} /> {r.checkIn}{r.checkInTime ? ` ${r.checkInTime}` : ""} → {r.checkOut || "?"}{r.checkOutTime ? ` ${r.checkOutTime}` : ""}</span>}
                                    {r.paymentMethod && <span className="flex items-center gap-1">
                                      {r.paymentMethod === "cash" ? <Banknote size={10} /> : r.paymentMethod === "mobile_banking" ? <Smartphone size={10} /> : <CreditCard size={10} />}
                                      {PAYMENT_LABELS[r.paymentMethod] || r.paymentMethod}
                                    </span>}
                                    {(r.paymentReference || r.chequeNumber) && <span className="text-[#f3cf7a]">Ref #{r.paymentReference || r.chequeNumber}</span>}
                                  </div>
                                  {r.notes && <p className="text-[11px] text-gray-500 bg-[#151716] rounded-lg p-2 border border-white/5 italic">"{r.notes}"</p>}
                                  {r.reviewNote && <p className="text-[11px] text-blue-400 bg-blue-900/20 rounded-lg p-2 border border-blue-500/20">↩ {r.reviewNote}</p>}
                                  <p className="text-[9px] text-gray-600 mt-auto">{new Date(r.createdAt).toLocaleString()}</p>
                                  <div className="flex gap-2 pt-1">
                                    <button onClick={() => { setSelectedRequest(r); setReviewNote(r.reviewNote || "") }}
                                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#151716] border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-white/20 transition-all">
                                      <Eye size={12} /> Review
                                    </button>
                                    {r.status === "pending" && (
                                      <>
                                        <button onClick={() => handleReceptionAction(r._id, "rejected")}
                                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-red-900/30 border border-red-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-900/50 transition-all">
                                          <XCircle size={12} /> Deny
                                        </button>
                                        <button onClick={() => handleReceptionAction(r._id, r.inquiryType === "check_out" ? "check_out" : "check_in")}
                                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] rounded-lg text-[10px] font-black uppercase tracking-widest hover:shadow-[#d4af37]/10 transition-all">
                                          {r.inquiryType === "check_out" ? <Key size={12} /> : <CheckCircle2 size={12} />}
                                          Approve
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
                    )}

                    {activeTab === "rooms" && (                      <div className="space-y-8">
                        {rooms.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-32 text-gray-500">
                            <Bed size={48} className="mb-4 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest">No rooms added yet</p>
                          </div>
                        ) : (
                          floors
                            .filter(floor => rooms.some(r => (r.floorId?._id || r.floorId) === floor._id))
                            .sort((a, b) => a.floorNumber - b.floorNumber)
                            .map(floor => {
                              const floorRooms = rooms.filter(r => (r.floorId?._id || r.floorId) === floor._id)
                              return (
                                <div key={floor._id}>
                                  {/* Floor Header */}
                                  <div className="flex items-center gap-4 mb-4">
                                    <div className="flex items-center gap-3 bg-[#0f1110] border border-[#d4af37]/30 rounded-2xl px-5 py-3">
                                      <Building size={20} className="text-[#d4af37]" />
                                      <span className="text-lg font-black uppercase tracking-wider text-[#f3cf7a]">Floor {floor.floorNumber}</span>
                                      {floor.isVIP && <span className="text-[9px] font-black uppercase tracking-widest text-[#d4af37] bg-[#d4af37]/10 border border-[#d4af37]/30 px-2 py-1 rounded-md ml-1">VIP</span>}
                                    </div>
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{floorRooms.length} room{floorRooms.length !== 1 ? "s" : ""}</span>
                                    <div className="flex-1 h-[1px] bg-white/5" />
                                    
                                    {/* Cashier Assignment Dropdown */}
                                    <div className="flex items-center gap-3 bg-[#0f1110] border border-white/5 rounded-xl px-4 py-2 hover:border-[#d4af37]/20 transition-all">
                                      <Users size={14} className="text-gray-500" />
                                      <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-gray-600">Room Service Handler</span>
                                        <select 
                                          value={(floor as any).roomServiceCashierId || ""} 
                                          onChange={(e) => handleAssignCashier(floor._id, e.target.value)}
                                          className="bg-transparent text-white text-[10px] font-bold outline-none cursor-pointer pr-2"
                                        >
                                          <option value="" className="text-black bg-white">Auto (Unassigned)</option>
                                          {cashiers.map(c => (
                                            <option key={c._id} value={c._id} className="text-black bg-white">
                                              {c.name} ({c.email})
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Rooms Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {floorRooms.map(room => (
                                      <div key={room._id} className="bg-[#0f1110] rounded-3xl p-6 shadow-sm border border-white/5 hover:border-[#d4af37]/30 transition-all group">
                                        <div className="flex justify-between items-start mb-4">
                                          <div className="flex gap-4 items-center">
                                            <div className="w-14 h-14 bg-[#151716] border border-white/5 rounded-2xl flex items-center justify-center text-[#d4af37] group-hover:scale-110 transition-transform"><Bed size={24} /></div>
                                            <div>
                                              <h3 className="text-xl font-black text-white leading-none">Room {room.roomNumber}</h3>
                                              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{room.category}</p>
                                            </div>
                                          </div>
                                          <span className={`px-2.5 py-1 rounded-md border text-[9px] font-bold uppercase tracking-widest ${room.status === 'available' ? 'bg-[#1a2e20] text-[#4ade80] border-[#4ade80]/30' : room.status === 'occupied' ? 'bg-red-950/30 text-red-500 border-red-500/30' : 'bg-[#b38822]/10 text-[#f3cf7a] border-[#d4af37]/30'}`}>
                                            {room.status}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center mt-6">
                                          <span className="text-lg font-black text-[#f3cf7a]">{room.price} Br</span>
                                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setSelectedQrRoom(room)} className="p-2 bg-[#151716] rounded-xl text-gray-500 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/20 transition-all" title="View QR Code"><span className="font-bold flex items-center justify-center italic">QR</span></button>
                                            <button onClick={() => handleEdit(room)} className="p-2 bg-[#151716] rounded-xl text-gray-500 hover:text-[#f3cf7a] hover:bg-[#1a1c1b] border border-transparent hover:border-[#d4af37]/30 transition-all"><Pencil size={14} /></button>
                                            <button onClick={() => handleRoomDelete(room)} className="p-2 bg-[#151716] rounded-xl text-gray-500 hover:text-red-500 hover:bg-red-950/50 border border-transparent hover:border-red-500/30 transition-all"><Trash2 size={14} /></button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={e => { if (e.target === e.currentTarget) setSelectedRequest(null) }}>
            <div className="bg-[#151716] border border-white/10 rounded-2xl shadow-2xl max-w-lg w-full flex flex-col" style={{ maxHeight: "85vh" }}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
                <h2 className="text-lg font-playfair italic text-[#f3cf7a]">Request Detail</h2>
                <button onClick={() => setSelectedRequest(null)} className="w-8 h-8 bg-[#0f1110] border border-white/20 rounded-xl flex items-center justify-center text-white hover:text-red-400 hover:border-red-500/30 transition-all"><X size={16} /></button>
              </div>
              <div className="overflow-y-auto p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Guest", selectedRequest.guestName],
                    ["Type", INQUIRY_TYPES[selectedRequest.inquiryType]?.label || selectedRequest.inquiryType],
                    ["Fayda ID", selectedRequest.faydaId],
                    ["Phone", selectedRequest.phone],
                    ["Room", selectedRequest.roomNumber ? `Room ${selectedRequest.roomNumber}` : null],
                    ["Price", selectedRequest.roomPrice ? `${selectedRequest.roomPrice} ETB` : null],
                    ["Guests", selectedRequest.guests],
                    ["Payment", PAYMENT_LABELS[selectedRequest.paymentMethod] || selectedRequest.paymentMethod],
                    ["Ref #", selectedRequest.paymentReference || selectedRequest.chequeNumber],
                    ["Check-In", selectedRequest.checkIn ? `${selectedRequest.checkIn}${selectedRequest.checkInTime ? ` ${selectedRequest.checkInTime}` : ""}` : null],
                    ["Check-Out", selectedRequest.checkOut ? `${selectedRequest.checkOut}${selectedRequest.checkOutTime ? ` ${selectedRequest.checkOutTime}` : ""}` : null],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <div key={label as string} className="bg-[#0f1110] rounded-lg p-3 border border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1">{label}</p>
                      <p className="text-white text-xs font-bold">{value}</p>
                    </div>
                  ))}
                </div>
                {selectedRequest.transactionUrl && (
                  <div className="bg-[#0f1110] rounded-lg p-3 border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">Transaction</p>
                    <TransactionPreview url={selectedRequest.transactionUrl} />
                  </div>
                )}
                {(selectedRequest.idPhotoFront || selectedRequest.idPhotoBack) && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">ID Card Photos</p>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedRequest.idPhotoFront && (
                        <div>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Front</p>
                          <a href={selectedRequest.idPhotoFront} target="_blank" rel="noreferrer" className="block group">
                            <img src={selectedRequest.idPhotoFront} alt="ID Front"
                              className="w-full h-44 object-cover rounded-xl border border-white/10 group-hover:border-[#d4af37]/40 transition-all shadow-lg" />
                          </a>
                        </div>
                      )}
                      {selectedRequest.idPhotoBack && (
                        <div>
                          <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5">Back</p>
                          <a href={selectedRequest.idPhotoBack} target="_blank" rel="noreferrer" className="block group">
                            <img src={selectedRequest.idPhotoBack} alt="ID Back"
                              className="w-full h-44 object-cover rounded-xl border border-white/10 group-hover:border-[#d4af37]/40 transition-all shadow-lg" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {selectedRequest.photoUrl && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2">Guest Photo (URL)</p>
                    <a href={selectedRequest.photoUrl} target="_blank" rel="noreferrer" className="block group">
                      <img src={selectedRequest.photoUrl} alt="Guest"
                        className="w-full h-48 object-contain rounded-xl border border-white/10 group-hover:border-[#d4af37]/40 transition-all shadow-lg bg-[#0f1110]" />
                    </a>
                  </div>
                )}
                {selectedRequest.notes && (
                  <div className="bg-[#0f1110] rounded-lg p-3 border border-white/5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-1">Notes</p>
                    <p className="text-gray-300 text-xs italic">"{selectedRequest.notes}"</p>
                  </div>
                )}
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Review Note (optional)</label>
                  <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} rows={2}
                    placeholder="Add a note for the reception staff..."
                    className="w-full bg-[#0f1110] border border-white/10 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-[#d4af37]/50 resize-none placeholder:text-gray-600" />
                </div>
                {selectedRequest.status === "pending" ? (
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => handleReceptionAction(selectedRequest._id, "rejected")} disabled={actioning}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-900/30 border border-red-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-900/50 transition-all disabled:opacity-50">
                      <XCircle size={14} /> Deny
                    </button>
                    <button onClick={() => handleReceptionAction(selectedRequest._id, selectedRequest.inquiryType === "check_out" ? "check_out" : "check_in")} disabled={actioning}
                      className="flex-[2] flex items-center justify-center gap-2 py-3 bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-[0_4px_15px_rgba(212,175,55,0.2)] transition-all disabled:opacity-50">
                      {selectedRequest.inquiryType === "check_out" ? <Key size={14} /> : <CheckCircle2 size={14} />}
                      Approve
                    </button>
                  </div>
                ) : selectedRequest.status === "check_in" ? (
                  <div className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="block text-[9px] font-black uppercase tracking-widest text-[#d4af37]">Extend Checkout</label>
                        <input type="date" value={extendDate} onChange={e => setExtendDate(e.target.value)}
                          className="w-full bg-[#0f1110] border border-white/10 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-[#d4af37]/30 transition-all" />
                      </div>
                      <div className="flex flex-col justify-end">
                        <button onClick={() => handleExtendDate(selectedRequest._id)} disabled={actioning || !extendDate}
                          className="py-2 bg-[#d4af37]/20 border border-[#d4af37]/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#f3cf7a] hover:bg-[#d4af37]/30 transition-all disabled:opacity-50">
                          Extend
                        </button>
                      </div>
                    </div>
                    <button onClick={() => handleReceptionAction(selectedRequest._id, "check_out")} disabled={actioning}
                      className="w-full py-3 bg-purple-900/30 border border-purple-500/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-purple-400 hover:bg-purple-900/50 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                      <Key size={14} /> Approve Check-Out
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className={`flex-1 p-3 rounded-xl border text-center text-[10px] font-black uppercase tracking-widest ${STATUS_STYLES[selectedRequest.status]}`}>
                      {selectedRequest.status === "check_out" ? "CHECKED OUT - Guest has departed" : "DENIED - Request rejected"}
                    </div>
                    <button onClick={() => handleReceptionDelete(selectedRequest._id)} disabled={actioning}
                      className="p-3 bg-red-900/30 border border-red-500/30 rounded-xl text-red-400 hover:bg-red-900/50 transition-all disabled:opacity-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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

        {selectedQrRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-[#151716] border border-white/10 rounded-3xl shadow-2xl max-w-sm w-full relative overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0">
                <h2 className="text-lg font-playfair italic text-[#f3cf7a]">Room QR Code</h2>
                <button onClick={() => setSelectedQrRoom(null)} className="w-8 h-8 bg-[#0f1110] border border-white/20 rounded-xl flex items-center justify-center text-white hover:text-red-400 hover:border-red-500/30 transition-all"><X size={16} /></button>
              </div>
              <div className="p-8 flex flex-col items-center justify-center">
                <div id="qr-print-area" className="qr-container bg-white p-6 rounded-2xl flex flex-col items-center justify-center text-center shadow-lg border-4 border-[#0f1110]">
                  <div className="logo hidden">ABE HOTEL</div>
                  <h1 className="text-2xl font-black text-black mb-1 hidden">Room {selectedQrRoom.roomNumber}</h1>
                  <p className="text-xs text-gray-600 mb-6 hidden">Scan for Room Service</p>
                  
                  {/* The actual QR shown in UI */}
                  <div className="bg-white p-2 rounded-xl">
                    <QRCodeSVG 
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/room-service/${selectedQrRoom.roomNumber}`}
                      size={200}
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  <h3 className="text-xl font-black text-black mt-4 block">Room {selectedQrRoom.roomNumber}</h3>
                  <p className="text-[10px] uppercase font-black tracking-widest text-gray-500 block">Room Service</p>
                </div>

                <div className="mt-8 w-full">
                  <button onClick={handlePrintQR} className="w-full bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all">
                    Print QR Code
                  </button>
                  <p className="text-center text-gray-500 text-[10px] mt-4 font-bold tracking-widest uppercase break-all px-4">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/room-service/{selectedQrRoom.roomNumber}
                  </p>
                </div>
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
