"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { compressImage, validateImageFile } from "@/lib/utils/image-utils"
import QRCode from "qrcode"
import { 
  Plus, 
  Hash, 
  ArrowLeftRight, 
  Loader2, 
  QrCode, 
  Search, 
  AlertTriangle, 
  Trash2, 
  X, 
  Utensils, 
  Coffee, 
  RefreshCw, 
  Download, 
  Smartphone,
  ChevronDown,
  Monitor,
  Leaf,
  Printer,
  Package,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Check
} from "lucide-react"

interface MenuItem {
  _id: string
  menuId: string
  name: string
  mainCategory: 'Food' | 'Drinks'
  category: string
  price: number
  description?: string
  image?: string
  preparationTime?: number
  available: boolean
  reportUnit?: 'kg' | 'liter' | 'piece'
  reportQuantity?: number
  stockItemId?: string | any
  stockConsumption?: number
  distributions?: string[]
  createdAt: string
  updatedAt: string
}

interface MenuItemForm {
  menuId: string
  name: string
  mainCategory: 'Food' | 'Drinks'
  category: string
  price: string
  description: string
  image: string
  preparationTime: string
  available: boolean
  reportUnit: 'kg' | 'liter' | 'piece'
  reportQuantity: string
  stockItemId: string
  stockConsumption: string
  distributions: string[]
}

interface MenuManagementSectionProps {
  confirm: (options: any) => Promise<boolean>
  notify: (options: any) => void
  showTitle?: boolean
  apiBaseUrl?: string
  categoryType?: string
  title?: string
  publicMenuUrl?: string
}

const MENU_SYNC_EVENT = "menuUpdated"
const MENU_SYNC_CHANNEL = "abehotel-menu-sync"

export function MenuManagementSection({ 
  confirm, 
  notify, 
  showTitle = true,
  apiBaseUrl = "/api/admin/menu",
  categoryType = "menu",
  title,
  publicMenuUrl = "/public-menu"
}: MenuManagementSectionProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [stockItems, setStockItems] = useState<any[]>([])
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [createLoading, setCreateLoading] = useState(false)
  const [imageProcessing, setImageProcessing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [mainCategoryFilter, setMainCategoryFilter] = useState<'Food' | 'Drinks'>('Food')
  const [formData, setFormData] = useState<MenuItemForm>({
    menuId: "",
    name: "",
    mainCategory: 'Food',
    category: "",
    price: "",
    description: "",
    image: "",
    preparationTime: "10",
    available: true,
    reportUnit: 'piece',
    reportQuantity: '1',
    stockItemId: "",
    stockConsumption: "0",
    distributions: []
  })
  const [imageInputType, setImageInputType] = useState<'file' | 'url'>('file')
  const { token } = useAuth()
  const { t } = useLanguage()
  const [categories, setCategories] = useState<any[]>([])
  const [swapMode, setSwapMode] = useState(false)
  const [swapSourceId, setSwapSourceId] = useState<string | null>(null)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")

  const [distributions, setDistributions] = useState<any[]>([])
  const [showDistManager, setShowDistManager] = useState(false)
  const [distLoading, setDistLoading] = useState(false)
  const [newDistName, setNewDistName] = useState("")
  const [distFilter, setDistFilter] = useState("all")
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [qrGenerating, setQrGenerating] = useState(false)
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
  const exportButtonRef = useRef<HTMLButtonElement>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const broadcastMenuUpdate = () => {
    const stamp = Date.now().toString()
    localStorage.setItem(MENU_SYNC_EVENT, stamp)
    window.dispatchEvent(new Event(MENU_SYNC_EVENT))
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(MENU_SYNC_CHANNEL)
      channel.postMessage({ type: MENU_SYNC_EVENT, at: stamp })
      channel.close()
    }
  }

  useEffect(() => {
    if (token) {
      fetchMenuItems()
      fetchCategories()
      fetchDistributions()
      fetchStockItems()
    }
  }, [token])

  const fetchDistributions = async () => {
    if (!token) return
    try {
      const response = await fetch(`/api/categories?type=distribution`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setDistributions(data)
      }
    } catch (error) {
      console.error("Error fetching distributions:", error)
    }
  }

  const fetchStockItems = async () => {
    try {
      const response = await fetch("/api/stock", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setStockItems(data)
      }
    } catch (error) {
      console.error("Error fetching stock:", error)
    }
  }

  const fetchCategories = async () => {
    if (!token) return
    try {
      const response = await fetch(`/api/categories?type=${categoryType}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    setCategoryLoading(true)
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCategoryName, type: categoryType }),
      })
      if (response.ok) {
        setNewCategoryName("")
        fetchCategories()
      }
    } catch (error) {
      console.error("Error adding category:", error)
    } finally {
      setCategoryLoading(false)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Category",
      message: "Are you sure you want to delete this category?\n\nMenu items in this category will still exist but the category filter will be gone.",
      type: "warning",
      confirmText: "Delete Category",
      cancelText: "Cancel"
    })

    if (!confirmed) return
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        fetchCategories()
      }
    } catch (error) {
      console.error("Error deleting category:", error)
    }
  }

  const handleUpdateCategory = async (id: string, newName: string) => {
    if (!newName.trim()) return
    setCategoryLoading(true)
    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName }),
      })
      if (response.ok) {
        fetchCategories()
      }
    } catch (error) {
      console.error("Error updating category:", error)
    } finally {
      setCategoryLoading(false)
    }
  }

  useEffect(() => {
    filterItems()
  }, [menuItems, searchTerm, categoryFilter, distFilter, mainCategoryFilter])

  const fetchMenuItems = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${apiBaseUrl}?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMenuItems(data)
        setError(null)
      } else {
        const errData = await response.json().catch(() => ({}))
        setError(errData.message || `Error ${response.status}: Failed to load menu`)
      }
    } catch (error: any) {
      console.error("Error fetching menu items:", error)
      setError(error.message || "Network error: Failed to fetch menu")
    } finally {
      setLoading(false)
    }
  }

  const filterItems = () => {
    let filtered = menuItems.filter(item => (item.mainCategory || 'Food') === mainCategoryFilter)
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.menuId && item.menuId.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    if (categoryFilter !== "all") {
      filtered = filtered.filter(item => item.category === categoryFilter)
    }
    if (distFilter !== "all") {
      filtered = filtered.filter(item => item.distributions?.includes(distFilter))
    }

    // Sort numerically by menuId
    filtered = [...filtered].sort((a, b) => {
      const idA = a.menuId || ""
      const idB = b.menuId || ""
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
    })

    setFilteredItems(filtered)
    setCurrentPage(1)
  }

  const handleSwap = async (targetMenuId: string) => {
    if (!swapSourceId) {
      setSwapSourceId(targetMenuId)
      notify({ title: "Select Target", message: "Select another item to swap IDs with.", type: "info" })
      return
    }

    if (swapSourceId === targetMenuId) {
      setSwapSourceId(null)
      return
    }

    try {
      const response = await fetch(`${apiBaseUrl}/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ menuId1: swapSourceId, menuId2: targetMenuId }),
      })

      if (response.ok) {
        notify({ title: "Success", message: "Menu IDs swapped successfully.", type: "success" })
        fetchMenuItems()
        setSwapMode(false)
        setSwapSourceId(null)
      } else {
        const errorData = await response.json()
        notify({ title: "Error", message: errorData.message || "Failed to swap IDs", type: "error" })
      }
    } catch (error) {
      notify({ title: "Error", message: "An error occurred while swapping", type: "error" })
    }
  }

  const handleNormalize = async () => {
    const confirmed = await confirm({
      title: "Re-index Menu IDs",
      message: "This will re-index all menu items sequentially (1, 2, 3...). Gaps in IDs will be closed.\n\nAre you sure?",
      type: "info",
      confirmText: "Re-index Now",
      cancelText: "Cancel"
    })

    if (!confirmed) return

    try {
      setLoading(true)
      const response = await fetch(`${apiBaseUrl}/normalize`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        notify({ title: "Success", message: "Menu IDs re-indexed successfully!", type: "success" })
        fetchMenuItems()
        broadcastMenuUpdate()
      } else {
        const errorData = await response.json()
        notify({ title: "Error", message: errorData.message || "Normalization failed", type: "error" })
      }
    } catch (error) {
      console.error("Normalize error:", error)
      notify({ title: "Error", message: "An error occurred during normalization", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.category || !formData.price) {
      notify({
        title: "Missing Information",
        message: "Please fill in all required fields (Name, Category, and Price).",
        type: "error"
      })
      return
    }

    setCreateLoading(true)
    try {
      const url = editingItem
        ? `${apiBaseUrl}/${editingItem._id}`
        : apiBaseUrl

      const method = editingItem ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        notify({
          title: editingItem ? "Menu Item Updated" : "Menu Item Created",
          message: editingItem ? "Menu item has been updated successfully." : "New menu item has been added successfully.",
          type: "success"
        })
        resetForm()
        // Refresh immediately and broadcast update to cashier sessions
        fetchMenuItems()
        setImageInputType('file')
        broadcastMenuUpdate()
      } else {
        const errorData = await response.json()
        notify({
          title: "Save Failed",
          message: errorData.message || "Failed to save menu item",
          type: "error"
        })
      }
    } catch (error) {
      console.error("Error saving menu item:", error)
    } finally {
      setCreateLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const { valid, error } = validateImageFile(file)
    if (!valid) {
      notify({
        title: "Invalid Image",
        message: error || "Please select a valid image file",
        type: "error"
      })
      return
    }

    try {
      setImageProcessing(true)
      const compressedImage = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8
      })
      setFormData(prev => ({ ...prev, image: compressedImage }))
    } catch (err) {
      console.error("Image processing failed:", err)
      notify({
        title: "Image Processing Failed",
        message: "Failed to process the selected image. Please try again.",
        type: "error"
      })
    } finally {
      setImageProcessing(false)
    }
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      menuId: item.menuId || "",
      name: item.name,
      mainCategory: item.mainCategory || 'Food',
      category: item.category,
      price: item.price.toString(),
      description: item.description || "",
      image: item.image || "",
      preparationTime: item.preparationTime?.toString() || "10",
      available: item.available,
      reportUnit: item.reportUnit || 'piece',
      reportQuantity: item.reportQuantity?.toString() || "0",
      stockItemId: item.stockItemId?._id || item.stockItemId || "",
      stockConsumption: item.stockConsumption?.toString() || "0",
      distributions: item.distributions || [],
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (item: MenuItem) => {
    const confirmed = await confirm({
      title: "Delete Menu Item",
      message: `Are you sure you want to delete "${item.name}"?\n\nThis action cannot be undone.`,
      type: "danger",
      confirmText: "Delete Item",
      cancelText: "Cancel"
    })

    if (!confirmed) return

    try {
      const response = await fetch(`${apiBaseUrl}/${item._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        fetchMenuItems()
        broadcastMenuUpdate()
      }
    } catch (error) {
      console.error("Error deleting menu item:", error)
    }
  }

  const handleExportDropdownToggle = () => {
    if (!showExportDropdown && exportButtonRef.current) {
      const rect = exportButtonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        left: Math.max(8, rect.left)
      })
    }
    setShowExportDropdown(!showExportDropdown)
  }

  const handleExportCSV = (exportType: 'food' | 'drinks' | 'all' = 'all') => {
    let itemsToExport = menuItems

    if (exportType === 'food') {
      itemsToExport = menuItems.filter(item => (item.mainCategory || 'Food') === 'Food')
    } else if (exportType === 'drinks') {
      itemsToExport = menuItems.filter(item => item.mainCategory === 'Drinks')
    }

    if (itemsToExport.length === 0) {
      notify({ title: 'No Items', message: `No ${exportType === 'all' ? '' : exportType + ' '}items to export.`, type: 'info' })
      return
    }

    const headers = ["Menu ID", "Name", "Main Category", "Category", "Price", "Available", "Description"]
    const rows = itemsToExport.map(item => [
      item.menuId || "",
      `"${(item.name || "").replace(/"/g, '""')}",`,
      item.mainCategory || "Food",
      `"${(item.category || "").replace(/"/g, '""')}",`,
      item.price,
      item.available ? "Yes" : "No",
      `"${(item.description || "").replace(/"/g, '""')}",`
    ])

    const csvContent = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    const fileName = exportType === 'all' ? 'menu' : exportType.toLowerCase()
    link.setAttribute("download", `${fileName}_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowExportDropdown(false)
  }

  const resetForm = () => {
    setFormData({
      menuId: "", name: "", mainCategory: 'Food', category: "", price: "", description: "",
      image: "", preparationTime: "10", available: true,
      reportUnit: 'piece', reportQuantity: '1',
      stockItemId: "", stockConsumption: "0", distributions: []
    })
    setEditingItem(null)
    setShowCreateForm(false)
  }

  const handleGenerateQr = useCallback(async () => {
    setQrGenerating(true)
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://abehotel.vercel.app'
      const menuUrl = publicMenuUrl.startsWith('http') ? publicMenuUrl : `${origin}${publicMenuUrl}`
      
      const dataUrl = await QRCode.toDataURL(menuUrl, {
        width: 512,
        margin: 2,
        color: { dark: '#1a1a1a', light: '#ffffff' },
        errorCorrectionLevel: 'H',
      })
      setQrDataUrl(dataUrl)
      setShowQrModal(true)
    } catch (err) {
      console.error('QR generation error:', err)
      notify({ title: 'Error', message: 'Failed to generate QR code', type: 'error' })
    } finally {
      setQrGenerating(false)
    }
  }, [notify])

  const handleDownloadQr = () => {
    if (!qrDataUrl) return
    const link = document.createElement('a')
    link.download = 'menu-qr-code.png'
    link.href = qrDataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrintQr = () => {
    if (!qrDataUrl) return
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(`
        <html><head><title>Menu QR Code</title>
        <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;}
        img{width:400px;height:400px;}h2{margin-bottom:8px;}p{color:#666;margin-top:0;}</style></head>
        <body><h2>Scan to View Menu</h2><p>Point your camera at the QR code</p>
        <img src="${qrDataUrl}" /><script>setTimeout(()=>{window.print();window.close()},500)<\/script></body></html>`)
      win.document.close()
    }
  }

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const paginatedItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Control Sidebar */}
          <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-4">
            {/* Add New Button Card */}
            <div className="bg-[#1a1c1b] border border-white/10 rounded-2xl p-6 md:p-8 shadow-xl text-white relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:scale-110 transition-transform duration-500">
                <Coffee size={120} className="text-[#d4af37]" />
              </div>
              <div className="relative z-10">
                <h2 className="text-xl md:text-2xl font-playfair italic font-bold mb-6 tracking-tight text-[#f3cf7a]">{t("adminMenu.actions")}</h2>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => { resetForm(); setShowCreateForm(true); }}
                    className="w-full bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] font-black py-4 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] transition-all text-[10px] uppercase tracking-widest transform active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Plus size={18} /> {t("adminMenu.addNewItem")}
                  </button>

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={handleNormalize}
                      className="bg-[#151716] hover:bg-[#1a1c1b] text-[#f3cf7a] font-black py-3 rounded-xl transition-all text-[9px] uppercase tracking-widest border border-[#d4af37]/30 flex items-center justify-center gap-1"
                      title="Auto-fix ID gaps"
                    >
                      <Hash size={14} /> {t("adminMenu.reindex") || "Re-index"}
                    </button>
                    <button
                      onClick={() => { setSwapMode(!swapMode); setSwapSourceId(null); }}
                      className={`font-black py-3 rounded-xl border text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1 ${swapMode ? "bg-purple-600/20 text-purple-400 border-purple-500/50 shadow-inner" : "bg-[#151716] text-white border-white/5 hover:border-[#d4af37]/30"}`}
                    >
                      <ArrowLeftRight size={14} /> {swapMode ? t("common.cancel") : t("adminMenu.swap") || "Swap"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      ref={exportButtonRef}
                      onClick={handleExportDropdownToggle}
                      className="w-full bg-[#0f1110] hover:bg-[#151716] text-gray-400 hover:text-white font-black py-3 rounded-xl transition-all text-[9px] uppercase tracking-widest border border-white/5 flex items-center justify-center gap-1"
                    >
                      <Download size={14} /> Export CSV
                      <ChevronDown size={10} className="ml-0.5" />
                    </button>

                    <button
                      onClick={handleGenerateQr}
                      disabled={qrGenerating}
                      className="bg-[#0f1110] hover:bg-[#151716] text-gray-400 hover:text-white font-black py-3 rounded-xl transition-all text-[9px] uppercase tracking-widest border border-white/5 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {qrGenerating ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />} QR Menu
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters Card */}
            <div className="bg-[#151716] border border-white/5 rounded-2xl p-6 shadow-sm">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-[#d4af37] mb-5 flex items-center gap-2">
                <Search size={14} /> {t("adminMenu.filters")}
              </h2>
              <div className="space-y-5">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 h-4 w-4" />
                  <input
                    type="text"
                    placeholder={t("adminMenu.searchPlaceholder")}
                    className="w-full pl-12 pr-6 py-4 bg-[#0f1110] border border-white/5 rounded-2xl text-white placeholder-gray-600 focus:border-[#d4af37]/50 transition-all outline-none font-bold text-sm shadow-inner"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2 mx-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">{t("adminMenu.category")}</label>
                    <button
                      onClick={() => setShowCategoryManager(true)}
                      className="text-[10px] font-black uppercase tracking-widest text-[#d4af37] hover:text-[#f3cf7a] transition-colors"
                    >
                      {t("adminMenu.manage")}
                    </button>
                  </div>
                  <div className="relative">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full bg-[#0f1110] border border-white/5 rounded-2xl px-4 py-4 text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:border-[#d4af37]/50 text-white pr-10 shadow-inner"
                    >
                      <option value="all" className="bg-[#151716]">{t("adminMenu.allCategories")}</option>
                      {categories.map((cat: any) => (
                        <option key={cat._id || cat.name} value={cat.name} className="bg-[#151716]">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2 mx-1">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500">Distribution</label>
                    <button
                      onClick={() => setShowDistManager(true)}
                      className="text-[10px] font-black uppercase tracking-widest text-[#d4af37] hover:text-[#f3cf7a] transition-colors"
                    >
                      {t("adminMenu.manage")}
                    </button>
                  </div>
                  <div className="relative">
                    <select
                      value={distFilter}
                      onChange={(e) => setDistFilter(e.target.value)}
                      className="w-full bg-[#0f1110] border border-white/5 rounded-2xl px-4 py-4 text-sm font-bold appearance-none cursor-pointer focus:outline-none focus:border-[#d4af37]/50 text-white pr-10 shadow-inner"
                    >
                      <option value="all" className="bg-[#151716]">All Distributions</option>
                      {distributions.map((dist: any) => (
                        <option key={dist._id} value={dist.name} className="bg-[#151716]">
                          {dist.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        <div className="md:col-span-8 lg:col-span-9">
          <div className="bg-[#151716] rounded-3xl p-8 shadow-2xl border border-white/5 min-h-[600px]">
            {showTitle && (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                  <h1 className="text-2xl md:text-3xl font-playfair italic font-bold text-[#f3cf7a] tracking-tight flex items-center gap-3">
                    {title || t("adminMenu.title")}
                    {loading && <RefreshCw size={24} className="animate-spin text-[#d4af37]" />}
                  </h1>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">{t("adminMenu.subtitle")}</p>
                </div>
                <div className="bg-[#d4af37]/10 px-4 py-2 rounded-xl border border-[#d4af37]/20 text-[#f3cf7a] text-[10px] font-black uppercase tracking-widest shadow-sm">
                  {filteredItems.length} {t("adminMenu.itemsFound")}
                </div>
              </div>
            )}

            {/* Food / Drinks top-level tabs */}
            <div className="flex gap-2 mb-8 bg-[#0f1110] p-1.5 rounded-2xl w-fit border border-white/5">
              {(['Food', 'Drinks'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setMainCategoryFilter(tab); setCategoryFilter('all') }}
                  className={`flex items-center gap-2 px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${mainCategoryFilter === tab
                    ? 'bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] shadow-lg'
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                    }`}
                >
                  {tab === 'Food' ? <Utensils size={14} /> : <Coffee size={14} />} {tab}
                  <span className={`text-[9px] font-bold ${mainCategoryFilter === tab ? 'text-[#0f1110]/70' : 'text-gray-600'}`}>({menuItems.filter(i => (i.mainCategory || 'Food') === tab).length})</span>
                </button>
              ))}
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-2xl font-bold flex items-center gap-3">
                <AlertTriangle size={18} /> {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedItems.map((item) => (
                <div key={item._id} className="bg-[#0f1110] rounded-[2rem] overflow-hidden border border-white/5 hover:border-[#d4af37]/30 hover:shadow-[0_0_30px_rgba(212,175,55,0.05)] transition-all group flex flex-col relative">
                  {/* Item Image */}
                  <div className="h-44 md:h-52 bg-[#1a1c1b] relative overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#d4af37] opacity-20"><Utensils size={64} /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f1110] via-transparent to-transparent opacity-60" />
                    <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                      <div className="bg-[#1a1c1b]/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-[9px] font-black text-[#f3cf7a] shadow-lg border border-white/10 uppercase tracking-widest">
                        #{item.menuId}
                      </div>
                    </div>
                    <div className={`absolute top-4 right-4 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest z-10 backdrop-blur-md border shadow-lg ${item.available ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}`}>
                      {item.available ? t("adminMenu.active") : t("adminMenu.hidden")}
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col relative">
                    <h3 className="font-playfair italic font-bold text-xl text-white mb-1 truncate group-hover:text-[#f3cf7a] transition-colors">{item.name}</h3>
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6">{item.category}</p>
                    
                    <div className="flex items-baseline gap-1.5 mb-8">
                      <span className="text-3xl font-black text-[#f3cf7a] tracking-tight">{item.price}</span>
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{t("common.currencyBr")}</span>
                    </div>

                    <div className="flex gap-3 mt-auto">
                      <button
                        onClick={() => swapMode ? handleSwap(item.menuId) : handleEdit(item)}
                        className={`flex-1 font-black py-4 rounded-xl transition-all text-[10px] uppercase tracking-widest border transform active:scale-95 ${swapMode
                          ? (swapSourceId === item.menuId ? "bg-purple-600 text-white border-purple-600 shadow-[0_0_15px_rgba(147,51,234,0.3)]" : "bg-purple-600/10 text-purple-400 border-purple-500/30 hover:bg-purple-600/20")
                          : "bg-[#151716] border-white/5 text-gray-400 hover:border-[#d4af37]/30 hover:text-[#f3cf7a] hover:shadow-lg"
                          }`}
                      >
                        {swapMode ? (swapSourceId === item.menuId ? "Selected" : "Swap ID") : t("adminMenu.edit")}
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="w-12 h-12 bg-[#151716] border border-white/5 text-gray-500 flex items-center justify-center rounded-xl hover:bg-red-950/30 hover:border-red-500/30 hover:text-red-500 transition-all transform active:scale-95"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-10">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="p-3 bg-[#0f1110] border border-white/5 rounded-xl text-gray-500 hover:text-[#f3cf7a] hover:border-[#d4af37]/30 transition-all disabled:opacity-20"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="px-6 py-2 bg-[#0f1110] border border-white/5 rounded-xl text-[#f3cf7a] text-[10px] font-black uppercase tracking-widest shadow-inner">
                  Page <span className="text-white mx-1">{currentPage}</span> of <span className="text-white mx-1">{totalPages}</span>
                </div>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="p-3 bg-[#0f1110] border border-white/5 rounded-xl text-gray-500 hover:text-[#f3cf7a] hover:border-[#d4af37]/30 transition-all disabled:opacity-20"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}

            {!loading && filteredItems.length === 0 && (
              <div className="text-center py-32">
                <div className="text-[#d4af37]/10 mb-6 flex justify-center"><Leaf size={80} /></div>
                <h2 className="text-2xl font-playfair italic font-bold text-gray-500 mb-2">{t("adminMenu.empty")}</h2>
                <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">{t("adminMenu.emptyDesc")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#1a1c1b] border border-white/10 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl max-w-2xl w-full relative overflow-hidden flex flex-col max-h-[90vh]">
            <button
              onClick={resetForm}
              className="absolute top-8 right-8 w-12 h-12 bg-[#0f1110] border border-white/5 rounded-2xl flex items-center justify-center font-bold text-gray-500 hover:text-white hover:border-red-500/30 transition-all z-10"
            >
              <X size={20} />
            </button>

            <div className="flex-1 overflow-y-auto p-6 md:p-12 pt-16 md:pt-20 scrollbar-hide">
              <h2 className="text-2xl md:text-3xl font-playfair italic font-bold text-[#f3cf7a] mb-10 tracking-tight">
                {editingItem ? t("adminMenu.updateItem") : t("adminMenu.newItem")}
              </h2>
              <form onSubmit={handleCreateOrUpdate} className="space-y-10 pb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">{t("adminMenu.itemName")}</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Traditional Coffee"
                        className="w-full bg-[#0f1110] border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder-gray-700 outline-none focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 transition-all shadow-inner"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">{t("adminMenu.description")}</label>
                      <textarea
                        rows={4}
                        placeholder={t("adminMenu.descPlaceholder")}
                        className="w-full bg-[#0f1110] border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder-gray-700 outline-none focus:border-[#d4af37]/50 transition-all resize-none shadow-inner"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">{t("adminMenu.menuId")}</label>
                        <input
                          type="text"
                          placeholder="e.g. 1"
                          className="w-full bg-[#0f1110] border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder-gray-700 outline-none focus:border-[#d4af37]/50 transition-all shadow-inner"
                          value={formData.menuId}
                          onChange={(e) => setFormData({ ...formData, menuId: e.target.value })}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">{t("adminMenu.mainCategory")}</label>
                        <select
                          className="w-full bg-[#0f1110] border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-[#d4af37]/50 transition-all appearance-none cursor-pointer shadow-inner"
                          value={formData.mainCategory}
                          onChange={(e) => setFormData({ ...formData, mainCategory: e.target.value as any, category: "" })}
                        >
                          <option value="Food" className="bg-[#1a1c1b]">Food</option>
                          <option value="Drinks" className="bg-[#1a1c1b]">Drinks</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center mb-1 mx-1">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{t("adminMenu.category")}</label>
                        <button type="button" onClick={() => setShowCategoryManager(true)} className="text-[10px] font-bold uppercase tracking-widest text-[#d4af37] hover:text-[#f3cf7a] transition-colors">{t("adminMenu.manage")}</button>
                      </div>
                      <select
                        required
                        className="w-full bg-[#0f1110] border border-white/5 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none focus:border-[#d4af37]/50 transition-all appearance-none cursor-pointer shadow-inner"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      >
                        <option value="" className="text-gray-600 bg-[#1a1c1b]">{t("adminMenu.selectCategory")}</option>
                        {categories.map((cat: any) => (
                          <option key={cat._id} value={cat.name} className="bg-[#1a1c1b]">{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">{t("adminMenu.price")} (Br)</label>
                        <input
                          required
                          type="number"
                          placeholder="0.00"
                          className="w-full bg-[#0f1110] border border-white/5 rounded-2xl px-6 py-4 text-lg font-black text-[#f3cf7a] outline-none focus:border-[#d4af37]/50 transition-all shadow-inner"
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">{t("adminMenu.prepTime")} (Min)</label>
                        <input
                          type="number"
                          placeholder="10"
                          className="w-full bg-[#0f1110] border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-[#d4af37]/50 transition-all shadow-inner"
                          value={formData.preparationTime}
                          onChange={(e) => setFormData({ ...formData, preparationTime: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">{t("adminMenu.image")}</label>
                      
                      {/* Image Input Type Toggle */}
                      <div className="flex gap-2 mb-3">
                        <button
                          type="button"
                          onClick={() => setImageInputType('file')}
                          className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            imageInputType === 'file'
                              ? 'bg-[#d4af37] text-[#0f1110]'
                              : 'bg-[#1a1c1b] text-gray-400 border border-white/10'
                          }`}
                        >
                          Upload File
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageInputType('url')}
                          className={`flex-1 py-2 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            imageInputType === 'url'
                              ? 'bg-[#d4af37] text-[#0f1110]'
                              : 'bg-[#1a1c1b] text-gray-400 border border-white/10'
                          }`}
                        >
                          Image URL
                        </button>
                      </div>

                      {/* Image URL Input */}
                      {imageInputType === 'url' && (
                        <div className="space-y-2 mb-4">
                          <input
                            type="url"
                            value={formData.image}
                            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                            placeholder="https://example.com/image.jpg"
                            className="w-full bg-[#0f1110] border border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-[#d4af37]/50 shadow-inner placeholder:text-gray-600"
                          />
                        </div>
                      )}

                      <div className="bg-[#0f1110] border border-white/5 rounded-3xl p-6 shadow-inner">
                        {formData.image ? (
                          <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group/img">
                            <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setFormData({ ...formData, image: "" })}
                              className="absolute top-4 right-4 bg-red-500 text-white p-2 rounded-xl opacity-0 group-hover/img:opacity-100 transition-all shadow-lg hover:scale-110"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="aspect-video rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-gray-600 group hover:border-[#d4af37]/30 transition-all bg-[#151716]/50">
                            <RefreshCw size={40} className={`mb-4 text-gray-700 group-hover:text-[#d4af37]/40 transition-colors ${imageProcessing ? "animate-spin" : ""}`} />
                            <p className="text-[10px] font-black uppercase tracking-widest group-hover:text-gray-400 transition-colors">
                              {imageProcessing ? t("adminMenu.processing") : t("adminMenu.noImage")}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Reporting Configuration */}
                    <div className="bg-[#2d5a41]/10 p-6 rounded-[30px] border border-[#2d5a41]/20">
                      <h3 className="text-sm font-black text-[#f3cf7a] uppercase tracking-widest mb-4">Reporting Configuration</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Reporting Unit</label>
                          <div className="relative">
                            <select
                              value={formData.reportUnit}
                              onChange={(e) => setFormData({ ...formData, reportUnit: e.target.value as any })}
                              className="w-full bg-[#0f1110] border border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-[#d4af37]/50 appearance-none cursor-pointer shadow-inner"
                            >
                              <option value="kg" className="bg-[#1a1c1b]">kg (Beef)</option>
                              <option value="liter" className="bg-[#1a1c1b]">liter (Drinks/Milk)</option>
                              <option value="piece" className="bg-[#1a1c1b]">piece (Soft Drinks)</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                              <ChevronDown size={14} />
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Amount per Sale</label>
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              value={formData.reportQuantity}
                              onChange={(e) => setFormData({ ...formData, reportQuantity: e.target.value })}
                              className="w-full bg-[#0f1110] border border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-[#d4af37]/50 shadow-inner"
                              placeholder="0.00"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#d4af37] text-[10px] font-black uppercase tracking-widest">
                              {formData.reportUnit}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stock Linkage Configuration */}
                    <div className="bg-[#f5bc6b]/10 p-6 rounded-[30px] border border-[#f5bc6b]/20">
                      <h3 className="text-sm font-black text-[#f3cf7a] uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Package size={16} /> Stock Linkage (Optional)
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Link to Stock Item</label>
                          <div className="relative">
                            <select
                              value={formData.stockItemId}
                              onChange={(e) => {
                                const stockId = e.target.value;
                                const stock = stockItems.find((s: any) => s._id === stockId);
                                setFormData({
                                  ...formData,
                                  stockItemId: stockId,
                                  stockConsumption: "1.0"
                                });
                              }}
                              className="w-full bg-[#0f1110] border border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-[#d4af37]/50 appearance-none cursor-pointer shadow-inner"
                            >
                              <option value="" className="bg-[#1a1c1b]">No Stock Linked</option>
                              {stockItems.map((stock: any) => (
                                <option key={stock._id} value={stock._id} className="bg-[#1a1c1b]">
                                  {stock.name} ({stock.unit})
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                              <ChevronDown size={14} />
                            </div>
                          </div>
                        </div>
 
                        {formData.stockItemId && (
                          <div className="space-y-2">
                            <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Stock Used Per Sale</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                value={formData.stockConsumption}
                                onChange={(e) => setFormData({ ...formData, stockConsumption: e.target.value })}
                                className="w-full bg-[#0f1110] border border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-[#f3cf7a] outline-none focus:border-[#d4af37]/50 shadow-inner"
                                placeholder="1.0"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#f3cf7a] text-[10px] font-black uppercase tracking-widest">
                                {stockItems.find(s => s._id === formData.stockItemId)?.unit || 'units'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Distribution Availability */}
                <div className="md:col-span-2 bg-[#1a1c1b] p-8 rounded-[35px] border border-white/5 shadow-2xl relative overflow-hidden group/variants">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover/variants:scale-110 transition-transform duration-500">
                    <ArrowLeftRight size={80} className="text-[#d4af37]" />
                  </div>
                  <h3 className="text-[10px] font-black text-[#d4af37] uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <ArrowLeftRight size={14} /> Distribution Availability
                  </h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-6">Select which distributions this item is available for.</p>
 
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {distributions.map((dist: any) => (
                      <button
                        key={dist._id}
                        type="button"
                        onClick={() => {
                          const current = formData.distributions || []
                          const updated = current.includes(dist.name)
                            ? current.filter(d => d !== dist.name)
                            : [...current, dist.name]
                          setFormData({ ...formData, distributions: updated })
                        }}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl border transition-all text-left group/btn ${formData.distributions?.includes(dist.name)
                          ? 'bg-[#d4af37] border-[#d4af37] text-[#0f1110] shadow-lg scale-[1.02]'
                          : 'bg-[#0f1110] border-white/5 text-gray-400 hover:border-[#d4af37]/30'
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${formData.distributions?.includes(dist.name)
                          ? 'bg-white border-white text-[#d4af37]'
                          : 'border-white/10 group-hover/btn:border-[#d4af37]/50'
                          }`}>
                          {formData.distributions?.includes(dist.name) && <Check size={12} strokeWidth={4} />}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest truncate">{dist.name}</span>
                      </button>
                    ))}
                    {distributions.length === 0 && (
                      <p className="col-span-full text-center py-6 text-gray-600 text-[9px] font-black uppercase tracking-widest italic border border-dashed border-white/5 rounded-2xl">No distributions found. Add them in the sidebar.</p>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-6 pt-10 border-t border-white/5">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    <label className="flex items-center gap-4 cursor-pointer group">
                      <div className={`w-14 h-7 rounded-full transition-all relative p-1 ${formData.available ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-[#0f1110] border border-white/5'}`}>
                        <div className={`absolute top-1 bottom-1 w-5 rounded-full transition-all shadow-lg ${formData.available ? 'left-8 bg-emerald-500' : 'left-1 bg-gray-600'}`}></div>
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={formData.available}
                        onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                      />
                      <span className="font-bold text-[10px] uppercase tracking-widest text-gray-500 group-hover:text-white transition-colors">{t("adminMenu.available")}</span>
                    </label>

                    <div className="flex gap-4 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="flex-1 sm:flex-none px-10 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                      >
                        {t("adminMenu.cancel")}
                      </button>
                      <button
                        type="submit"
                        disabled={createLoading}
                        className="flex-1 sm:flex-none px-12 py-4 bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] rounded-xl font-black text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all disabled:opacity-50 transform active:scale-95"
                      >
                        {createLoading ? t("adminMenu.save") : (editingItem ? t("adminMenu.updateItem") : t("adminMenu.add"))}
                      </button>
                    </div>
                  </div>
                </div>
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
        title={t("adminMenu.manageCategories")}
        value={newCategoryName}
        onChange={setNewCategoryName}
        t={t}
      />

      <CategoryManager
        show={showDistManager}
        onClose={() => setShowDistManager(false)}
        categories={distributions}
        onAdd={async (e: any) => {
          e.preventDefault()
          if (!newDistName.trim()) return
          setDistLoading(true)
          try {
            const res = await fetch("/api/categories", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ name: newDistName, type: "distribution" }),
            })
            if (res.ok) { setNewDistName(""); fetchDistributions() }
          } finally { setDistLoading(false) }
        }}
        onDelete={async (id: string) => {
          if (!await confirm({ title: "Delete Distribution", message: "Are you sure?", type: "warning" })) return
          await fetch(`/api/categories/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
          fetchDistributions()
        }}
        onUpdate={async (id: string, newName: string) => {
          await fetch(`/api/categories/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name: newName }),
          })
          fetchDistributions()
        }}
        loading={distLoading}
        title="Manage Distributions"
        value={newDistName}
        onChange={setNewDistName}
        t={t}
      />

      {/* QR Code Modal */}
      {showQrModal && qrDataUrl && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#1a1c1b] border border-white/10 rounded-[2.5rem] shadow-2xl max-w-sm w-full relative overflow-hidden">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-6 right-6 w-10 h-10 bg-[#0f1110] border border-white/5 rounded-xl flex items-center justify-center font-bold text-gray-500 hover:text-white transition-all z-10"
            >
              <X size={18} />
            </button>

            <div className="p-10 flex flex-col items-center">
              <h2 className="text-xl font-playfair italic font-bold text-[#f3cf7a] mb-2 tracking-tight flex items-center justify-center gap-3 w-full">
                <Smartphone size={24} /> Menu QR Code
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-8">Scan to view Digital Menu</p>

              <div className="bg-white p-6 rounded-3xl shadow-[0_0_30px_rgba(255,255,255,0.05)] mb-8">
                <img src={qrDataUrl} alt="Menu QR Code" className="w-56 h-56" />
              </div>

              <p className="text-[10px] font-bold text-gray-600 mb-8 text-center font-mono break-all px-4 opacity-50">
                {typeof window !== 'undefined' ? window.location.origin : 'https://abehotel.vercel.app'}{publicMenuUrl}
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={handleDownloadQr}
                  className="flex-1 bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] font-black py-4 rounded-xl text-[10px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transform active:scale-95"
                >
                  <Download size={16} /> Download
                </button>
                <button
                  onClick={handlePrintQr}
                  className="flex-1 bg-[#0f1110] border border-white/5 text-gray-400 hover:text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  <Printer size={16} /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export CSV Dropdown */}
      {showExportDropdown && (
        <>
          <div
            className="fixed inset-0 z-[200]"
            onClick={() => setShowExportDropdown(false)}
          />
          <div
            className="fixed z-[201] bg-[#1a1c1b] border border-[#d4af37]/20 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] py-2 min-w-[200px] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`
            }}
          >
            <div className="px-4 py-2 mb-1 border-b border-white/5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Export Menu</p>
            </div>
            <button
              onClick={() => handleExportCSV('food')}
              className="w-full px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest hover:bg-[#d4af37]/10 flex items-center gap-3 text-gray-400 hover:text-[#f3cf7a] transition-all"
            >
              <Utensils size={14} />
              <span>Food Only</span>
            </button>
            <button
              onClick={() => handleExportCSV('drinks')}
              className="w-full px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest hover:bg-[#d4af37]/10 flex items-center gap-3 text-gray-400 hover:text-[#f3cf7a] transition-all"
            >
              <Coffee size={14} />
              <span>Drinks Only</span>
            </button>
            <div className="my-1 border-t border-white/5" />
            <button
              onClick={() => handleExportCSV('all')}
              className="w-full px-4 py-3.5 text-left text-[10px] font-black uppercase tracking-widest hover:bg-[#d4af37]/20 flex items-center gap-3 text-[#f3cf7a] transition-all"
            >
              <Hash size={14} />
              <span>Complete List</span>
            </button>
          </div>
        </>
      )}
    </>
  )
}

export function CategoryManager({ show, onClose, categories, onAdd, onDelete, onUpdate, loading, title, value, onChange, t }: any) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  if (!show) return null

  const handleStartEdit = (cat: any) => {
    setEditingId(cat._id)
    setEditValue(cat.name)
  }

  const handleSaveEdit = async (id: string) => {
    if (!editValue.trim()) return
    await onUpdate(id, editValue)
    setEditingId(null)
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#1a1c1b] border border-white/10 rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-24 h-24 bg-[#d4af37]/5 rounded-full blur-2xl" />
        
        <div className="flex justify-between items-center mb-8 relative z-10">
          <h2 className="text-xl font-playfair italic font-bold text-[#f3cf7a]">{title}</h2>
          <button onClick={onClose} className="w-10 h-10 bg-[#0f1110] rounded-xl flex items-center justify-center text-gray-500 hover:text-white transition-all"><X size={20} /></button>
        </div>

        <form onSubmit={onAdd} className="mb-8 relative z-10">
          <div className="flex gap-2 p-1.5 bg-[#0f1110] border border-white/5 rounded-2xl shadow-inner">
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={t("adminMenu.newCatPlaceholder")}
              className="flex-1 bg-transparent px-4 py-3 text-sm font-bold text-white outline-none placeholder-gray-700"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 shadow-lg transform active:scale-95"
            >
              {t("adminMenu.add")}
            </button>
          </div>
        </form>

        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 scrollbar-hide relative z-10">
          {categories.map((cat: any) => (
            <div key={cat._id} className="flex justify-between items-center bg-[#0f1110]/50 border border-white/5 p-4 rounded-2xl gap-4 group hover:border-[#d4af37]/20 transition-all">
              {editingId === cat._id ? (
                <div className="flex-1 flex gap-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 bg-[#0f1110] border border-[#d4af37]/30 rounded-xl px-4 py-2 text-sm font-bold text-white outline-none"
                    autoFocus
                  />
                  <button onClick={() => handleSaveEdit(cat._id)} className="text-emerald-500 hover:scale-110 transition-transform"><Check size={20} /></button>
                  <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-red-400"><X size={20} /></button>
                </div>
              ) : (
                <>
                  <span className="font-bold text-gray-400 text-sm flex-1 group-hover:text-white transition-colors">{cat.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleStartEdit(cat)}
                      className="w-9 h-9 bg-[#0f1110] border border-white/5 flex items-center justify-center rounded-xl text-gray-500 hover:text-[#d4af37] hover:border-[#d4af37]/30 transition-all"
                      title="Rename"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(cat._id)}
                      className="w-9 h-9 bg-[#0f1110] border border-white/5 flex items-center justify-center rounded-xl text-gray-500 hover:text-red-500 hover:border-red-500/30 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <div className="text-center py-10 opacity-30">
              <Leaf size={40} className="mx-auto mb-2" />
              <p className="text-[10px] font-black uppercase tracking-widest">{t("adminMenu.noCats")}</p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-8 py-4 bg-[#0f1110] border border-white/5 text-gray-500 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all"
        >
          {t("adminMenu.close")}
        </button>
      </div>
    </div>
  )
}
