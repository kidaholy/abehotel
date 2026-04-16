"use client"

import { useEffect, useState, useRef } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import {
    Plus, Search, Trash2, Edit2, TrendingUp, History,
    Package, BarChart3, AlertCircle, ShoppingCart, Download, ChevronDown
} from "lucide-react"
import { ReportExporter } from "@/lib/export-utils"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

interface StockItem {
    _id: string
    name: string
    category: string
    quantity?: number // Active Stock
    storeQuantity?: number // Store Bulk
    unit: string
    minLimit?: number
    averagePurchasePrice?: number
    unitCost?: number
    trackQuantity: boolean
    showStatus: boolean
    status: 'active' | 'out_of_stock'
    totalInvestment?: number
    totalLifetimeInvestment?: number
    totalPurchased?: number
    totalLifetimePurchased?: number
    totalConsumed?: number
    sellUnitEquivalent?: number
}

export default function StockInventoryPage() {
    const [stockItems, setStockItems] = useState<StockItem[]>([])
    const [loading, setLoading] = useState(true)
    const [editingStock, setEditingStock] = useState<StockItem | null>(null)
    const [showStockForm, setShowStockForm] = useState(false)
    const [saveLoading, setSaveLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [showExportDropdown, setShowExportDropdown] = useState(false)
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })
    const exportButtonRef = useRef<HTMLButtonElement>(null)

    // Dynamic Categories
    const [categories, setCategories] = useState<any[]>([])

    const [stockFormData, setStockFormData] = useState({
        name: "",
        category: "",
        quantity: "",
        unit: "kg",
        minLimit: "",
        totalPurchaseCost: "",
        unitCost: "",
        trackQuantity: true,
        showStatus: true,
    })

    const { token, hasPermission } = useAuth()
    const { t } = useLanguage()
    const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

    useEffect(() => {
        if (token) {
            fetchStockItems()
            fetchCategories()
        }

        const timeout = setTimeout(() => {
            if (loading) setLoading(false)
        }, 10000)

        return () => clearTimeout(timeout)
    }, [token])

    const fetchStockItems = async () => {
        try {
            setLoading(true)
            const response = await fetch("/api/stock?availableOnly=true", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                setStockItems(data)
            }
        } catch (error) {
            console.error("Error fetching stock:", error)
        } finally {
            setLoading(false)
        }
    }

    const fetchCategories = async () => {
        try {
            const response = await fetch("/api/categories?type=stock", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                setCategories(data)
                if (data.length > 0 && !stockFormData.category) {
                    setStockFormData(prev => ({ ...prev, category: data[0].name }))
                }
            }
        } catch (error) {
            console.error("Error fetching categories:", error)
        }
    }

    const handleSaveStock = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaveLoading(true)
        try {
            const url = editingStock ? `/api/stock/${editingStock._id}` : "/api/stock"
            const method = editingStock ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...stockFormData,
                    quantity: stockFormData.quantity === "" ? undefined : Number(stockFormData.quantity),
                    minLimit: stockFormData.minLimit === "" ? undefined : Number(stockFormData.minLimit),
                    unitCost: stockFormData.unitCost === "" ? undefined : Number(stockFormData.unitCost),
                }),
            })

            if (response.ok) {
                fetchStockItems()
                resetStockForm()
                notify({
                    title: "Stock Updated",
                    message: "Stock item details have been saved.",
                    type: "success"
                })
            }
        } catch (error) {
            console.error("Error saving stock:", error)
        } finally {
            setSaveLoading(false)
        }
    }

    const deleteStockItem = async (id: string | undefined) => {
        if (!id) return
        const confirmed = await confirm({
            title: "Delete Stock Item",
            message: "This will remove the item from the POS (Active Stock) list. If the item still has quantity in the Store, the master record will be kept.",
            type: "danger"
        })

        if (!confirmed) return
        try {
            const response = await fetch(`/api/stock/${id}?source=stock`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) fetchStockItems()
        } catch (error) {
            console.error(error)
        }
    }

    const handleEditStock = (item: StockItem) => {
        setEditingStock(item)
        setStockFormData({
            name: item.name,
            category: item.category,
            quantity: item.quantity?.toString() || "0",
            unit: item.unit,
            minLimit: item.minLimit?.toString() || "",
            totalPurchaseCost: item.totalInvestment?.toString() || "",
            unitCost: item.unitCost?.toString() || "",
            trackQuantity: item.trackQuantity,
            showStatus: item.showStatus,
        })
        setShowStockForm(true)
    }

    const resetStockForm = () => {
        setStockFormData({
            name: "",
            category: "meat",
            quantity: "0",
            unit: "kg",
            minLimit: "",
            totalPurchaseCost: "",
            unitCost: "",
            trackQuantity: true,
            showStatus: true,
        })
        setEditingStock(null)
        setShowStockForm(false)
    }

    const filteredStock = stockItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const stats = {
        totalValue: stockItems.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitCost || 0)), 0),
        lowStock: stockItems.filter(item => item.trackQuantity && (item.quantity || 0) <= (item.minLimit || 0)).length,
        totalInStore: stockItems.reduce((sum, item) => sum + (item.storeQuantity || 0), 0),
        totalItems: stockItems.length
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

    const exportStockCSV = (exportType: 'all' | 'low' | 'ready' | 'empty' = 'all') => {
        let itemsToExport = [...filteredStock]
        let fileName = 'Stock Inventory Report'

        if (exportType === 'low') {
            itemsToExport = filteredStock.filter(item =>
                item.trackQuantity &&
                (item.quantity || 0) <= (item.minLimit || 0) &&
                (item.quantity || 0) > 0
            )
            fileName = 'Low Stock Report'
        } else if (exportType === 'empty') {
            itemsToExport = filteredStock.filter(item =>
                item.trackQuantity && (item.quantity || 0) <= 0
            )
            fileName = 'Empty Stock Report'
        } else if (exportType === 'ready') {
            itemsToExport = filteredStock.filter(item =>
                !item.trackQuantity || (item.quantity || 0) > (item.minLimit || 0)
            )
            fileName = 'Ready Stock Report'
        }

        if (itemsToExport.length === 0) {
            notify({
                title: "No Items",
                message: "No items to export for this category.",
                type: "info"
            })
            setShowExportDropdown(false)
            return
        }

        const headers = ['Item Name', 'Category', 'Quantity', 'Unit', 'Status', 'Min Limit', 'Unit Cost', 'Total Value']
        const data = itemsToExport.map(item => {
            const isOut = item.trackQuantity && (item.quantity || 0) <= 0
            const isLow = item.trackQuantity && (item.quantity || 0) <= (item.minLimit || 0) && (item.quantity || 0) > 0
            const status = isOut ? 'Empty' : isLow ? 'Low Stock' : 'Ready'
            const totalValue = ((item.quantity || 0) * (item.unitCost || 0)).toFixed(2)

            return {
                'Item Name': item.name,
                'Category': item.category,
                'Quantity': (item.quantity || 0).toLocaleString(),
                'Unit': item.unit,
                'Status': status,
                'Min Limit': item.minLimit || '',
                'Unit Cost': item.unitCost || '',
                'Total Value': `${totalValue} Br`
            }
        })

        ReportExporter.exportToCSV({
            title: fileName,
            period: new Date().toLocaleDateString(),
            headers,
            data
        })

        setShowExportDropdown(false)
        notify({
            title: "Export Complete",
            message: `Exported ${itemsToExport.length} items to CSV.`,
            type: "success"
        })
    }

    return (
        <ProtectedRoute requiredRoles={["admin"]} requiredPermissions={["stock:view"]}>
            <div className="min-h-screen bg-[#0f1110] p-6 text-white selection:bg-[#c5a059] selection:text-[#0f1110]">
                <div className="max-w-7xl mx-auto space-y-6">
                    <BentoNavbar />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Status Sidebar */}
                        <div className="lg:col-span-3 space-y-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#151716] rounded-xl p-6 shadow-sm border border-white/5">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-[#f3cf7a] mb-6 flex items-center gap-3">
                                    <BarChart3 className="w-3 h-3" /> Quick Stats
                                </h3>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-2xl font-black text-white">{stats.totalValue.toLocaleString()} <span className="text-[10px] text-gray-500">Br</span></p>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">POS Inventory Value</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
                                        <div className="p-3 bg-[#1a2e20] rounded-xl border border-[#4ade80]/20">
                                            <p className="text-xl font-black text-[#4ade80]">{stats.totalInStore.toLocaleString()}</p>
                                            <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">In Store</p>
                                        </div>
                                        <div className="p-3 bg-[#b38822]/10 rounded-xl border border-[#d4af37]/20">
                                            <p className="text-xl font-black text-[#f3cf7a]">{stats.lowStock}</p>
                                            <p className="text-[8px] font-bold text-[#d4af37] uppercase tracking-widest">Low</p>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            <Link href="/admin/store" className="block p-6 bg-gradient-to-br from-[#d4af37] to-[#f3cf7a] rounded-xl text-[#0f1110] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all group border border-[#f3cf7a]/50 relative overflow-hidden">
                                <div className="absolute -right-4 -bottom-4 opacity-10 transform group-hover:scale-110 transition-transform duration-500">
                                    <Package className="w-32 h-32" />
                                </div>
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <Package className="w-6 h-6 opacity-80" />
                                    <TrendingUp className="w-4 h-4 opacity-60 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </div>
                                <h3 className="font-playfair italic font-bold text-xl leading-tight relative z-10">Need to Restock?</h3>
                                <p className="text-[11px] font-medium text-[#0f1110]/70 mt-2 relative z-10">Go to store to transfer items from bulk storage.</p>
                                <div className="mt-4 flex items-center gap-2 font-black text-[10px] uppercase tracking-widest relative z-10">
                                    Open Store <Plus className="w-3 h-3" />
                                </div>
                            </Link>
                        </div>

                        {/* Main Inventory */}
                        <div className="lg:col-span-9 space-y-4">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-playfair italic text-[#f3cf7a] flex items-center gap-3">
                                        <ShoppingCart className="w-6 h-6 text-[#d4af37]" /> Active Stock
                                    </h2>
                                    <p className="text-gray-500 text-sm font-light mt-1">Inventory currently available for POS sales.</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-64 group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#f3cf7a] transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Search stock..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-[#151716] text-white rounded-2xl border border-white/10 outline-none font-bold text-sm shadow-sm focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 placeholder-gray-600 transition-all"
                                        />
                                    </div>
                                    <button
                                        ref={exportButtonRef}
                                        onClick={handleExportDropdownToggle}
                                        className="bg-[#151716] text-[#f3cf7a] border border-[#d4af37]/30 px-4 py-3 rounded-2xl shadow-sm hover:bg-[#1a1c1b] transition-colors flex items-center gap-2 whitespace-nowrap"
                                    >
                                        <Download size={16} />
                                        <span className="font-bold text-[10px] uppercase tracking-widest hidden sm:inline">Export CSV</span>
                                        <ChevronDown size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className="bg-[#151716] rounded-2xl border border-white/5 overflow-hidden min-h-[500px]">
                                {loading ? (
                                    <div className="py-24 flex flex-col items-center opacity-20">
                                        <History className="w-12 h-12 animate-spin-slow mb-4 text-[#f3cf7a]" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-[#f3cf7a]">Loading...</p>
                                    </div>
                                ) : filteredStock.length === 0 ? (
                                    <div className="py-24 flex flex-col items-center justify-center text-gray-500">
                                        <Package className="w-12 h-12 mb-4 opacity-20 text-[#f3cf7a]" />
                                        <p className="font-bold text-center text-gray-400">Your active stock is empty.<br />Transfer items from the Store to make them available for POS.</p>
                                        <Link href="/admin/store" className="mt-6 px-6 py-2 bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] rounded-xl text-[10px] uppercase tracking-widest font-bold shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all">Go to Store</Link>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-[#0f1110]/50">
                                                    <th className="py-4 pl-6">Item</th>
                                                    <th className="py-4">Category</th>
                                                    <th className="py-4">Active Stock</th>
                                                    <th className="py-4">Status</th>
                                                    <th className="py-4 text-right pr-6">Management</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {filteredStock.map((item) => {
                                                    const isLow = item.trackQuantity && (item.quantity || 0) <= (item.minLimit || 0) && (item.quantity || 0) > 0;
                                                    const isOut = item.trackQuantity && (item.quantity || 0) <= 0;
                                                    return (
                                                        <tr key={item._id} className="group hover:bg-[#1a1c1b] transition-colors">
                                                            <td className="py-5 pl-6 font-playfair italic font-bold text-[#f3cf7a] text-lg">{item.name}</td>
                                                            <td className="py-5 text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.category}</td>
                                                            <td className="py-5">
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className={`text-xl font-black ${isOut ? 'text-red-500' : isLow ? 'text-[#f3cf7a]' : 'text-emerald-400'}`}>
                                                                        {(item.quantity || 0).toLocaleString()}
                                                                    </span>
                                                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{item.unit}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-5">
                                                                {isOut ? (
                                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-red-500 bg-red-950/30 border border-red-500/20 px-2 py-1 rounded-md">Empty</span>
                                                                ) : isLow ? (
                                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#f3cf7a] bg-[#b38822]/10 border border-[#d4af37]/20 px-2 py-1 rounded-md">Low Stock</span>
                                                                ) : (
                                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 bg-[#1a2e20] border border-[#4ade80]/20 px-2 py-1 rounded-md">Ready</span>
                                                                )}
                                                            </td>
                                                            <td className="py-5 text-right pr-6">
                                                                <div className="flex justify-end gap-2">
                                                                    {hasPermission("stock:update") && <button onClick={() => handleEditStock(item)} className="p-2 text-[#f3cf7a] hover:text-[#f3cf7a] hover:bg-[#1a1c1b] border border-[#d4af37]/30 hover:border-[#d4af37]/50 rounded-lg transition-all"><Edit2 size={16} /></button>}
                                                                    {hasPermission("stock:delete") && <button onClick={() => deleteStockItem(item._id)} className="p-2 text-red-500 hover:text-red-400 hover:bg-red-950/50 border border-red-500/30 hover:border-red-500/50 rounded-lg transition-all"><Trash2 size={16} /></button>}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <AnimatePresence>
                    {showStockForm && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetStockForm} className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />
                            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="relative bg-[#151716] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl">
                                <h2 className="text-xl font-playfair italic text-[#f3cf7a] mb-6">{editingStock ? 'Edit Active Stock' : 'Add New Item'}</h2>
                                <form onSubmit={handleSaveStock} className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Item Name</label>
                                        <input type="text" value={stockFormData.name} readOnly className="w-full p-4 bg-[#0f1110] border border-white/5 rounded-xl font-bold text-gray-500 outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Active Qty</label>
                                            <input type="number" value={stockFormData.quantity} onChange={e => setStockFormData({ ...stockFormData, quantity: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-black text-xl text-[#d4af37] outline-none focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Alert Limit</label>
                                            <input type="number" step="any" value={stockFormData.minLimit} onChange={e => setStockFormData({ ...stockFormData, minLimit: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-bold text-white outline-none focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 transition-all" />
                                        </div>
                                    </div>
                                    <div className="flex gap-4 pt-6">
                                        <button type="button" onClick={resetStockForm} className="flex-1 py-4 font-bold text-[10px] uppercase tracking-widest text-gray-500 hover:text-white transition-colors bg-[#0f1110] rounded-xl border border-white/5 hover:border-white/20">Cancel</button>
                                        <button type="submit" disabled={saveLoading} className="flex-[2] py-4 bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(212,175,55,0.2)] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all">
                                            {saveLoading ? "Saving..." : "Update Stock"}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Export CSV Dropdown - Rendered at root level to avoid clipping */}
                {showExportDropdown && (
                    <>
                        <div
                            className="fixed inset-0 z-[200]"
                            onClick={() => setShowExportDropdown(false)}
                        />
                        <div
                            className="fixed z-[201] bg-[#151716] rounded-2xl shadow-2xl border border-[#d4af37]/30 py-2 min-w-[170px] overflow-hidden"
                            style={{
                                top: `${dropdownPosition.top}px`,
                                left: `${dropdownPosition.left}px`
                            }}
                        >
                            <button
                                onClick={() => exportStockCSV('all')}
                                className="w-full px-4 py-3 text-left text-[11px] hover:bg-[#1a1c1b] flex items-center gap-3 text-white font-bold transition-all uppercase tracking-widest"
                            >
                                <span className="text-lg">📦</span>
                                <span>All Stock</span>
                            </button>
                            <div className="my-1 border-t border-white/5 mx-2" />
                            <button
                                onClick={() => exportStockCSV('ready')}
                                className="w-full px-4 py-3 text-left text-[11px] hover:bg-[#1a1c1b] flex items-center gap-3 text-white font-medium transition-all uppercase tracking-widest"
                            >
                                <span className="text-lg">✅</span>
                                <span>Ready Stock</span>
                            </button>
                            <button
                                onClick={() => exportStockCSV('low')}
                                className="w-full px-4 py-3 text-left text-[11px] hover:bg-[#1a1c1b] flex items-center gap-3 text-white font-medium transition-all uppercase tracking-widest"
                            >
                                <span className="text-lg">⚠️</span>
                                <span>Low Stock</span>
                            </button>
                            <button
                                onClick={() => exportStockCSV('empty')}
                                className="w-full px-4 py-3 text-left text-[11px] hover:bg-[#1a1c1b] flex items-center gap-3 text-white font-medium transition-all uppercase tracking-widest"
                            >
                                <span className="text-lg">❌</span>
                                <span>Empty Stock</span>
                            </button>
                        </div>
                    </>
                )}

                <ConfirmationCard isOpen={confirmationState.isOpen} onClose={closeConfirmation} onConfirm={confirmationState.onConfirm} title={confirmationState.options.title} message={confirmationState.options.message} type={confirmationState.options.type} />
                <NotificationCard isOpen={notificationState.isOpen} onClose={closeNotification} title={notificationState.options.title} message={notificationState.options.message} type={notificationState.options.type} />
            </div>
        </ProtectedRoute>
    )
}
