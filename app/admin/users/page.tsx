"use client"
import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { AnimatedButton } from "@/components/animated-button"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import {
  Users, ShieldCheck, ChefHat, Monitor, Package, ConciergeBell, Coffee,
  MapPin, LogIn, LogOut, Eye, EyeOff, Pencil, Trash2, Plus, Loader2,
  UtensilsCrossed, Check, RefreshCw, X, Beer
} from "lucide-react"

interface User {
  _id: string
  name: string
  email: string
  password: string
  plainPassword?: string
  role: "admin" | "chef" | "bar" | "cashier" | "display" | "store_keeper" | "reception" | "custom"
  permissions?: string[]
  isActive: boolean
  floorId?: string
  assignedCategories?: string[]
  lastLoginAt?: string
  lastLogoutAt?: string
}

interface Floor {
  _id: string
  floorNumber: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "cashier" as "admin" | "chef" | "bar" | "cashier" | "display" | "store_keeper" | "reception" | "custom",
    floorId: "",
    assignedCategories: [] as string[],
    permissions: [] as string[],
  })
  const [floors, setFloors] = useState<Floor[]>([])
  const [categories, setCategories] = useState<{ _id: string, name: string }[]>([])

  const { token, user: currentUser, hasPermission } = useAuth()
  const { t } = useLanguage()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({})

  const togglePasswordVisibility = (userId: string) => {
    setRevealedPasswords(prev => ({ ...prev, [userId]: !prev[userId] }))
  }

  useEffect(() => {
    if (token) {
      fetchUsers()
      fetchFloors()
      fetchCategories()
    }
  }, [token])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories?type=menu", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setCategories(await response.json())
      }
    } catch (err) {
      console.error("Failed to fetch categories")
    }
  }

  const fetchFloors = async () => {
    try {
      const response = await fetch("/api/floors", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        setFloors(await response.json())
      }
    } catch (err) {
      console.error("Failed to fetch floors")
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (err) {
      console.error("Failed to fetch users")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    const url = editingUser ? `/api/users/${editingUser._id}` : "/api/users"
    const method = editingUser ? "PUT" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        if (!editingUser) {
          notify({
            title: "User Created Successfully!",
            message: `Email: ${data.credentials.email}\nPassword: ${data.credentials.password}`,
            type: "success"
          })
        } else {
          notify({
            title: "User Updated",
            message: "User information has been updated successfully.",
            type: "success"
          })
        }
        resetForm()
        fetchUsers()
      } else {
        const errorData = await response.json()
        notify({
          title: "Save Failed",
          message: errorData.message || "Failed to save user",
          type: "error"
        })
      }
    } catch (err) {
      console.error("Failed to save user")
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (userToDelete: User) => {
    const confirmed = await confirm({
      title: "Delete User",
      message: `Are you sure you want to delete "${userToDelete.name}"?\n\nThis action cannot be undone.`,
      type: "danger",
      confirmText: "Delete User",
      cancelText: "Cancel"
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/users/${userToDelete._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        fetchUsers()
      }
    } catch (err) {
      console.error("Failed to delete user")
    }
  }

  const handleToggleStatus = async (userToToggle: User) => {
    if (userToToggle._id === currentUser?.id) {
      notify({
        title: "Action Denied",
        message: "You cannot deactivate your own account.",
        type: "error"
      })
      return
    }

    try {
      const response = await fetch(`/api/users/${userToToggle._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: userToToggle.name,
          email: userToToggle.email,
          isActive: !userToToggle.isActive
        }),
      })

      if (response.ok) {
        notify({
          title: "Status Updated",
          message: `${userToToggle.name} is now ${!userToToggle.isActive ? 'Active' : 'Deactivated'}.`,
          type: "success"
        })
        fetchUsers()
      } else {
        const errorData = await response.json()
        notify({
          title: "Update Failed",
          message: errorData.message || "Failed to update status",
          type: "error"
        })
      }
    } catch (err) {
      console.error("Failed to toggle status")
    }
  }

  const generatePassword = () => {
    setFormData({ ...formData, password: Math.random().toString(36).slice(-8) })
  }

  const handleEdit = (userToEdit: User) => {
    setEditingUser(userToEdit)
    setFormData({
      name: userToEdit.name,
      email: userToEdit.email,
      password: "",
      role: userToEdit.role,
      floorId: userToEdit.floorId || "",
      assignedCategories: userToEdit.assignedCategories || [],
      permissions: userToEdit.permissions || [],
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingUser(null)
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "cashier",
      floorId: "",
      assignedCategories: [],
      permissions: [],
    })
    setShowForm(false)
  }

  return (
    <ProtectedRoute requiredRoles={["admin"]} requiredPermissions={["users:view"]}>
      <div className="min-h-screen bg-[#0f1110] p-6 text-white selection:bg-[#c5a059] selection:text-[#0f1110]">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Control Sidebar */}
            <div className="lg:col-span-3 flex flex-col gap-4 lg:sticky lg:top-4">
              <div className="bg-[#151716] rounded-xl p-6 md:p-8 shadow-2xl border border-white/10 text-white relative overflow-hidden group">
                <div className="relative z-10">
                  <h1 className="text-2xl md:text-3xl font-playfair italic text-[#f3cf7a] mb-2 flex items-center gap-3"><Users size={24} /> {t("adminUsers.title")}</h1>
                  <p className="text-gray-400 text-[10px] uppercase font-light tracking-widest mb-6">{t("adminUsers.totalActiveStaff")}: {users.length}</p>
                  {hasPermission("users:create") && (
                    <button
                      onClick={() => { resetForm(); setShowForm(true); }}
                      className="w-full bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] px-6 py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-2 transform active:scale-95"
                    >
                      <Plus size={16} /> {t("adminUsers.addNewMember")}
                    </button>
                  )}
                </div>
                <div className="absolute -bottom-4 -right-4 opacity-5 transform group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500">
                  <Users size={96} />
                </div>
              </div>

              <div className="hidden lg:block bg-[#1a1c1b] rounded-xl p-6 border border-white/10 shadow-xl relative overflow-hidden group">
                <div className="relative z-10">
                  <h2 className="text-xl font-playfair italic text-[#f3cf7a] mb-2">{t("adminUsers.permissionsCard")}</h2>
                  <p className="text-gray-400 font-light text-[10px] uppercase tracking-widest">{t("adminUsers.permissionsDesc")}</p>
                </div>
                <div className="absolute -bottom-6 -right-6 opacity-5 transform group-hover:-rotate-12 transition-transform duration-500">
                  <ShieldCheck size={112} />
                </div>
              </div>
            </div>

            <div className="lg:col-span-9">
              <div className="bg-[#151716] rounded-xl p-6 shadow-2xl border border-white/10 min-h-[600px]">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 md:py-32">
                    <RefreshCw size={48} className="animate-spin text-gray-600 mb-4" />
                    <p className="text-gray-500 font-light uppercase tracking-widest text-[10px]">{t("adminUsers.assemblingTeam")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                    {users.map((u) => {
                      const isMe = u._id === currentUser?.id
                      const badge = u.role === "admin"
                        ? { color: "bg-[#f3cf7a]/20 text-[#f3cf7a] border border-[#f3cf7a]/30", label: "Admin" }
                        : u.role === "chef"
                          ? { color: "bg-orange-500/20 text-orange-400 border border-orange-500/30", label: "Chef" }
                        : u.role === "bar"
                          ? { color: "bg-blue-500/20 text-blue-400 border border-blue-500/30", label: "Bar" }
                          : u.role === "display"
                            ? { color: "bg-purple-500/20 text-purple-400 border border-purple-500/30", label: "Display" }
                            : u.role === "store_keeper" ? { color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30", label: "Store Keeper" }
                            : u.role === "reception" ? { color: "bg-blue-500/20 text-blue-400 border border-blue-500/30", label: "Reception" }
                            : u.role === "custom" ? { color: "bg-pink-500/20 text-pink-400 border border-pink-500/30", label: "Custom" }
                            : { color: "bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/30", label: "Cashier" }

                      return (
                        <div key={u._id} className={`bg-[#0f1110] rounded-2xl p-5 border transition-all flex flex-col relative group ${!u.isActive ? 'opacity-50 grayscale border-dashed border-white/5' : 'border-white/10 hover:border-[#d4af37]/30 hover:shadow-[0_4px_20px_rgba(212,175,55,0.1)]'}`}>
                          {isMe && <div className="absolute top-4 right-4 text-[9px] font-black text-[#151716] bg-[#f3cf7a] border border-[#d4af37] px-3 py-1 rounded-full uppercase tracking-widest z-10 shadow-sm">You</div>}
                          {!isMe && (
                            <div className={`absolute top-4 right-4 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest z-10 shadow-sm ${u.isActive ? 'bg-[#1a2e20] text-[#4ade80] border border-[#4ade80]/30' : 'bg-[#1a0f0f] text-red-500 border border-red-500/30'}`}>
                              {u.isActive ? 'Active' : 'Deactivated'}
                            </div>
                          )}
                          <div className="w-14 h-14 md:w-16 md:h-16 bg-[#151716] border border-white/5 rounded-2xl flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform text-[#d4af37]">
                            {u.role === "admin"        ? <ShieldCheck size={28} /> :
                             u.role === "chef"         ? <ChefHat size={28} /> :
                             u.role === "bar"          ? <Beer size={28} /> :
                             u.role === "display"      ? <Monitor size={28} /> :
                             u.role === "store_keeper" ? <Package size={28} /> :
                             u.role === "reception"    ? <ConciergeBell size={28} /> :
                             u.role === "custom"       ? <Pencil size={28} /> :
                                                         <Coffee size={28} />}
                          </div>
                          {(u.role === "chef" || u.role === "bar") && u.assignedCategories && u.assignedCategories.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-1.5 pt-1">
                              {u.assignedCategories.map(cat => (
                                <span key={cat} className="text-[9px] font-bold uppercase tracking-widest text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-lg border border-orange-500/20 shadow-sm flex items-center gap-1">
                                  <UtensilsCrossed size={10} /> {cat}
                                </span>
                              ))}
                            </div>
                          )}
                          {(u.role === "cashier" || u.role === "display") && u.floorId && (
                            <div className="mb-2">
                              <span className="text-[9px] font-bold uppercase tracking-widest text-[#f3cf7a] bg-[#d4af37]/10 border border-[#d4af37]/20 px-2 py-1 rounded flex items-center gap-1">
                                <MapPin size={10} /> {floors.find(b => b._id === u.floorId)?.floorNumber ? `Floor #${floors.find(b => b._id === u.floorId)?.floorNumber}` : "Assigned Floor"}
                              </span>
                            </div>
                          )}
                          <h3 className={`font-playfair italic text-xl text-white mb-0.5 ${!u.isActive ? 'line-through opacity-70' : ''}`}>{u.name}</h3>
                          <p className="text-[10px] text-gray-400 mb-2 font-light uppercase tracking-widest truncate">{u.email}</p>

                          {/* Login / Logout times */}
                          <div className="mb-3 space-y-1">
                            {u.lastLoginAt && (
                              <p className="text-[9px] font-bold text-emerald-400 bg-emerald-900/20 border border-emerald-500/20 px-2 py-1 rounded-lg flex items-center gap-1.5">
                                <LogIn size={10} /> In: {new Date(u.lastLoginAt).toLocaleString()}
                              </p>
                            )}
                            {u.lastLogoutAt && (
                              <p className="text-[9px] font-bold text-red-400 bg-red-900/20 border border-red-500/20 px-2 py-1 rounded-lg flex items-center gap-1.5">
                                <LogOut size={10} /> Out: {new Date(u.lastLogoutAt).toLocaleString()}
                              </p>
                            )}
                          </div>

                          <div className="mb-4 flex items-center gap-2">
                            <div className="bg-[#151716] border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between flex-1 min-h-[40px]">
                              <span className={`text-[10px] font-mono tracking-widest ${revealedPasswords[u._id] ? 'text-[#f3cf7a]' : 'text-gray-500'}`}>
                                {revealedPasswords[u._id] ? (u.plainPassword || "********") : "••••••••"}
                                {!u.plainPassword && revealedPasswords[u._id] && <span className="text-[8px] text-gray-500 uppercase tracking-widest ml-1">(Reset to View)</span>}
                              </span>
                              <button
                                onClick={() => togglePasswordVisibility(u._id)}
                                className="text-gray-500 hover:text-[#f3cf7a] transition-colors p-1"
                              >
                                {revealedPasswords[u._id] ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-auto bg-[#1a1c1b]/60 backdrop-blur-sm rounded-2xl p-3 border border-white/5">
                            <span className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest ${badge.color}`}>
                              {badge.label}
                            </span>
                            <div className="flex gap-2">
                              {hasPermission("users:update") && !isMe && (
                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  title={u.isActive ? "Deactivate User" : "Activate User"}
                                  className={`w-8 h-8 md:w-9 md:h-9 bg-[#0f1110] border border-white/10 rounded-xl flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all ${u.isActive ? 'text-gray-500 hover:text-red-500 hover:border-red-500/30' : 'text-emerald-500 hover:text-[#4ade80] hover:border-[#4ade80]/30'}`}
                                >
                                  {u.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              )}
                              {hasPermission("users:update") && (
                                <button onClick={() => handleEdit(u)} className="w-8 h-8 md:w-9 md:h-9 bg-[#0f1110] border border-white/10 rounded-xl flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all hover:border-[#d4af37]/30 hover:text-[#f3cf7a]"><Pencil size={14} /></button>
                              )}
                              {hasPermission("users:delete") && !isMe && (
                                <button onClick={() => handleDelete(u)} className="w-8 h-8 md:w-9 md:h-9 bg-[#0f1110] border border-white/10 rounded-xl flex items-center justify-center shadow-sm hover:bg-red-950/50 hover:border-red-500/50 hover:text-red-500 hover:scale-110 active:scale-95 transition-all"><Trash2 size={14} /></button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create/Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-[#151716] border border-white/10 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl max-w-md w-full relative overflow-hidden flex flex-col max-h-[90vh]">
              <button
                onClick={resetForm}
                className="absolute top-6 right-6 w-10 h-10 bg-[#0f1110] border border-white/10 rounded-2xl flex items-center justify-center text-gray-500 hover:bg-red-950/50 hover:text-red-500 hover:border-red-900 transition-all z-10"
              ><X size={16} /></button>

              <div className="flex-1 overflow-y-auto p-6 md:p-10 pt-16 md:pt-20 scrollbar-hide">
                <h2 className="text-2xl font-playfair italic text-[#f3cf7a] mb-6">
                  {editingUser ? t("adminUsers.editProfile") : t("adminUsers.newMember")}
                </h2>
                <form onSubmit={handleCreateOrUpdate} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-light uppercase tracking-widest text-gray-400 ml-2">{t("adminUsers.displayName")}</label>
                    <input
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-[#0f1110] border border-white/10 text-white rounded-2xl p-4 outline-none focus:border-[#d4af37] focus:ring-0 transition-all font-light"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-light uppercase tracking-widest text-gray-400 ml-2">{t("adminUsers.emailAddress")}</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#0f1110] border border-white/10 text-white rounded-2xl p-4 outline-none focus:border-[#d4af37] focus:ring-0 transition-all font-light"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-light uppercase tracking-widest text-gray-400 ml-2">{t("adminUsers.accessLevel")}</label>
                    <div className="flex flex-wrap gap-2">
                      {["cashier", "chef", "bar", "admin", "display", "store_keeper", "reception", "custom"].map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setFormData({ ...formData, role: r as any })}
                          className={`flex-1 min-w-[100px] py-3 rounded-xl font-bold text-[9px] uppercase tracking-widest transition-all border ${formData.role === r ? "bg-[#1a1c1b] text-[#f3cf7a] border-[#d4af37]/30 shadow-[0_4px_15px_rgba(212,175,55,0.15)]" : "bg-[#0f1110] text-gray-500 border-white/5 hover:bg-[#1a1c1b]"}`}
                        >
                          {r === "display" ? "Display" : r === "reception" ? "Reception" : r === "custom" ? "Custom" : t(`adminUsers.${r}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(formData.role === "cashier" || formData.role === "display") && (
                    <div className="space-y-2 animate-fade-in">
                      <label className="text-[10px] font-light uppercase tracking-widest text-gray-400 ml-2">Assigned Floor</label>
                      <select
                        value={formData.floorId}
                        onChange={e => setFormData({ ...formData, floorId: e.target.value })}
                        className="w-full bg-[#0f1110] border border-white/10 text-white rounded-2xl p-4 outline-none focus:border-[#d4af37] focus:ring-0 transition-all font-light appearance-none"
                      >
                        <option value="">All Floors (Global)</option>
                        {floors.map(floor => (
                          <option key={floor._id} value={floor._id}>Floor #{floor.floorNumber}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {formData.role === "custom" && (
                    <div className="space-y-4 animate-fade-in bg-[#0f1110] p-6 rounded-[2.5rem] border border-[#d4af37]/20">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-[#f3cf7a]">Granular Privileges</label>
                      </div>
                      
                      <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar space-y-4">
                        {[
                          { category: "Overview", items: [{ id: "overview:view", label: "View Dashboard" }] },
                          { category: "Orders", items: [ { id: "orders:view", label: "View Orders" }, { id: "orders:create", label: "Create Orders" }, { id: "orders:update", label: "Update Orders" }, { id: "orders:delete", label: "Delete Orders" } ] },
                          { category: "Users", items: [ { id: "users:view", label: "View Users" }, { id: "users:create", label: "Create Users" }, { id: "users:update", label: "Update Users" }, { id: "users:delete", label: "Delete Users" } ] },
                          { category: "Store", items: [ { id: "store:view", label: "View Store" }, { id: "store:create", label: "Add Items" }, { id: "store:update", label: "Edit Items" }, { id: "store:delete", label: "Delete Items" }, { id: "store:transfer", label: "Transfer Stock" } ] },
                          { category: "Stock", items: [ { id: "stock:view", label: "View Stock" }, { id: "stock:create", label: "Add Stock" }, { id: "stock:update", label: "Update Stock" }, { id: "stock:delete", label: "Delete Stock" } ] },
                          { category: "Reports", items: [
                            { id: "reports:financial_summary", label: "Financial Summary" },
                            { id: "reports:order_history", label: "Order History" },
                            { id: "reports:inventory_investment", label: "Inventory Investment" },
                            { id: "reports:store_investment", label: "Store Investment" },
                            { id: "reports:menu_item_sales", label: "Menu Item Sales" },
                            { id: "reports:cashier_insights", label: "Cashier Insights" }
                          ] },
                          { category: "Services", items: [ { id: "services:view", label: "View Services" }, { id: "services:create", label: "Add Services" }, { id: "services:update", label: "Edit Services" }, { id: "services:delete", label: "Delete Services" } ] },
                          { category: "Settings", items: [ { id: "settings:view", label: "View Settings" }, { id: "settings:update", label: "Update Settings" } ] },
                          { category: "Interfaces", items: [ { id: "cashier:access", label: "Cashier POS" }, { id: "chef:access", label: "Chef Board" }, { id: "bar:access", label: "Bar Board" }, { id: "reception:access", label: "Reception" }, { id: "display:access", label: "Display Board" } ] }
                        ].map((group) => (
                          <div key={group.category} className="bg-[#151716] p-4 rounded-2xl border border-white/5 space-y-3">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#f3cf7a]/70 flex items-center justify-between">
                              {group.category}
                              <button 
                                type="button"
                                onClick={() => {
                                  let newPerms = [...formData.permissions];
                                  const allGroupIds = group.items.map(i => i.id);
                                  const hasAll = allGroupIds.every(id => newPerms.includes(id));
                                  if (hasAll) {
                                    newPerms = newPerms.filter(p => !allGroupIds.includes(p));
                                  } else {
                                    const missing = allGroupIds.filter(id => !newPerms.includes(id));
                                    newPerms = [...newPerms, ...missing];
                                  }
                                  setFormData({ ...formData, permissions: newPerms });
                                }}
                                className="text-[8px] px-2 py-1 rounded bg-[#1a1c1b] hover:bg-[#d4af37]/20 text-[#f3cf7a] transition-colors"
                              >
                                Toggle All
                              </button>
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {group.items.map(perm => {
                                const isSelected = formData.permissions.includes(perm.id)
                                return (
                                  <button
                                    key={perm.id}
                                    type="button"
                                    onClick={() => {
                                      const perms = [...formData.permissions]
                                      if (isSelected) {
                                        setFormData({ ...formData, permissions: perms.filter(p => p !== perm.id) })
                                      } else {
                                        setFormData({ ...formData, permissions: [...perms, perm.id] })
                                      }
                                    }}
                                    className={`text-left p-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border ${isSelected
                                      ? "bg-[#1a1c1b] text-[#f3cf7a] border-[#d4af37]/30 shadow-[0_4px_15px_rgba(212,175,55,0.15)]"
                                      : "bg-[#0f1110] text-gray-500 border-white/5 hover:border-white/10 hover:text-gray-300 shadow-sm"
                                      }`}
                                  >
                                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors shrink-0 ${isSelected ? "bg-[#d4af37]/20 text-[#f3cf7a]" : "bg-[#151716] border border-white/5 text-gray-600"}`}>
                                      {isSelected && <Check size={10} />}
                                    </div>
                                    <span className="truncate whitespace-normal leading-snug">{perm.label}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 relative">
                    <label className="text-[10px] font-light uppercase tracking-widest text-gray-400 ml-2">
                      {t("adminUsers.password")} <span className="text-gray-500 text-[8px]">{editingUser ? t("adminUsers.optional") : ""}</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required={!editingUser}
                        value={formData.password}
                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                        className="flex-1 bg-[#0f1110] border border-white/10 text-white rounded-2xl p-4 outline-none focus:border-[#d4af37] focus:ring-0 transition-all font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={generatePassword}
                        className="bg-[#1a1c1b] border border-white/10 text-gray-400 px-4 rounded-2xl font-bold text-[9px] uppercase hover:bg-[#151716] hover:text-white transition-colors"
                      >
                        {t("adminUsers.generate")}
                      </button>
                    </div>
                  </div>

                  {(formData.role === "chef" || formData.role === "bar") && (
                    <div className="space-y-3 animate-fade-in bg-[#0f1110] p-6 rounded-[2.5rem] border border-white/5">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-[#f3cf7a]">Kitchen Assignments</label>
                        <span className="text-[8px] font-bold text-[#f3cf7a] bg-[#d4af37]/10 px-2 py-0.5 rounded-full shadow-sm border border-[#d4af37]/20 uppercase">
                          {(Array.isArray(formData.assignedCategories) ? formData.assignedCategories.length : 0)} Selected
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto p-1 pr-2 custom-scrollbar">
                        {categories.map(category => {
                          const catName = category.name.trim().normalize("NFC")
                          const isSelected = Array.isArray(formData.assignedCategories) &&
                            formData.assignedCategories.some(c => c.trim().normalize("NFC") === catName)

                          return (
                            <button
                              key={category._id}
                              type="button"
                              onClick={() => {
                                const currentCats = Array.isArray(formData.assignedCategories) ? [...formData.assignedCategories] : []
                                const alreadySelected = currentCats.some(c => c.trim().normalize("NFC") === catName)

                                const newCats = alreadySelected
                                  ? currentCats.filter(c => c.trim().normalize("NFC") !== catName)
                                  : [...currentCats, category.name.trim().normalize("NFC")]

                                setFormData({ ...formData, assignedCategories: newCats })
                              }}
                              className={`text-left p-3 rounded-2xl text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-3 border ${isSelected
                                ? "bg-[#1a1c1b] text-[#f3cf7a] border-[#d4af37]/30 shadow-[0_4px_15px_rgba(212,175,55,0.15)]"
                                : "bg-[#151716] text-gray-500 border-white/5 hover:border-white/10 hover:text-gray-300 shadow-sm"
                                }`}
                            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${isSelected ? "bg-[#d4af37]/20 text-[#f3cf7a]" : "bg-[#0f1110] border border-white/5 text-gray-600"}`}>
                                {isSelected ? <Check size={12} /> : <UtensilsCrossed size={12} />}
                              </div>
                              <span className="truncate">{category.name}</span>
                            </button>
                          )
                        })}
                      </div>

                      {Array.isArray(formData.assignedCategories) && formData.assignedCategories.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-1">
                          {formData.assignedCategories.map(cat => (
                            <span key={cat} className="text-[8px] font-bold bg-[#1a1c1b] border border-[#d4af37]/20 text-[#f3cf7a] px-2 py-0.5 rounded-full uppercase tracking-widest">
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}

                      {categories.length === 0 && <p className="text-center text-gray-500 py-4 text-[9px] font-bold uppercase tracking-widest bg-[#151716] rounded-2xl border border-dashed border-white/10">No categories found</p>}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    {editingUser && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="flex-1 py-4 text-gray-500 font-bold uppercase tracking-widest text-[10px] hover:bg-[#0f1110] hover:text-white rounded-2xl transition-colors border border-white/5"
                      >
                        {t("common.cancel")}
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="flex-[2] bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] border border-[#f5db8b] py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.4)] hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50"
                    >
                      {formLoading ? <span className="flex items-center justify-center gap-2"><Loader2 size={14} className="animate-spin" /> {t("common.loading")}</span> : (editingUser ? t("adminUsers.updateProfile") : t("adminUsers.createAccount"))}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <ConfirmationCard
          isOpen={confirmationState.isOpen}
          onClose={closeConfirmation}
          onConfirm={confirmationState.onConfirm}
          title={confirmationState.options.title}
          message={confirmationState.options.message}
          type={confirmationState.options.type}
          confirmText={confirmationState.options.confirmText}
          cancelText={confirmationState.options.cancelText}
          icon={confirmationState.options.icon}
        />

        <NotificationCard
          isOpen={notificationState.isOpen}
          onClose={closeNotification}
          title={notificationState.options.title}
          message={notificationState.options.message}
          type={notificationState.options.type}
          autoClose={notificationState.options.autoClose}
          duration={notificationState.options.duration}
        />
      </div>
    </ProtectedRoute>
  )
}
