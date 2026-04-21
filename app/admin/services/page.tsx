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
import { format, isToday, isThisWeek, isThisMonth, isThisYear, isSameDay } from "date-fns"
import { 
  Plus, 
  Trash2, 
  Pencil, 
  X,
  Check,
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
  Search,
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

type Tab = "menu-standard" | "vip" | "rooms" | "reception" | "room-orders"

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
  roomServiceMenuTier?: string
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
    roomNumber: "", name: "", floorId: "", type: "standard", category: "Standard", price: "", status: "available", roomServiceMenuTier: "standard"
  })
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [selectedQrRoom, setSelectedQrRoom] = useState<Room | null>(null)
  const [cashiers, setCashiers] = useState<any[]>([])
  
  // Room Order tracking for Admin
  const [roomOrdersCount, setRoomOrdersCount] = useState(0)
  const [roomOrders, setRoomOrders] = useState<any[]>([])
  const prevRoomOrdersCount = useRef(0)
  const prevReceptionCount = useRef(0)
  const receptionInitialLoad = useRef(true)

  // Reception state
  const [receptionRequests, setReceptionRequests] = useState<any[]>([])
  const [receptionLoading, setReceptionLoading] = useState(false)
  const [receptionFilter, setReceptionFilter] = useState<"all"|"pending"|"guests"|"check_in"|"rejected"|"check_out">("pending")
  const [receptionDateFilter, setReceptionDateFilter] = useState<"all" | "today" | "week" | "month" | "year" | "custom">("all")
  const [customReceptionDate, setCustomReceptionDate] = useState("")
  const [receptionSearchQuery, setReceptionSearchQuery] = useState("")
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null)
  const [reviewNote, setReviewNote] = useState("")
  const [actioning, setActioning] = useState(false)
  const [extendDate, setExtendDate] = useState("")
  const [fetchingRequestId, setFetchingRequestId] = useState<string | null>(null)
  const receptionDatePickerRef = useRef<HTMLInputElement>(null)

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
    if (receptionInitialLoad.current) setReceptionLoading(true)
    try {
      const res = await fetch("/api/reception-requests?limit=500", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        // Handle both old array format and new paginated format
        const requests = Array.isArray(data) ? data : (data.data || [])
        const pendingCount = requests.filter((r: any) => ["CHECKIN_PENDING", "CHECKOUT_PENDING", "EXTEND_PENDING", "pending"].includes(r.status)).length
        if (pendingCount > prevReceptionCount.current) {
          let plays = 0
          const interval = setInterval(() => {
            new Audio('/notification.mp3').play().catch(() => {})
            plays++
            if (plays >= 5) clearInterval(interval)
          }, 1500)
        }
        setReceptionRequests(requests)
        prevReceptionCount.current = pendingCount
        receptionInitialLoad.current = false
      }
    } catch { /* silent */ }
    finally { setReceptionLoading(false) }
  }

  const handleReceptionAction = async (
    id: string,
    action: "approve" | "deny",
    inquiryType: "check_in" | "check_out",
    currentStatus?: string
  ) => {
    const label =
      action === "approve"
        ? inquiryType === "check_out"
          ? "Approve Check-Out"
          : "Approve Arrival"
        : inquiryType === "check_out"
          ? "Deny Check-Out"
          : "Reject"
    const confirmed = await confirm({
      title: `${label} Request`,
      message: `Are you sure you want to proceed?`,
      type: action === "deny" ? "danger" : "success",
      confirmText: label,
      cancelText: "Cancel",
    })
    if (!confirmed) return
    setActioning(true)
    try {
      // Canonical status transitions:
      // - check_in approve -> CHECKIN_APPROVED
      // - check_in deny    -> REJECTED
      // - check_out approve -> CHECKED_OUT
      // - check_out deny    -> CHECKIN_APPROVED (guest remains checked-in)
      const status =
        currentStatus === "EXTEND_PENDING"
          ? "CHECKIN_APPROVED"
          : inquiryType === "check_out"
            ? action === "approve"
              ? "CHECKED_OUT"
              : "CHECKIN_APPROVED"
            : action === "approve"
              ? "CHECKIN_APPROVED"
              : "REJECTED"

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
        setCashiers(users.filter((u: any) => u.role === 'cashier' || u.role === 'admin'))
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
      receptionInitialLoad.current = true
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
          setRoomOrders(data)
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
    console.log("✏️ Editing Room Data:", room)
    setEditingRoom(room)
    setRoomForm({
      roomNumber: room.roomNumber, 
      name: room.name || "", 
      floorId: room.floorId?._id || room.floorId || "",
      type: room.type, 
      category: room.category, 
      price: room.price.toString(), 
      status: room.status,
      roomServiceMenuTier: room.roomServiceMenuTier || "standard"
    })
    setShowForm(true)
  }

  const resetRoomForm = () => {
    setEditingRoom(null)
    setRoomForm({ roomNumber: "", name: "", floorId: "", type: "standard", category: "Standard", price: "", status: "available", roomServiceMenuTier: "standard" })
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

  const handleRoomOrderAction = async (orderId: string, action: 'approve' | 'deny') => {
    if (!token) return
    try {
      const newStatus = action === 'approve' ? 'pending' : 'cancelled'
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (res.ok) {
        notify({
          title: "Success",
          message: `Order successfully ${action === 'approve' ? 'approved to kitchen' : 'denied'}.`,
          type: "success"
        })
        // Fetch room orders count/list
        const res_ = await fetch("/api/room-orders", { headers: { Authorization: `Bearer ${token}` } })
        if (res_.ok) {
          const data = await res_.json()
          setRoomOrders(data)
          setRoomOrdersCount(data.length)
        }
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Action failed", type: "error" })
      }
    } catch (error) {
      notify({ title: "Error", message: "Network error", type: "error" })
    }
  }

  const router = useRouter()

  return (
    <ProtectedRoute requiredRoles={["admin"]} requiredPermissions={["services:view"]}>
      <div className="min-h-screen bg-[#0f1110] p-6 text-white selection:bg-[#c5a059] selection:text-[#0f1110]">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Tab Bar — 3 tabs only */}
          <div className="flex bg-[#151716] p-2 rounded-2xl shadow-sm border border-white/5 overflow-x-auto gap-2">
            <TabButton active={activeTab === "rooms"} onClick={() => setActiveTab("rooms")} icon={<Building size={16} />} label="Room Management" />
            <TabButton active={activeTab === "menu-standard"} onClick={() => setActiveTab("menu-standard")} icon={<Utensils size={16} />} label="Standard Menu" />
            <TabButton active={activeTab === "vip"} onClick={() => setActiveTab("vip")} icon={<Crown size={16} />} label="VIP Menus" />
            <TabButton active={activeTab === "reception"} onClick={() => setActiveTab("reception")} icon={<ConciergeBell size={16} />} label="Reception" />
            <div className="relative">
              <TabButton active={activeTab === "room-orders"} onClick={() => setActiveTab("room-orders")} icon={<Utensils size={16} />} label="Room Orders" />
              {roomOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1 shadow-lg border border-[#151716]">
                  {roomOrdersCount}
                </span>
              )}
            </div>
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
                        publicMenuUrl="/public-menu"
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
                        
                        {/* Search & Date Filters */}
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input 
                              type="text"
                              value={receptionSearchQuery}
                              onChange={e => setReceptionSearchQuery(e.target.value)}
                              placeholder="Search guests by name, phone, room or ID..."
                              className="w-full bg-[#151716] border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-xs font-bold uppercase tracking-widest text-[#f3cf7a] outline-none focus:border-[#d4af37]/30 transition-all placeholder:text-gray-700"
                            />
                          </div>
                          <div className="flex items-center gap-1 bg-[#151716] border border-white/5 p-1 rounded-xl w-full md:w-auto overflow-x-auto text-[10px] uppercase font-black tracking-widest text-gray-500 shrink-0">
                             <button onClick={() => setReceptionDateFilter("all")} className={`px-3 py-2 rounded-lg transition-all ${receptionDateFilter === "all" ? "bg-[#d4af37]/10 text-[#f3cf7a]" : "hover:text-gray-300"}`}>All Time</button>
                             <button onClick={() => setReceptionDateFilter("today")} className={`px-3 py-2 rounded-lg transition-all ${receptionDateFilter === "today" ? "bg-[#d4af37]/10 text-[#f3cf7a]" : "hover:text-gray-300"}`}>Today</button>
                             <button onClick={() => setReceptionDateFilter("week")} className={`px-3 py-2 rounded-lg transition-all ${receptionDateFilter === "week" ? "bg-[#d4af37]/10 text-[#f3cf7a]" : "hover:text-gray-300"}`}>Week</button>
                             <button onClick={() => setReceptionDateFilter("year")} className={`px-3 py-2 rounded-lg transition-all ${receptionDateFilter === "year" ? "bg-[#d4af37]/10 text-[#f3cf7a]" : "hover:text-gray-300"}`}>Year</button>
                             <div className="relative flex items-center">
                                <input 
                                  ref={receptionDatePickerRef}
                                  type="date" 
                                  value={customReceptionDate} 
                                  onChange={e => { setCustomReceptionDate(e.target.value); setReceptionDateFilter("custom"); }} 
                                  className="sr-only" 
                                />
                                <button 
                                  type="button"
                                  onClick={() => (receptionDatePickerRef.current as any)?.showPicker?.() ?? receptionDatePickerRef.current?.click()}
                                  className={`px-3 py-2 rounded-lg transition-all flex items-center gap-1 ${receptionDateFilter === "custom" ? "bg-[#d4af37]/10 text-[#f3cf7a]" : "hover:text-gray-300"}`}
                                >
                                   <Calendar size={12} /> {receptionDateFilter === "custom" && customReceptionDate ? customReceptionDate : "Pick Date"}
                                </button>
                             </div>
                          </div>
                        </div>

                        {/* Filter tabs */}
                        <div className="flex gap-2 flex-wrap">
                          {(["all","pending","check_in","rejected","check_out"] as const).map(f => {
                            const count = f === "all" ? 
                              receptionRequests.filter(r => {
                                if (receptionSearchQuery) {
                                  const q = receptionSearchQuery.toLowerCase()
                                  if (!(r.guestName?.toLowerCase().includes(q) || r.phone?.toLowerCase().includes(q) || r.faydaId?.toLowerCase().includes(q) || r.roomNumber?.toLowerCase().includes(q))) return false;
                                }
                                if (receptionDateFilter !== "all" && r.createdAt) {
                                  const d = new Date(r.createdAt)
                                  if (receptionDateFilter === "today" && !isToday(d)) return false;
                                  if (receptionDateFilter === "week" && !isThisWeek(d)) return false;
                                  if (receptionDateFilter === "month" && !isThisMonth(d)) return false;
                                  if (receptionDateFilter === "year" && !isThisYear(d)) return false;
                                  if (receptionDateFilter === "custom" && customReceptionDate && !isSameDay(d, new Date(customReceptionDate))) return false;
                                }
                                return true;
                              }).length : 
                              receptionRequests.filter(r => {
                              if (receptionSearchQuery) {
                                const q = receptionSearchQuery.toLowerCase()
                                if (!(r.guestName?.toLowerCase().includes(q) || r.phone?.toLowerCase().includes(q) || r.faydaId?.toLowerCase().includes(q) || r.roomNumber?.toLowerCase().includes(q))) return false;
                              }
                              if (receptionDateFilter !== "all" && r.createdAt) {
                                const d = new Date(r.createdAt)
                                if (receptionDateFilter === "today" && !isToday(d)) return false;
                                if (receptionDateFilter === "week" && !isThisWeek(d)) return false;
                                if (receptionDateFilter === "month" && !isThisMonth(d)) return false;
                                if (receptionDateFilter === "year" && !isThisYear(d)) return false;
                                if (receptionDateFilter === "custom" && customReceptionDate && !isSameDay(d, new Date(customReceptionDate))) return false;
                              }
                              if (f === "pending") return ["CHECKIN_PENDING", "CHECKOUT_PENDING", "pending"].includes(r.status)
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
                          if (receptionSearchQuery) {
                            const q = receptionSearchQuery.toLowerCase()
                            if (!(r.guestName?.toLowerCase().includes(q) || r.phone?.toLowerCase().includes(q) || r.faydaId?.toLowerCase().includes(q) || r.roomNumber?.toLowerCase().includes(q))) return false;
                          }
                          if (receptionDateFilter !== "all" && r.createdAt) {
                            const d = new Date(r.createdAt)
                            if (receptionDateFilter === "today" && !isToday(d)) return false;
                            if (receptionDateFilter === "week" && !isThisWeek(d)) return false;
                            if (receptionDateFilter === "month" && !isThisMonth(d)) return false;
                            if (receptionDateFilter === "year" && !isThisYear(d)) return false;
                            if (receptionDateFilter === "custom" && customReceptionDate && !isSameDay(d, new Date(customReceptionDate))) return false;
                          }
                          if (receptionFilter === "all") return true
                          if (receptionFilter === "pending") return ["CHECKIN_PENDING", "CHECKOUT_PENDING", "EXTEND_PENDING", "pending"].includes(r.status)
                          if (receptionFilter === "check_in") return ["CHECKIN_APPROVED", "check_in", "ACTIVE", "guests"].includes(r.status)
                          if (receptionFilter === "check_out") return ["CHECKED_OUT", "CHECKOUT_APPROVED", "check_out"].includes(r.status)
                          if (receptionFilter === "rejected") return ["REJECTED", "rejected"].includes(r.status)
                          return r.status === receptionFilter
                        }).length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-24 text-gray-600">
                            <ConciergeBell size={40} className="mb-3 opacity-30" />
                            <p className="text-[10px] font-black uppercase tracking-widest">No {receptionFilter} requests</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {receptionRequests.filter(r => {
                              if (receptionSearchQuery) {
                                const q = receptionSearchQuery.toLowerCase()
                                if (!(r.guestName?.toLowerCase().includes(q) || r.phone?.toLowerCase().includes(q) || r.faydaId?.toLowerCase().includes(q) || r.roomNumber?.toLowerCase().includes(q))) return false;
                              }
                              if (receptionDateFilter !== "all" && r.createdAt) {
                                const d = new Date(r.createdAt)
                                if (receptionDateFilter === "today" && !isToday(d)) return false;
                                if (receptionDateFilter === "week" && !isThisWeek(d)) return false;
                                if (receptionDateFilter === "month" && !isThisMonth(d)) return false;
                                if (receptionDateFilter === "year" && !isThisYear(d)) return false;
                                if (receptionDateFilter === "custom" && customReceptionDate && !isSameDay(d, new Date(customReceptionDate))) return false;
                              }
                              if (receptionFilter === "all") return true
                              if (receptionFilter === "pending") return ["CHECKIN_PENDING", "CHECKOUT_PENDING", "EXTEND_PENDING", "pending"].includes(r.status)
                              if (receptionFilter === "check_in") return ["CHECKIN_APPROVED", "check_in", "ACTIVE", "guests"].includes(r.status)
                              if (receptionFilter === "check_out") return ["CHECKED_OUT", "CHECKOUT_APPROVED", "check_out"].includes(r.status)
                              if (receptionFilter === "rejected") return ["REJECTED", "rejected"].includes(r.status)
                              return r.status === receptionFilter
                            }).map(r => {
                              const type = INQUIRY_TYPES[r.inquiryType]
                              return (
                                <div key={r._id} className="relative bg-[#151716] rounded-[2rem] border border-white/5 overflow-hidden group hover:border-[#d4af37]/30 transition-all flex flex-col shadow-2xl">
                                  {/* Top Accent Bar */}
                                  <div className={`h-1.5 w-full ${
                                    (r.status === 'CHECKIN_APPROVED' || r.status === 'check_in' || r.status === 'ACTIVE' || r.status === 'guests') ? 'bg-blue-500' :
                                    (r.status === 'REJECTED' || r.status === 'rejected') ? 'bg-red-500' :
                                    (r.status === 'CHECKED_OUT' || r.status === 'CHECKOUT_APPROVED' || r.status === 'check_out') ? 'bg-purple-500' :
                                    (r.status === 'CHECKOUT_PENDING') ? 'bg-orange-500' :
                                    'bg-yellow-500'
                                  }`} />
                                                                {/* Delete Button */}
                                  <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleReceptionDelete(r._id)} 
                                      className="p-2 bg-red-950/50 hover:bg-red-600 text-red-500 hover:text-white rounded-xl border border-red-500/30 transition-all shadow-xl">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>

                                  <div className="p-5 flex flex-col gap-4">
                                    {/* Header: Name & Status */}
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex flex-col gap-0.5">
                                        <span className="font-bold text-white text-lg tracking-tight leading-none">{r.guestName}</span>
                                        <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Guest Profile</span>
                                      </div>
                                      <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase border shadow-sm ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                                        {r.status.toUpperCase()}
                                      </span>
                                    </div>

                                    {/* Action Tag */}
                                    <div className="flex">
                                       <span className="text-[8px] font-black px-3 py-1 bg-[#1a1c1b] text-gray-500 rounded border border-white/5 uppercase tracking-widest">
                                         {r.inquiryType.replace("_", "-").toUpperCase()}
                                       </span>
                                    </div>

                                    {/* Detailed Info Grid */}
                                    <div className="space-y-4">
                                      {/* Row 1: ID, Phone, Room, Price */}
                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-gray-400 font-bold">
                                        <div className="flex items-center gap-1.5 min-w-fit">
                                          <IdCard size={12} className="text-gray-600" />
                                          <span className="text-gray-300">{r.faydaId || "No ID"}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 min-w-fit">
                                          <Phone size={12} className="text-gray-600" />
                                          <span className="text-gray-300">{r.phone || "No Phone"}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 min-w-fit">
                                          <DoorOpen size={12} className="text-gray-600" />
                                          <span className="text-white">Room {r.roomNumber || "?"}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 min-w-fit">
                                          <Banknote size={12} className="text-gray-600" />
                                          <span className="text-[#f3cf7a]">{r.roomPrice || "?"} ETB</span>
                                        </div>
                                      </div>

                                      {/* Row 2: Guests, Dates */}
                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] text-gray-400 font-bold border-t border-white/5 pt-3">
                                        <div className="flex items-center gap-1.5">
                                          <Users size={12} className="text-gray-600" />
                                          <span className="text-gray-300">{r.guests} Guests</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <Calendar size={12} className="text-gray-600" />
                                          <span className="text-gray-300">{r.checkIn} → {r.checkOut || "?"}</span>
                                        </div>
                                      </div>

                                      {/* Row 3: Payment */}
                                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
                                        <div className="flex items-center gap-2">
                                          <div className="p-1.5 bg-[#1a1c1b] rounded-lg border border-white/5">
                                            {r.paymentMethod === "cash" ? <Banknote size={12} className="text-emerald-500" /> : r.paymentMethod === "mobile_banking" ? <Smartphone size={12} className="text-blue-500" /> : <CreditCard size={12} className="text-purple-500" />}
                                          </div>
                                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">{r.paymentMethod.replace("_", " ")}</span>
                                        </div>
                                        {(r.paymentReference || r.chequeNumber) && (
                                          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#d4af37]/5 border border-[#d4af37]/20 rounded-md">
                                            <span className="text-[9px] font-black text-[#f3cf7a] tracking-tight">Ref #{r.paymentReference || r.chequeNumber}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Notes & Review Row */}
                                    <div className="space-y-3 pt-2">
                                      {r.notes && <p className="text-[11px] text-gray-500 bg-[#1a1c1b] rounded-xl p-3 border border-white/5 italic line-clamp-2">"{r.notes}"</p>}
                                      {r.reviewNote && <p className="text-[11px] text-blue-400 bg-blue-900/20 rounded-xl p-3 border border-blue-500/20 flex items-start gap-2">
                                        <RefreshCw size={12} className="mt-0.5 shrink-0" />
                                        <span>{r.reviewNote}</span>
                                      </p>}
                                      
                                      <div className="flex items-center justify-between text-[9px] font-bold text-gray-600 mt-2 px-1">
                                        <span>{new Date(r.createdAt).toLocaleString()}</span>
                                        {r.transactionUrl && (
                                          <a href={r.transactionUrl} target="_blank" rel="noopener noreferrer" 
                                            className="flex items-center gap-1 text-[#d4af37] hover:underline">
                                            <Link size={10} /> Receipt
                                          </a>
                                        )}
                                      </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="flex gap-2 pt-2">
                                      <button 
                                        onClick={async () => {
                                          setFetchingRequestId(r._id);
                                          try {
                                            const res = await fetch(`/api/reception-requests/${r._id}`, {
                                              headers: { Authorization: `Bearer ${token}` }
                                            });
                                            if (res.ok) {
                                              const full = await res.json();
                                              setSelectedRequest(full);
                                              setReviewNote(full.reviewNote || "");
                                            } else {
                                              setSelectedRequest(r);
                                              setReviewNote(r.reviewNote || "");
                                            }
                                          } catch {
                                            setSelectedRequest(r);
                                            setReviewNote(r.reviewNote || "");
                                          } finally {
                                            setFetchingRequestId(null);
                                          }
                                        }}
                                        disabled={fetchingRequestId === r._id}
                                        className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-white overflow-hidden relative group/btn rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl disabled:opacity-60 disabled:cursor-wait">
                                        <div className="absolute inset-0 bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                        {fetchingRequestId === r._id
                                          ? <RefreshCw size={16} className="text-[#0f1110] relative z-10 animate-spin" />
                                          : <Eye size={16} className="text-[#0f1110] relative z-10" />
                                        }
                                        <span className="text-[#0f1110] font-black text-[10px] uppercase tracking-[0.2em] relative z-10">
                                          {fetchingRequestId === r._id ? 'Loading...' : 'Review'}
                                        </span>
                                      </button>
                                      
                                      {["CHECKIN_PENDING", "CHECKOUT_PENDING", "EXTEND_PENDING", "pending"].includes(r.status) && (
                                        <>
                                          <button onClick={() => handleReceptionAction(r._id, "deny", r.inquiryType, r.status)}
                                            className="px-4 py-3.5 bg-red-900/20 border border-red-500/30 rounded-2xl text-red-500 hover:bg-red-900/40 transition-all flex items-center justify-center">
                                            <XCircle size={18} />
                                          </button>
                                          <button onClick={() => handleReceptionAction(r._id, "approve", r.inquiryType, r.status)}
                                            className="px-6 py-3.5 bg-emerald-900/20 border border-emerald-500/30 rounded-2xl text-emerald-500 hover:bg-emerald-900/40 transition-all flex items-center justify-center gap-2">
                                            <CheckCircle2 size={18} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Approve</span>
                                          </button>
                                        </>
                                      )}
                                    </div>
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

                    {/* Room Orders Tab Content */}
                    {activeTab === "room-orders" && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between mb-8">
                          <div>
                            <h2 className="text-2xl font-playfair italic font-bold text-[#f3cf7a] flex items-center gap-3">
                              Room Order <span className="text-white">Approvals</span> <ConciergeBell className="text-[#d4af37]" />
                            </h2>
                            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Review guest requests before kitchen preparation</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Queue Status</span>
                            <span className="text-2xl font-black text-[#f3cf7a]">{roomOrders.length} <span className="text-xs text-gray-600">PENDING</span></span>
                          </div>
                        </div>

                        {roomOrders.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-32 bg-[#0f1110] rounded-[2rem] border border-white/5">
                            <Check className="h-16 w-16 text-emerald-500/20 mb-4" />
                            <h3 className="text-xl font-bold text-gray-600 uppercase tracking-widest">All Orders Handled</h3>
                            <p className="text-gray-700 mt-2 text-xs font-medium">No new room requests waiting for approval.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {roomOrders.map(order => (
                              <div key={order._id} className="bg-[#0f1110] rounded-3xl border border-white/10 overflow-hidden shadow-2xl flex flex-col group hover:border-[#d4af37]/30 transition-all">
                                <div className="bg-[#1a1c1b] p-5 border-b border-white/5 flex items-start justify-between">
                                  <div>
                                    <div className="flex items-center gap-3 mb-1">
                                      <div className="bg-[#d4af37]/10 p-2 rounded-xl border border-[#d4af37]/20">
                                        <ConciergeBell size={18} className="text-[#d4af37]" />
                                      </div>
                                      <div>
                                        <h3 className="text-2xl font-black text-white leading-tight">{order.tableNumber}</h3>
                                        <p className="text-[9px] font-black text-[#f3cf7a] uppercase tracking-widest mt-0.5">Floor #{order.floorNumber}</p>
                                      </div>
                                    </div>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 flex items-center gap-1.5 mt-2">
                                      <Clock size={12} /> {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                  <div className="bg-[#0f1110] px-4 py-2 rounded-xl border border-white/5 text-right">
                                    <p className="text-[8px] uppercase font-black tracking-widest text-gray-600 mb-0.5">Total</p>
                                    <p className="text-md font-black text-[#f3cf7a]">{order.totalAmount} Br</p>
                                  </div>
                                </div>

                                <div className="p-6 flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight: "250px" }}>
                                  <div className="space-y-4">
                                    {order.items.map((item: any, i: number) => (
                                      <div key={i} className="flex justify-between items-start gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                                        <div>
                                          <p className="font-bold text-gray-200 text-sm leading-tight">{item.quantity}x {item.name}</p>
                                          {item.notes && <p className="text-[10px] text-orange-400 font-bold mt-1 bg-orange-500/10 px-2 py-0.5 rounded-lg w-fit border border-orange-500/20 shadow-sm">Note: {item.notes}</p>}
                                        </div>
                                        <p className="text-xs font-black text-white">{item.price * item.quantity} Br</p>
                                      </div>
                                    ))}
                                  </div>

                                  {order.notes && order.notes !== "Room Service App Order" && (
                                    <div className="mt-5 bg-[#1a1c1b] border border-white/5 p-4 rounded-xl flex items-start gap-3 text-gray-400">
                                      <MessageSquare size={14} className="mt-0.5 shrink-0 text-gray-500" />
                                      <p className="text-xs italic">"{order.notes}"</p>
                                    </div>
                                  )}
                                </div>

                                <div className="p-4 bg-[#0f1110] border-t border-white/5 grid grid-cols-2 gap-3 shrink-0">
                                  <button onClick={() => handleRoomOrderAction(order._id, 'deny')}
                                    className="flex items-center justify-center gap-2 bg-[#151716] hover:bg-red-950/30 text-gray-500 hover:text-red-400 border border-transparent hover:border-red-900/40 rounded-2xl py-3.5 font-bold text-[10px] uppercase tracking-widest transition-all">
                                    <XCircle size={16} /> Deny
                                  </button>
                                  <button onClick={() => handleRoomOrderAction(order._id, 'approve')}
                                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600/20 to-emerald-500/20 hover:from-emerald-600/40 hover:to-emerald-500/40 text-emerald-400 border border-emerald-500/30 rounded-2xl py-3.5 font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg hover:shadow-emerald-500/10">
                                    <CheckCircle2 size={16} /> Approve
                                  </button>
                                </div>
                              </div>
                            ))}
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
                {selectedRequest.status === "check_in" || selectedRequest.status === "CHECKIN_APPROVED" ? (
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
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className={`flex-1 p-3 rounded-xl border text-center text-[10px] font-black uppercase tracking-widest ${STATUS_STYLES[selectedRequest.status]}`}>
                      {["CHECKED_OUT", "CHECKOUT_APPROVED", "check_out"].includes(selectedRequest.status)
                        ? "CHECKED OUT - Guest has departed"
                        : "DENIED - Request rejected"}
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
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Room Service Menu</label>
                      <select value={roomForm.roomServiceMenuTier} onChange={e => setRoomForm({ ...roomForm, roomServiceMenuTier: e.target.value })}
                        className="w-full bg-[#0f1110] border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-[#d4af37] outline-none focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 transition-all font-inter">
                        <option value="standard">Standard Menu</option>
                        <option value="vip1">VIP 1 Menu</option>
                        <option value="vip2">VIP 2 Menu</option>
                      </select>
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
