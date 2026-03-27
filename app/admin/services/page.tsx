"use client"

import { useState, useEffect, useCallback } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { RefreshCw } from "lucide-react"

interface Service {
  _id: string
  name: string
  description?: string
  category: string
  price: number
  unit?: string
  isAvailable: boolean
  icon?: string
}

const ICONS = ["🛎️", "🧹", "👕", "🚗", "💆", "🍽️", "🌿", "🛁", "🔧", "📦", "🍳", "☕", "🎯", "🏊", "🎾", "🧺", "🛒", "🧴"]
const DEFAULT_CATEGORIES = ["Housekeeping", "Laundry", "Transportation", "Wellness", "Dining", "Maintenance", "Business", "Other"]

const emptyForm = {
  name: "", description: "", category: "", price: "", unit: "per request",
  isAvailable: true, icon: "🛎️"
}

export default function AdminServicesPage() {
  const { token } = useAuth()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })
  const [formLoading, setFormLoading] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/services", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setServices(await res.json())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => { if (token) fetchServices() }, [token, fetchServices])

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
        fetchServices()
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to save", type: "error" })
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
      if (res.ok) { fetchServices(); notify({ title: "Deleted", message: `"${service.name}" removed.`, type: "success" }) }
    } catch { notify({ title: "Error", message: "Failed to delete", type: "error" }) }
  }

  const handleToggleAvailability = async (service: Service) => {
    try {
      const res = await fetch(`/api/admin/services/${service._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...service, isAvailable: !service.isAvailable }),
      })
      if (res.ok) fetchServices()
    } catch { /* silent */ }
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setFormData({ name: service.name, description: service.description || "", category: service.category, price: service.price.toString(), unit: service.unit || "per request", isAvailable: service.isAvailable, icon: service.icon || "🛎️" })
    setShowForm(true)
  }

  const resetForm = () => {
    setEditingService(null)
    setFormData({ ...emptyForm })
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

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sidebar */}
            <div className="lg:col-span-3 flex flex-col gap-4 lg:sticky lg:top-4">
              <div className="bg-[#8B4513] rounded-2xl p-6 shadow-xl shadow-[#8B4513]/20 text-white relative overflow-hidden">
                <div className="relative z-10">
                  <h1 className="text-2xl font-black mb-1 tracking-tight">Services 🛎️</h1>
                  <p className="opacity-70 text-xs font-bold uppercase tracking-widest mb-5">{services.length} services registered</p>
                  <button onClick={() => { resetForm(); setShowForm(true) }}
                    className="w-full bg-white text-[#8B4513] px-4 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2 active:scale-95">
                    ➕ Add New Service
                  </button>
                  <button onClick={fetchServices} className="mt-2 w-full bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                    <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} /> Refresh
                  </button>
                </div>
                <div className="absolute -bottom-4 -right-4 text-8xl opacity-10 transform -rotate-12">🛎️</div>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">🔍 Filter</h2>
                <input type="text" placeholder="Search services..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
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

              {/* Stats */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">📊 Overview</h2>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Total Services</span>
                    <span className="font-black text-gray-900">{services.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Available</span>
                    <span className="font-black text-green-600">{services.filter(s => s.isAvailable).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Unavailable</span>
                    <span className="font-black text-red-500">{services.filter(s => !s.isAvailable).length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-medium">Categories</span>
                    <span className="font-black text-gray-900">{new Set(services.map(s => s.category)).size}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Grid */}
            <div className="lg:col-span-9">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 min-h-[600px]">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Service Management</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-0.5">Manage hotel services and amenities</p>
                  </div>
                  <span className="bg-[#8B4513]/5 text-[#8B4513] px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-[#8B4513]/10">
                    {filtered.length} shown
                  </span>
                </div>

                {loading ? (
                  <div className="flex flex-col items-center justify-center py-32">
                    <RefreshCw className="w-10 h-10 animate-spin text-gray-300 mb-4" />
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Loading services…</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-center">
                    <div className="text-6xl mb-4 opacity-20">🛎️</div>
                    <h3 className="text-xl font-bold text-gray-400">No services found</h3>
                    <p className="text-gray-400 text-sm mt-1">Click "Add New Service" to get started.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map(service => (
                      <div key={service._id} className={`rounded-2xl p-5 border flex flex-col gap-3 transition-all hover:shadow-md ${service.isAvailable ? "bg-gray-50 border-gray-100" : "bg-gray-50/50 border-dashed border-gray-200 opacity-60"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm border border-gray-100 shrink-0">
                              {service.icon || "🛎️"}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-black text-gray-900 text-sm leading-tight truncate">{service.name}</h3>
                              <span className="text-[10px] font-bold text-[#8B4513] bg-[#8B4513]/5 px-2 py-0.5 rounded-full capitalize">{service.category}</span>
                            </div>
                          </div>
                        </div>

                        {service.description && (
                          <p className="text-xs text-gray-500 leading-relaxed">{service.description}</p>
                        )}

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xl font-black text-gray-900">{service.price.toLocaleString()}</span>
                            <span className="text-[10px] text-gray-400 font-bold ml-1">Br / {service.unit}</span>
                          </div>
                          <button onClick={() => handleToggleAvailability(service)}
                            className={`text-[10px] font-black px-3 py-1.5 rounded-full border transition-all ${service.isAvailable ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"}`}>
                            {service.isAvailable ? "✓ Available" : "✕ Unavailable"}
                          </button>
                        </div>

                        <div className="flex gap-2 pt-1 border-t border-gray-100">
                          <button onClick={() => handleEdit(service)}
                            className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-[#8B4513]/30 hover:text-[#8B4513] transition-all active:scale-95">
                            ✏️ Edit
                          </button>
                          <button onClick={() => handleDelete(service)}
                            className="w-9 h-9 bg-white border border-gray-200 text-red-400 rounded-xl flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-all active:scale-95 text-sm">
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Create / Edit Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full relative overflow-hidden flex flex-col max-h-[90vh]">
              <button onClick={resetForm} className="absolute top-5 right-5 w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center font-bold text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all z-10">✕</button>
              <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-14">
                <h2 className="text-xl font-black text-gray-900 mb-6">{editingService ? "Edit Service" : "New Service"}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Icon Picker */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Icon</label>
                    <div className="flex flex-wrap gap-2">
                      {ICONS.map(icon => (
                        <button key={icon} type="button" onClick={() => setFormData({ ...formData, icon })}
                          className={`w-10 h-10 rounded-xl text-lg border-2 transition-all ${formData.icon === icon ? "border-[#8B4513] bg-[#8B4513]/5 scale-110 shadow-md" : "border-gray-100 bg-gray-50 hover:border-gray-300"}`}>
                          {icon}
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

                  <div className="flex gap-3 pt-2">
                    {editingService && (
                      <button type="button" onClick={resetForm} className="flex-1 py-3.5 text-gray-400 font-bold hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                    )}
                    <button type="submit" disabled={formLoading} className="flex-[2] bg-[#8B4513] text-white py-3.5 rounded-xl font-black text-sm shadow-xl shadow-[#8B4513]/20 hover:scale-[1.01] transition-transform active:scale-95 disabled:opacity-50">
                      {formLoading ? "Saving…" : editingService ? "Update Service" : "Create Service"}
                    </button>
                  </div>
                </form>
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
