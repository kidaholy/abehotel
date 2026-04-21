"use client"

import { useState, useEffect, useRef } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { useSettings } from "@/context/settings-context"
import { Logo } from "@/components/logo"
import { compressImage, validateImageFile, formatFileSize, getBase64Size } from "@/lib/utils/image-utils"
import { Save, Upload, Link as LinkIcon, Info, CheckCircle2 } from "lucide-react"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"

interface AdminSettings {
  logo_url: string
  favicon_url: string
  app_name: string
  app_tagline: string
  vat_rate: string
  enable_cashier_printing: string
  enable_cashier_today_revenue: string
}

export default function AdminSettingsPage() {
  const { token } = useAuth()
  const { t } = useLanguage()
  const { settings, loading: settingsLoading, refreshSettings } = useSettings()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()
  const [formData, setFormData] = useState<AdminSettings>({
    logo_url: "",
    favicon_url: "",
    app_name: "Prime Addis",
    app_tagline: "Coffee Management",
    vat_rate: "0.08",
    enable_cashier_printing: "true",
    enable_cashier_today_revenue: "false"
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMethod, setUploadMethod] = useState<"url" | "file">("url")
  const [settingsReady, setSettingsReady] = useState(false)

  // State Management Refs
  const isInitialized = useRef(false)

  // Table & Management State
  const [activeTab, setActiveTab] = useState("branding")
  const [floors, setFloors] = useState<any[]>([])
  const [tables, setTables] = useState<any[]>([])

  // Edit States
  const [editingFloor, setEditingFloor] = useState<any>(null)
  const [newFloor, setNewFloor] = useState({ floorNumber: "", order: 0 })

  const [editingTable, setEditingTable] = useState<any>(null)
  const [newTable, setNewTable] = useState({ tableNumber: "", capacity: "" })

  // Category Management State
  const [categories, setCategories] = useState<any[]>([])
  const [editingCategory, setEditingCategory] = useState<any>(null)
  const [newCategory, setNewCategory] = useState({ name: "", type: "menu" as "menu" | "stock" | "distribution", description: "" })
  const [categoryType, setCategoryType] = useState<"menu" | "stock" | "distribution">("menu")

  // Always keep formData in sync with settings from DB
  // Use a ref to track if user has made local changes
  const isDirty = useRef(false)

  const updateFormData = (updater: (prev: AdminSettings) => AdminSettings) => {
    isDirty.current = true
    setFormData(updater)
  }

  useEffect(() => {
    if (!settingsLoading && settings && !isDirty.current) {
      setFormData({
        logo_url: settings.logo_url || "",
        favicon_url: settings.favicon_url || "",
        app_name: settings.app_name || "Prime Addis",
        app_tagline: settings.app_tagline || "Coffee Management",
        vat_rate: settings.vat_rate || "0.08",
        enable_cashier_printing: settings.enable_cashier_printing || "true",
        enable_cashier_today_revenue: settings.enable_cashier_today_revenue || "false"
      })
      isInitialized.current = true
      setSettingsReady(true)
    }
  }, [settings, settingsLoading])

  useEffect(() => {
    if (activeTab === "tables") {
      fetchFloors()
      fetchTables()
    } else if (activeTab === "categories") {
      fetchCategories()
    }
  }, [activeTab, categoryType])

  const fetchFloors = async () => {
    try {
      const res = await fetch("/api/admin/floors", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setFloors(await res.json())
    } catch (err) { console.error("Failed to fetch floors", err) }
  }

  const fetchTables = async () => {
    try {
      const res = await fetch("/api/admin/tables", { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setTables(await res.json())
    } catch (err) { console.error("Failed to fetch tables", err) }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch(`/api/categories?type=${categoryType}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setCategories(await res.json())
    } catch (err) { console.error("Failed to fetch categories", err) }
  }

  // --- Floor Handlers ---
  const handleAddFloor = async () => {
    try {
      const url = "/api/admin/floors"
      const method = editingFloor ? "PUT" : "POST"
      const body = editingFloor ? { ...newFloor, id: editingFloor._id } : newFloor

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        setNewFloor({ floorNumber: "", order: 0 })
        setEditingFloor(null)
        fetchFloors()
        notify({ title: "Success", message: `Floor ${editingFloor ? 'updated' : 'added'} successfully`, type: "success" })
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message, type: "error" })
      }
    } catch (err) { notify({ title: "Error", message: "Failed to save floor", type: "error" }) }
  }

  const handleDeleteFloor = async (id: string) => {
    if (!await confirm({ title: "Delete Floor", message: "Are you sure? Associated tables will become unassigned.", type: "warning", confirmText: "Delete", cancelText: "Cancel" })) return
    try {
      const res = await fetch(`/api/admin/floors?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        fetchFloors()
        fetchTables() // Refresh tables as their floor association might have changed (if backend handled it)
        notify({ title: "Success", message: "Floor deleted", type: "success" })
      }
    } catch (err) { notify({ title: "Error", message: "Failed to delete floor", type: "error" }) }
  }

  // --- Table Handlers ---
  const handleAddTable = async () => {
    try {
      const url = "/api/admin/tables"
      const method = editingTable ? "PUT" : "POST"
      const body = editingTable ? { ...newTable, id: editingTable._id } : newTable

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      })
      if (res.ok) {
        setNewTable({ tableNumber: "", capacity: "" })
        setEditingTable(null)
        fetchTables()
        notify({ title: "Success", message: `Table ${editingTable ? 'updated' : 'added'} successfully`, type: "success" })
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message, type: "error" })
      }
    } catch (err) { notify({ title: "Error", message: "Failed to save table", type: "error" }) }
  }

  const handleEditTable = (table: any) => {
    setEditingTable(table)
    setNewTable({
      tableNumber: table.tableNumber,
      capacity: table.capacity || ""
    })
  }

  const handleCancelEditTable = () => {
    setEditingTable(null)
    setNewTable({ tableNumber: "", capacity: "" })
  }

  const handleDeleteTable = async (id: string) => {
    if (!await confirm({ title: "Delete Table", message: "Are you sure? This cannot be undone.", type: "warning", confirmText: "Delete", cancelText: "Cancel" })) return
    try {
      const res = await fetch(`/api/admin/tables?id=${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        fetchTables()
        notify({ title: "Success", message: "Table deleted", type: "success" })
      }
    } catch (err) { notify({ title: "Error", message: "Failed to delete table", type: "error" }) }
  }

  // --- Category Handlers ---
  const handleSaveCategory = async () => {
    if (!newCategory.name) return
    try {
      const url = editingCategory ? `/api/categories/${editingCategory._id}` : "/api/categories"
      const method = editingCategory ? "PUT" : "POST"
      const body = editingCategory ? { name: newCategory.name } : { ...newCategory, type: categoryType }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        setNewCategory({ name: "", type: "menu", description: "" })
        setEditingCategory(null)
        fetchCategories()
        notify({ title: "Success", message: `Category ${editingCategory ? 'updated' : 'added'} successfully`, type: "success" })
      } else {
        const err = await res.json()
        notify({ title: "Error", message: err.message || "Failed to save category", type: "error" })
      }
    } catch (err) { notify({ title: "Error", message: "Failed to save category", type: "error" }) }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!await confirm({ title: "Delete Category", message: "Are you sure? This may affect items using this category.", type: "warning", confirmText: "Delete", cancelText: "Cancel" })) return
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        fetchCategories()
        notify({ title: "Success", message: "Category deleted", type: "success" })
      }
    } catch (err) { notify({ title: "Error", message: "Failed to delete category", type: "error" }) }
  }




  const handleSaveSetting = async (key: string, value: string, type: string = "string", description?: string) => {
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ key, value, type, description }),
      })

      if (response.ok) {
        console.log(`✅ ${key} updated successfully`)
      } else {
        const error = await response.json()
        throw new Error(error.message || `Failed to update ${key}`)
      }
    } catch (error) {
      console.error(`Failed to update ${key}:`, error)
      throw error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settingsReady || settingsLoading) {
      notify({
        title: "Settings Not Ready",
        message: "Please wait for settings to fully load, then try saving again.",
        type: "error"
      })
      return
    }
    setSaving(true)

    try {
      const settingsToSave = [
        { key: "logo_url", value: formData.logo_url, type: "url", desc: t("adminSettings.applicationLogoUrl") },
        { key: "favicon_url", value: formData.favicon_url, type: "url", desc: "Browser Tab Icon (Favicon)" },
        { key: "app_name", value: formData.app_name, type: "string", desc: t("adminSettings.applicationName") },
        { key: "app_tagline", value: formData.app_tagline, type: "string", desc: t("adminSettings.applicationTagline") },
        { key: "vat_rate", value: formData.vat_rate, type: "number", desc: "Value Added Tax (VAT) rate" },
        { key: "enable_cashier_printing", value: formData.enable_cashier_printing, type: "boolean", desc: "Auto-print setting" },
        { key: "enable_cashier_today_revenue", value: formData.enable_cashier_today_revenue, type: "boolean", desc: "Allow cashiers to view today's total revenue" }
      ]

      for (const s of settingsToSave) {
        await handleSaveSetting(s.key, s.value, s.type, s.desc)
      }

      isDirty.current = false
      await refreshSettings()
      notify({
        title: "Settings Saved",
        message: "Your application settings have been updated successfully.",
        type: "success"
      })
    } catch (error: any) {
      console.error("Failed to save settings:", error)
      notify({
        title: "Save Failed",
        message: error.message || "Failed to save settings. Please try again.",
        type: "error"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      notify({
        title: "Invalid Image",
        message: validation.error || "Please select a valid image file",
        type: "error"
      })
      return
    }

    setUploading(true)
    try {
      // Compressed logo should be small for DB storage
      const compressedImage = await compressImage(file, {
        maxWidth: 200,
        maxHeight: 200,
        quality: 0.9,
        format: 'jpeg'
      })

      // Check final size
      const finalSize = getBase64Size(compressedImage)
      if (finalSize > 500 * 1024) { // 500KB limit for base64
        notify({
          title: "Image Too Large",
          message: `The compressed image is ${Math.round(finalSize / 1024)}KB, which exceeds the 500KB limit.`,
          type: "error"
        })
        setUploading(false)
        return
      }

      setFormData(prev => ({
        ...prev,
        logo_url: compressedImage,
        favicon_url: prev.favicon_url === "" ? compressedImage : prev.favicon_url
      }))
      isDirty.current = true
    } catch (error) {
      console.error('Failed to process image:', error)
      notify({
        title: "Image Processing Failed",
        message: "Failed to process the selected image. Please try again.",
        type: "error"
      })
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    const confirmed = await confirm({
      title: "Remove Logo",
      message: "Are you sure you want to remove the current logo?\n\nThis will reset it to the default image.",
      type: "warning",
      confirmText: "Remove Logo",
      cancelText: "Cancel"
    })

    if (confirmed) {
      setFormData(prev => ({ ...prev, logo_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&fit=crop&crop=center' }))
    }
  }

  return (
    <ProtectedRoute requiredRoles={["admin"]} requiredPermissions={["settings:view", "overview:view"]}>
      <div className="min-h-screen bg-[#0f1110] p-6 font-sans text-white">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Sidebar - Preview */}
            <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4 order-2 lg:order-1">
              <div className="bg-[#151716] rounded-2xl p-6 shadow-2xl border border-white/5 relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#d4af37]/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#f3cf7a]/5 rounded-full blur-3xl" />

                <h2 className="text-xl font-playfair italic font-bold text-white mb-6 relative z-10 flex items-center gap-2">
                  <span className="w-8 h-[1px] bg-[#d4af37]/50 block"></span>
                  {t("adminSettings.logoPreview")}
                </h2>

                <div className="space-y-8 relative z-10">
                  <div className="text-center bg-[#0f1110] p-6 rounded-2xl border border-white/5 shadow-inner">
                    <h3 className="text-[10px] font-bold text-[#d4af37] tracking-widest uppercase mb-4">{t("adminSettings.currentLogo")}</h3>
                    <div className="flex justify-center">
                      <Logo size="lg" showText={true} overrideUrl={formData.logo_url} />
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-6">
                    <h3 className="text-[10px] font-bold text-[#d4af37] tracking-widest uppercase mb-4">{t("adminSettings.previewInNavigation")}</h3>
                    <div className="bg-[#0f1110] rounded-2xl p-4 border border-white/5 shadow-inner">
                      <div className="flex items-center justify-between">
                        <Logo size="md" showText={true} overrideUrl={formData.logo_url} />
                        <div className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">{t("adminSettings.navigationBar")}</div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-6 text-center">
                    <h3 className="text-[10px] font-bold text-[#d4af37] tracking-widest uppercase mb-4">{t("adminSettings.browserTabPreview")}</h3>
                    <div className="bg-[#0f1110] rounded-xl p-3 flex items-center gap-3 border border-white/5 shadow-inner relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      
                      <div className="w-6 h-6 rounded bg-[#151716] p-0.5 shadow-sm border border-white/10 overflow-hidden shrink-0">
                        {formData.logo_url ? (
                          <img src={formData.logo_url} className="w-full h-full object-contain" alt={t("adminSettings.favicon")} />
                        ) : (
                          <div className="w-full h-full bg-[#d4af37]/20 flex items-center justify-center text-[10px] text-[#f3cf7a] font-playfair font-bold">
                            {formData.app_name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <div className="text-[10px] font-bold text-white truncate">
                          {formData.app_name} - {t("adminSettings.managementSystem")}
                        </div>
                        <div className="text-[8px] text-gray-500 truncate">prime-addis.vercel.app</div>
                      </div>
                      <div className="text-gray-500 hover:text-white transition-colors cursor-pointer text-xs shrink-0">✕</div>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-3 italic">{t("adminSettings.livePreviewBrowserTab")}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#1a1c1b] to-[#0f1110] rounded-2xl p-6 shadow-2xl border border-[#d4af37]/20 relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#d4af37]/5 rounded-full blur-2xl group-hover:bg-[#d4af37]/10 transition-colors duration-500" />
                
                <div className="relative z-10">
                  <h3 className="text-lg font-playfair italic font-bold text-[#f3cf7a] mb-5 flex items-center gap-3">
                    <span className="p-1.5 rounded-lg bg-[#d4af37]/10 border border-[#d4af37]/20">
                      <Info className="w-4 h-4 text-[#d4af37]" />
                    </span>
                    {t("adminSettings.logoTips.title")}
                  </h3>
                  <ul className="space-y-4">
                    {[
                      t("adminSettings.logoTips.tip1"),
                      t("adminSettings.logoTips.tip2"),
                      t("adminSettings.logoTips.tip3"),
                      t("adminSettings.logoTips.tip4"),
                      t("adminSettings.logoTips.tip5"),
                      t("adminSettings.logoTips.tip6")
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-3 group/item">
                        <CheckCircle2 className="w-4 h-4 text-[#d4af37] mt-0.5 shrink-0 opacity-70 group-hover/item:opacity-100 transition-opacity" />
                        <p className="text-xs font-medium text-gray-400 group-hover/item:text-white transition-colors leading-relaxed">
                          {tip}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="absolute -bottom-6 -right-6 text-8xl opacity-5 transform group-hover:rotate-12 transition-transform duration-700 pointer-events-none">🎨</div>
              </div>
            </div>

            <div className="lg:col-span-8 order-1 lg:order-2">
              <div className="bg-[#151716] rounded-2xl p-4 md:p-8 shadow-2xl border border-white/5 relative overflow-hidden">
                
                {/* Decorative gradients */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#d4af37]/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex gap-6 mb-10 border-b border-white/10 pb-0 overflow-x-auto custom-scrollbar relative z-10">
                  <button
                    onClick={() => setActiveTab("branding")}
                    className={`pb-4 text-xs md:text-sm font-bold tracking-widest uppercase transition-all whitespace-nowrap px-2 ${activeTab === "branding" ? "text-[#f3cf7a] border-b-2 border-[#d4af37]" : "text-gray-500 hover:text-gray-300"}`}
                  >
                    Branding
                  </button>
                  <button
                    onClick={() => setActiveTab("categories")}
                    className={`pb-4 text-xs md:text-sm font-bold tracking-widest uppercase transition-all whitespace-nowrap px-2 ${activeTab === "categories" ? "text-[#f3cf7a] border-b-2 border-[#d4af37]" : "text-gray-500 hover:text-gray-300"}`}
                  >
                    Categories
                  </button>
                  <button
                    onClick={() => setActiveTab("tables")}
                    className={`pb-4 text-xs md:text-sm font-bold tracking-widest uppercase transition-all whitespace-nowrap px-2 ${activeTab === "tables" ? "text-[#f3cf7a] border-b-2 border-[#d4af37]" : "text-gray-500 hover:text-gray-300"}`}
                  >
                    Tables
                  </button>
                </div>

                {activeTab === "branding" && (
                  <form onSubmit={handleSubmit} className="space-y-10 relative z-10">
                    <div className="space-y-6">
                      <label className="block text-xl font-playfair italic font-bold text-white mb-2">
                        {t("adminSettings.logoUpload")}
                      </label>

                      {/* Upload Method Toggle */}
                      <div className="flex gap-2 mb-6 bg-[#0f1110] border border-white/5 p-1 rounded-2xl w-fit">
                        <button
                          type="button"
                          onClick={() => setUploadMethod("url")}
                          className={`px-6 py-2.5 rounded-xl text-sm font-bold tracking-wider uppercase transition-all ${uploadMethod === "url"
                            ? "bg-[#b38822]/20 text-[#f3cf7a] shadow-sm border border-[#d4af37]/30"
                            : "text-gray-500 hover:text-gray-300"
                            }`}
                        >
                          🔗 {t("adminSettings.url")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadMethod("file")}
                          className={`px-6 py-2.5 rounded-xl text-sm font-bold tracking-wider uppercase transition-all ${uploadMethod === "file"
                            ? "bg-[#b38822]/20 text-[#f3cf7a] shadow-sm border border-[#d4af37]/30"
                            : "text-gray-500 hover:text-gray-300"
                            }`}
                        >
                          📁 {t("adminSettings.uploadFile")}
                        </button>
                      </div>

                      {uploadMethod === "url" ? (
                        /* URL Input */
                        <div className="space-y-3">
                          <input
                            type="url"
                            value={formData.logo_url.startsWith('data:') ? '' : formData.logo_url}
                            onChange={(e) => { isDirty.current = true; setFormData(prev => ({ ...prev, logo_url: e.target.value })) }}
                            className="w-full bg-[#0f1110] border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all font-medium text-white placeholder-gray-600"
                            placeholder={t("adminSettings.logoUrlPlaceholder")}
                          />
                          <p className="text-xs text-[#d4af37] font-bold flex items-center gap-2 ml-2">
                            <Info className="w-3 h-3" />
                            {t("adminSettings.urlFaviconHint")}
                          </p>
                        </div>
                      ) : (
                        /* File Upload */
                        <div className="space-y-3">
                          <div className="relative group overflow-hidden rounded-[2.5rem]">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              disabled={uploading}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            />
                            <div className="bg-[#0f1110] border-2 border-dashed border-white/10 rounded-[2.5rem] px-6 py-12 transition-all group-hover:bg-[#1a1c1b] group-hover:border-[#d4af37]/30 flex flex-col items-center gap-4 relative overflow-hidden shadow-inner">
                              {formData.logo_url ? (
                                <div className="relative z-10 flex flex-col items-center gap-4">
                                  <div className="w-32 h-32 rounded-3xl overflow-hidden border-2 border-[#d4af37]/30 shadow-2xl relative bg-[#151716] p-2">
                                    <img
                                      src={formData.logo_url}
                                      className="w-full h-full object-contain"
                                      alt="Logo Preview"
                                    />
                                    {uploading && (
                                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                                        <span className="animate-spin text-2xl text-[#d4af37]">⏳</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="bg-[#151716] px-4 py-2 rounded-full border border-white/10 shadow-sm">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#d4af37]">Click or drag to change logo</p>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="p-5 bg-[#151716] border border-white/5 rounded-full shadow-lg">
                                    <Upload className="w-8 h-8 text-[#d4af37]" />
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm font-black text-white uppercase tracking-widest mb-1">{t("adminSettings.uploadFile")}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">JPG, PNG OR WEBP • MAX 5MB</p>
                                  </div>
                                </>
                              )}

                              {uploading && !formData.logo_url && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                                  <span className="animate-spin text-3xl">⏳</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-[#d4af37] font-bold flex items-center gap-2 ml-2">
                            <Info className="w-3 h-3" />
                            {t("adminSettings.fileFaviconHint")}
                          </p>
                        </div>
                      )}

                      {/* Current Logo Display */}
                      {formData.logo_url && (
                        <div className="flex items-center gap-5 p-5 bg-[#0f1110] rounded-2xl border border-white/5 shadow-inner">
                          <div className="w-16 h-16 relative overflow-hidden rounded-xl border border-white/10 bg-[#151716] p-1 shadow-md">
                            <img
                              src={formData.logo_url}
                              alt={t("adminSettings.currentLogoAlt")}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white tracking-wide">
                              {formData.logo_url.startsWith('data:') ? t("adminSettings.uploadedImage") : t("adminSettings.urlImage")}
                            </p>
                            <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
                              {formData.logo_url.startsWith('data:')
                                ? t("adminSettings.compressed")
                                : formData.logo_url}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="bg-red-950/30 text-red-500 border border-red-500/20 hover:bg-red-900/50 p-3 rounded-xl transition-colors shrink-0"
                            title={t("adminSettings.removeLogo")}
                          >
                            🗑️
                          </button>
                        </div>
                      )}

                      {/* Favicon Upload Section */}
                      <div className="space-y-4 pt-8 mt-8 border-t border-white/5">
                        <label className="block text-sm font-bold text-gray-300 uppercase tracking-widest">
                          Browser Tab Icon (Favicon)
                        </label>
                        <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1 space-y-3">
                            <input
                              type="url"
                              value={formData.favicon_url.startsWith('data:') ? '' : formData.favicon_url}
                              onChange={(e) => updateFormData(prev => ({ ...prev, favicon_url: e.target.value }))}
                              className="w-full bg-[#0f1110] border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all font-medium text-white placeholder-gray-600"
                              placeholder="Favicon URL (e.g. https://.../favicon.png)"
                            />
                            <div className="relative group overflow-hidden rounded-2xl">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  const validation = validateImageFile(file)
                                  if (!validation.valid) {
                                    notify({ title: "Invalid Image", message: validation.error || "Error", type: "error" })
                                    return
                                  }
                                  setUploading(true)
                                  try {
                                    const compressed = await compressImage(file, { maxWidth: 64, maxHeight: 64, quality: 0.9, format: 'png' })
                                    updateFormData(prev => ({ ...prev, favicon_url: compressed }))
                                  } catch (err) {
                                    console.error(err)
                                  } finally {
                                    setUploading(false)
                                  }
                                }}
                                disabled={uploading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                              />
                              <div className="bg-[#0f1110] border border-dashed border-white/10 px-6 py-4 flex items-center justify-center gap-3 group-hover:bg-[#1a1c1b] transition-all h-full rounded-2xl shadow-inner">
                                <Upload className="w-5 h-5 text-[#d4af37]" />
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Upload Favicon (64x64 PNG)</span>
                              </div>
                            </div>
                          </div>

                          {formData.favicon_url && (
                            <div className="w-full md:w-32 md:h-[116px] bg-[#0f1110] rounded-2xl border border-white/10 flex items-center justify-center relative group p-4 shrink-0 shadow-inner">
                              <div className="w-12 h-12 bg-[#151716] rounded-xl shadow-md border border-white/5 p-2 overflow-hidden transition-transform group-hover:scale-110">
                                <img src={formData.favicon_url} className="w-full h-full object-contain" alt="Favicon Preview" />
                              </div>
                              <button
                                type="button"
                                onClick={() => updateFormData(prev => ({ ...prev, favicon_url: "" }))}
                                className="absolute -top-2 -right-2 bg-red-950/80 text-red-500 rounded-full w-7 h-7 flex items-center justify-center text-xs shadow-md hover:bg-red-900 border border-red-500/30 transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-500 italic mt-2 ml-2">
                          This is the small icon shown in the browser tab. If empty, it will use the hotel logo.
                        </p>
                      </div>
                    </div>

                    {/* App Name */}
                    <div className="space-y-3 pt-6 border-t border-white/5">
                      <label className="block text-sm font-bold text-gray-300 uppercase tracking-widest mb-2">
                        {t("adminSettings.appName")}
                      </label>
                      <input
                        type="text"
                        value={formData.app_name}
                        onChange={(e) => updateFormData(prev => ({ ...prev, app_name: e.target.value }))}
                        className="w-full bg-[#0f1110] border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all font-bold text-white placeholder-gray-600"
                        placeholder={t("adminSettings.appNamePlaceholder")}
                        required
                      />
                      <p className="text-[10px] text-[#d4af37] font-bold flex items-center gap-2 ml-2 tracking-wide uppercase">
                        <Info className="w-3 h-3" />
                        {t("adminSettings.appNameHint")}
                      </p>
                    </div>

                    {/* App Tagline */}
                    <div className="space-y-3">
                      <label className="block text-sm font-bold text-gray-300 uppercase tracking-widest mb-2">
                        {t("adminSettings.appTagline")}
                      </label>
                      <input
                        type="text"
                        value={formData.app_tagline}
                        onChange={(e) => updateFormData(prev => ({ ...prev, app_tagline: e.target.value }))}
                        className="w-full bg-[#0f1110] border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all font-medium text-gray-300 placeholder-gray-600"
                        placeholder={t("adminSettings.appTaglinePlaceholder")}
                        required
                      />
                      <p className="text-[10px] text-gray-500 font-bold ml-2 tracking-wide uppercase">
                        {t("adminSettings.appTaglineHint")}
                      </p>
                    </div>

                    {/* VAT Rate */}
                    <div className="space-y-3 pt-6 border-t border-white/5">
                      <label className="block text-sm font-bold text-gray-300 uppercase tracking-widest mb-2">
                        {t("adminSettings.vatRate")}
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="1"
                            value={formData.vat_rate}
                            onChange={(e) => updateFormData(prev => ({ ...prev, vat_rate: e.target.value }))}
                            className="w-full bg-[#0f1110] border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all font-bold text-white placeholder-gray-600"
                            placeholder={t("adminSettings.vatRatePlaceholder")}
                            required
                          />
                        </div>
                        <div className="bg-[#b38822]/10 px-6 py-4 rounded-2xl border border-[#d4af37]/20 flex items-center justify-center min-w-[100px] shrink-0">
                          <span className="text-[#f3cf7a] font-black text-lg">
                            {(parseFloat(formData.vat_rate) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-[#d4af37] font-bold flex items-center gap-2 ml-2 tracking-wide uppercase">
                        <Info className="w-3 h-3" />
                        {t("adminSettings.vatRateHint")}
                      </p>
                    </div>

                    {/* Cashier Printing Toggle */}
                    <div className="space-y-4 p-8 bg-[#0f1110] rounded-[2.5rem] border border-white/5 shadow-inner mt-8">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex-1 space-y-3">
                          <label className="text-lg font-playfair italic font-bold text-white flex items-center gap-3">
                            <span className="p-2 bg-[#151716] rounded-xl border border-white/10 shadow-sm text-xl">🖨️</span>
                            Cashier Printing
                            {formData.enable_cashier_printing === "true" ? (
                              <span className="text-[9px] bg-[#1a2e20] text-[#4ade80] px-2.5 py-1 rounded-md border border-[#4ade80]/30 animate-pulse uppercase tracking-widest ml-2 font-black">ENABLED</span>
                            ) : (
                              <span className="text-[9px] bg-[#1a1c1b] text-gray-500 px-2.5 py-1 rounded-md border border-white/10 uppercase tracking-widest ml-2 font-black">DISABLED</span>
                            )}
                          </label>
                          <p className="text-xs text-gray-400 font-medium leading-relaxed pl-14 sm:pl-0">
                            {formData.enable_cashier_printing === "true"
                              ? "The system WILL automatically open the print dialog after every checkout."
                              : "The system will SKIP the print dialog. Orders will be saved but not printed automatically."}
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-3 pl-14 sm:pl-0 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateFormData(prev => ({
                              ...prev,
                              enable_cashier_printing: prev.enable_cashier_printing === "true" ? "false" : "true"
                            }))}
                            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-500 shadow-inner focus:outline-none ${formData.enable_cashier_printing === "true" ? "bg-[#1a2e20] border border-[#4ade80]/50" : "bg-[#1a1c1b] border border-white/10"
                              }`}
                          >
                            <span
                              className={`inline-block h-6 w-6 transform rounded-full shadow-xl transition-transform duration-500 ${formData.enable_cashier_printing === "true" ? "translate-x-9 bg-[#4ade80]" : "translate-x-1 bg-[#0f1110]0"
                                }`}
                            />
                          </button>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${formData.enable_cashier_printing === "true" ? "text-[#4ade80]" : "text-gray-500"}`}>
                            {formData.enable_cashier_printing === "true" ? "Printing ON" : "Printing OFF"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cashier Revenue Visibility Toggle */}
                    <div className="space-y-4 p-8 bg-[#0f1110] rounded-[2.5rem] border border-white/5 shadow-inner mt-8">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                        <div className="flex-1 space-y-3">
                          <label className="text-lg font-playfair italic font-bold text-white flex items-center gap-3">
                            <span className="p-2 bg-[#151716] rounded-xl border border-white/10 shadow-sm text-xl">💰</span>
                            Cashier Total Revenue View
                            {formData.enable_cashier_today_revenue === "true" ? (
                              <span className="text-[9px] bg-[#1a2e20] text-[#4ade80] px-2.5 py-1 rounded-md border border-[#4ade80]/30 uppercase tracking-widest ml-2 font-black">ENABLED</span>
                            ) : (
                              <span className="text-[9px] bg-[#1a1c1b] text-gray-500 px-2.5 py-1 rounded-md border border-white/10 uppercase tracking-widest ml-2 font-black">DISABLED</span>
                            )}
                          </label>
                          <p className="text-xs text-gray-400 font-medium leading-relaxed pl-14 sm:pl-0">
                            {formData.enable_cashier_today_revenue === "true"
                              ? "Cashiers CAN see today's total revenue in their orders page."
                              : "Cashiers CANNOT see today's total revenue. The revenue card stays hidden."}
                          </p>
                        </div>
                        <div className="flex flex-col items-center gap-3 pl-14 sm:pl-0 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateFormData(prev => ({
                              ...prev,
                              enable_cashier_today_revenue: prev.enable_cashier_today_revenue === "true" ? "false" : "true"
                            }))}
                            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-all duration-500 shadow-inner focus:outline-none ${formData.enable_cashier_today_revenue === "true" ? "bg-[#1a2e20] border border-[#4ade80]/50" : "bg-[#1a1c1b] border border-white/10"
                              }`}
                          >
                            <span
                              className={`inline-block h-6 w-6 transform rounded-full shadow-xl transition-transform duration-500 ${formData.enable_cashier_today_revenue === "true" ? "translate-x-9 bg-[#4ade80]" : "translate-x-1 bg-[#0f1110]"
                                }`}
                            />
                          </button>
                          <span className={`text-[9px] font-black uppercase tracking-widest ${formData.enable_cashier_today_revenue === "true" ? "text-[#4ade80]" : "text-gray-500"}`}>
                            {formData.enable_cashier_today_revenue === "true" ? "Revenue ON" : "Revenue OFF"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-8 border-t border-white/5 mt-10">
                      <button
                        type="submit"
                        disabled={saving || settingsLoading || !settingsReady}
                        className="bg-gradient-to-r from-[#b38822] to-[#d4af37] text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-[#d4af37]/20 transform hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:transform-none flex items-center gap-3 uppercase tracking-widest text-xs"
                      >
                        {saving ? (
                          <>
                            <span className="animate-spin text-lg">⏳</span>
                            {t("adminSettings.saving")}
                          </>
                        ) : (
                          <>
                            <Save className="w-5 h-5" />
                            {t("adminSettings.saveSettings")}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {activeTab === "tables" && (
                  <div className="space-y-10 relative z-10">
                    {/* Floor Management Section */}
                    <div className="bg-[#0f1110] p-6 lg:p-8 rounded-3xl border border-white/5 shadow-inner">
                      <h3 className="font-bold text-xs uppercase tracking-widest text-[#d4af37] mb-6 flex items-center gap-2">
                        <span className="w-5 h-[1px] bg-[#d4af37]/50 block"></span>
                        Manage Floors
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <input
                          type="text"
                          placeholder="Floor Number (e.g. #1)"
                          value={newFloor.floorNumber}
                          onChange={(e) => setNewFloor({ ...newFloor, floorNumber: e.target.value })}
                          className="flex-1 bg-[#151716] border border-white/10 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all text-white placeholder-gray-600 shadow-inner"
                        />
                        <input
                          type="number"
                          placeholder="Order"
                          value={newFloor.order}
                          onChange={(e) => setNewFloor({ ...newFloor, order: parseInt(e.target.value) || 0 })}
                          className="w-full sm:w-28 bg-[#151716] border border-white/10 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all text-white placeholder-gray-600 shadow-inner"
                        />
                        <button
                          onClick={handleAddFloor}
                          disabled={!newFloor.floorNumber}
                          className="bg-gradient-to-r from-[#b38822] to-[#d4af37] text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-50 hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-all shrink-0 active:scale-95 disabled:scale-100"
                        >
                          {editingFloor ? "Update" : "Add Floor"}
                        </button>
                        {editingFloor && (
                          <button
                            onClick={() => { setEditingFloor(null); setNewFloor({ floorNumber: "", order: 0 }) }}
                            className="bg-[#1a1c1b] text-gray-400 px-6 py-4 rounded-xl font-bold border border-white/10 hover:text-white transition-colors text-xs uppercase tracking-widest shrink-0"
                          >
                            Cancel
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        {floors.map(floor => {
                          return (
                            <div key={floor._id} className="bg-[#151716] border border-white/10 rounded-xl pl-4 pr-2 py-2 flex items-center gap-3 shadow-md hover:border-[#d4af37]/30 transition-all group">
                              <span className="font-bold text-sm text-gray-300 group-hover:text-white transition-colors">Floor #{floor.floorNumber}</span>
                              <div className="flex items-center gap-1 ml-2 pl-3 border-l border-white/10">
                                <button onClick={() => { setEditingFloor(floor); setNewFloor({ floorNumber: floor.floorNumber, order: floor.order }) }} className="text-gray-500 hover:text-[#f3cf7a] transition-colors p-1.5 rounded-lg hover:bg-[#d4af37]/10">✏️</button>
                                <button onClick={() => handleDeleteFloor(floor._id)} className="text-gray-500 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-500/10">🗑️</button>
                              </div>
                            </div>
                          )
                        })}
                        {floors.length === 0 && (
                          <div className="w-full text-center py-6 text-gray-500 text-sm italic">
                            No floors added yet.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Table Management Section */}
                    <div className="bg-[#0f1110] p-6 lg:p-8 rounded-3xl border border-white/5 shadow-inner">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-xs uppercase tracking-widest text-[#d4af37] flex items-center gap-2">
                          <span className="w-5 h-[1px] bg-[#d4af37]/50 block"></span>
                          {editingTable ? "Update Table" : "Add New Table"}
                        </h3>
                        {editingTable && (
                          <button
                            onClick={handleCancelEditTable}
                            className="text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-white bg-[#151716] px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Number (e.g. T-01)"
                            value={newTable.tableNumber}
                            onChange={(e) => setNewTable({ ...newTable, tableNumber: e.target.value })}
                            className={`w-full bg-[#151716] border rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#d4af37] transition-all text-white placeholder-gray-600 shadow-inner ${editingTable ? 'border-[#d4af37]' : 'border-white/10'}`}
                          />
                        </div>
                        <div className="w-full sm:w-32">
                          <input
                            type="text"
                            placeholder="Seats"
                            value={newTable.capacity}
                            onChange={(e) => setNewTable({ ...newTable, capacity: e.target.value })}
                            className="w-full bg-[#151716] border border-white/10 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all text-white placeholder-gray-600 shadow-inner"
                          />
                        </div>
                        <button
                          onClick={handleAddTable}
                          disabled={!newTable.tableNumber}
                          className="bg-gradient-to-r from-[#b38822] to-[#d4af37] text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-50 hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-all shrink-0 active:scale-95 disabled:scale-100"
                        >
                          {editingTable ? "Update" : "Add Table"}
                        </button>
                      </div>
                    </div>

                    {/* Global Tables List */}
                    <div className="bg-[#0f1110] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl relative">
                      <div className="bg-[#151716] px-6 py-5 border-b border-white/5 flex justify-between items-center relative z-10">
                        <h4 className="font-bold text-[10px] uppercase tracking-widest text-[#d4af37]">Universal Tables</h4>
                        <span className="text-[10px] font-black text-[#4ade80] bg-[#1a2e20] px-3 py-1 rounded-md border border-[#4ade80]/30 uppercase tracking-widest">
                          {tables.length} Total
                        </span>
                      </div>
                      <div className="p-6 relative z-10">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {tables.map(table => (
                            <div key={table._id} className="p-4 bg-[#151716] border border-white/5 rounded-2xl flex justify-between items-center group hover:border-[#d4af37]/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all">
                              <div>
                                <div className="font-playfair font-bold text-lg text-white group-hover:text-[#f3cf7a] transition-colors">{table.tableNumber}</div>
                                {table.capacity && <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">{table.capacity} Seats</div>}
                              </div>
                              <div className="flex flex-col gap-1">
                                <button onClick={() => handleEditTable(table)} className="text-gray-500 hover:text-[#f3cf7a] transition-colors p-1.5 rounded-lg hover:bg-[#d4af37]/10 flex items-center justify-center">✏️</button>
                                <button onClick={() => handleDeleteTable(table._id)} className="text-gray-500 hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 flex items-center justify-center">🗑️</button>
                              </div>
                            </div>
                          ))}
                          {tables.length === 0 && (
                            <div className="col-span-full text-center py-20 text-gray-500 text-sm italic border-2 border-dashed border-white/5 rounded-[2rem]">
                              No tables registered yet. Add your first table above!
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "categories" && (
                  <div className="space-y-10 relative z-10">
                    <div className="flex flex-wrap gap-2 mb-8 bg-[#0f1110] border border-white/5 p-1 rounded-2xl w-fit">
                      <button
                        type="button"
                        onClick={() => setCategoryType("menu")}
                        className={`px-8 py-3 rounded-xl text-sm font-bold tracking-wider uppercase transition-all ${categoryType === "menu"
                          ? "bg-[#b38822]/20 text-[#f3cf7a] shadow-sm border border-[#d4af37]/30"
                          : "text-gray-500 hover:text-gray-300"
                          }`}
                      >
                        🍽️ Menu Categories
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryType("stock")}
                        className={`px-8 py-3 rounded-xl text-sm font-bold tracking-wider uppercase transition-all ${categoryType === "stock"
                          ? "bg-[#b38822]/20 text-[#f3cf7a] shadow-sm border border-[#d4af37]/30"
                          : "text-gray-500 hover:text-gray-300"
                          }`}
                      >
                        📦 Stock Categories
                      </button>
                      <button
                        type="button"
                        onClick={() => setCategoryType("distribution")}
                        className={`px-8 py-3 rounded-xl text-sm font-bold tracking-wider uppercase transition-all ${categoryType === "distribution"
                          ? "bg-[#b38822]/20 text-[#f3cf7a] shadow-sm border border-[#d4af37]/30"
                          : "text-gray-500 hover:text-gray-300"
                          }`}
                      >
                        🚚 Distribution
                      </button>
                    </div>

                    <div className="bg-[#0f1110] p-6 lg:p-8 rounded-3xl border border-white/5 shadow-inner">
                      <h3 className="font-bold text-xs uppercase tracking-widest text-[#d4af37] mb-6 flex items-center gap-2">
                        <span className="w-5 h-[1px] bg-[#d4af37]/50 block"></span>
                        {editingCategory ? "Update Category" : `Add New ${categoryType === 'menu' ? 'Menu' : categoryType === 'stock' ? 'Stock' : 'Distribution'} Category`}
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-4">
                        <input
                          type="text"
                          placeholder="Category Name"
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                          className="flex-1 bg-[#151716] border border-white/10 rounded-xl px-5 py-4 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all text-white placeholder-gray-600 shadow-inner"
                        />
                        <button
                          onClick={handleSaveCategory}
                          disabled={!newCategory.name}
                          className="bg-gradient-to-r from-[#b38822] to-[#d4af37] text-white px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest disabled:opacity-50 hover:shadow-[0_0_15px_rgba(212,175,55,0.2)] transition-all shrink-0 active:scale-95 disabled:scale-100"
                        >
                          {editingCategory ? "Update" : "Add Category"}
                        </button>
                        {editingCategory && (
                          <button
                            onClick={() => { setEditingCategory(null); setNewCategory({ name: "", type: "menu", description: "" }) }}
                            className="bg-[#1a1c1b] text-gray-400 px-6 py-4 rounded-xl font-bold border border-white/10 hover:text-white transition-colors text-xs uppercase tracking-widest shrink-0"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categories.map(cat => (
                        <div key={cat._id} className="p-5 bg-[#0f1110] border border-white/5 rounded-2xl flex justify-between items-center group hover:border-[#d4af37]/50 hover:shadow-[0_0_15px_rgba(212,175,55,0.1)] transition-all shadow-md">
                          <div>
                            <div className="font-playfair font-bold text-lg text-white group-hover:text-[#f3cf7a] transition-colors">{cat.name}</div>
                            <div className="text-[9px] font-black uppercase text-gray-500 tracking-widest mt-1 border border-white/10 bg-[#151716] rounded-md px-2 py-0.5 inline-block">{cat.type === 'menu' ? 'Menu' : 'Stock'}</div>
                          </div>
                          <div className="flex gap-1 ml-4 border-l border-white/5 pl-3">
                            <button onClick={() => { setEditingCategory(cat); setNewCategory({ ...newCategory, name: cat.name }) }} className="text-gray-500 hover:text-[#f3cf7a] transition-colors p-2 rounded-xl hover:bg-[#d4af37]/10 flex items-center justify-center">✏️</button>
                            <button onClick={() => handleDeleteCategory(cat._id)} className="text-gray-500 hover:text-red-500 transition-colors p-2 rounded-xl hover:bg-red-500/10 flex items-center justify-center">🗑️</button>
                          </div>
                        </div>
                      ))}
                      {categories.length === 0 && (
                        <div className="col-span-full text-center py-20 text-gray-500 text-sm italic border-2 border-dashed border-white/5 rounded-[2rem] bg-[#0f1110]">
                          No {categoryType} categories found. Add your first one above!
                        </div>
                      )}
                    </div>
                  </div>
                )}


              </div>
            </div>
          </div>

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
      </div>
    </ProtectedRoute>
  )
}
