"use client"

import { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import {
    Plus, Search, Trash2, Edit2, Calendar,
    DollarSign, TrendingUp, History,
    ChevronRight, Package, PlusCircle,
    Wrench, AlertTriangle, ChevronDown, ChevronUp,
    ArrowRightLeft, Check, X as CloseIcon, Clock,
    CheckCircle2, XCircle, Filter, Download, Wine, Tag
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { ReportExporter } from "@/lib/export-utils"

interface TransferRequest {
    _id: string
    stockId: { _id: string; name: string; unit: string; storeQuantity: number; quantity: number; category?: string }
    quantity: number
    status: 'pending' | 'approved' | 'denied'
    requestedBy: { name: string }
    handledBy?: { name: string }
    denialReason?: string
    notes?: string
    createdAt: string
    updatedAt: string
}

interface DailyExpense {
    _id: string
    date: string
    otherExpenses: number
    items: Array<{ name: string; amount: number; quantity: number; unit: string }>
    description?: string
    createdAt: string
    updatedAt: string
}

interface OperationalExpense {
    _id: string
    name?: string
    date: string
    category: string
    amount: number
    description: string
    createdAt: string
    updatedAt: string
}

interface StockItem {
    _id: string
    name: string
    category: string
    quantity?: number // Active Stock
    storeQuantity?: number // Store Bulk
    unit: string
    minLimit?: number
    storeMinLimit?: number
    averagePurchasePrice?: number
    unitCost?: number
    trackQuantity: boolean
    showStatus: boolean
    status: 'active' | 'out_of_stock'
    totalInvestment?: number
    totalLifetimeInvestment?: number
    totalPurchased?: number
    totalLifetimePurchased?: number
    totalPurchaseCost?: number
    totalConsumed?: number
    sellUnitEquivalent: number
    isVIP: boolean
    vipLevel: 1 | 2
}

interface FixedAsset {
    _id: string
    name: string
    category: string
    quantity: number
    unitPrice: number
    totalValue: number
    totalInvested: number
    purchaseDate: string
    status: 'active' | 'partially_dismissed' | 'fully_dismissed'
    notes?: string
    dismissals: Array<{
        _id?: string
        date: string
        quantity: number
        reason: string
        valueLost: number
    }>
}

export default function StorePage() {
    const { token, user, hasPermission } = useAuth()
    const [activeTab, setActiveTab] = useState<"inventory" | "categories" | "fixed-assets" | "expenses" | "transfers">("inventory")

    useEffect(() => {
        if (user?.role === "store_keeper") {
            setActiveTab("transfers")
        }
    }, [user])
    const [operationalExpenses, setOperationalExpenses] = useState<OperationalExpense[]>([])
    const [stockItems, setStockItems] = useState<StockItem[]>([])
    const [loading, setLoading] = useState(true)
    const [showStockForm, setShowStockForm] = useState(false)
    const [editingOperationalExpense, setEditingOperationalExpense] = useState<OperationalExpense | null>(null)
    const [editingStock, setEditingStock] = useState<StockItem | null>(null)
    const [editingCategory, setEditingCategory] = useState<any | null>(null)
    const [newCategory, setNewCategory] = useState({ name: "" })
    const [saveLoading, setSaveLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [showOperationalExpenseForm, setShowOperationalExpenseForm] = useState(false)
    const [expenseDateFilter, setExpenseDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today')

    const [showRestockModal, setShowRestockModal] = useState(false)
    const [restockingItem, setRestockingItem] = useState<StockItem | null>(null)
    const [restockAmount, setRestockAmount] = useState("")
    const [newTotalCost, setNewTotalCost] = useState("")
    const [newUnitCost, setNewUnitCost] = useState("")

    // Dynamic Categories
    const [categories, setCategories] = useState<any[]>([])

    // Transfer from Store to Stock
    const [showTransferModal, setShowTransferModal] = useState(false)
    const [transferringItem, setTransferringItem] = useState<StockItem | null>(null)
    const [transferAmount, setTransferAmount] = useState("")

    // Fixed Assets State
    const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>([])
    const [assetCategories, setAssetCategories] = useState<any[]>([])
    const [expenseCategories, setExpenseCategories] = useState<any[]>([])
    const [showAssetForm, setShowAssetForm] = useState(false)
    const [editingAsset, setEditingAsset] = useState<FixedAsset | null>(null)
    const [categoryType, setCategoryType] = useState<'stock' | 'fixed-asset' | 'expense'>('stock')
    const [showDismissModal, setShowDismissModal] = useState(false)
    const [dismissingAsset, setDismissingAsset] = useState<FixedAsset | null>(null)
    const [dismissReason, setDismissReason] = useState("")
    const [dismissQuantity, setDismissQuantity] = useState("")
    const [dismissValue, setDismissValue] = useState("")
    const [expandedAsset, setExpandedAsset] = useState<string | null>(null)

    // Transfer requests state
    const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([])
    const [transfersLoading, setTransfersLoading] = useState(false)
    const [transferFilterStatus, setTransferFilterStatus] = useState("all")
    const [transferSearch, setTransferSearch] = useState("")
    const [denialModal, setDenialModal] = useState<{ isOpen: boolean; requestId: string; reason: string }>({ isOpen: false, requestId: "", reason: "" })
    const [assetFormData, setAssetFormData] = useState({
        name: "",
        category: assetCategories.length > 0 ? assetCategories[0].name : "",
        quantity: "",
        unitPrice: "",
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: ""
    })


    const [operationalExpenseFormData, setOperationalExpenseFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        name: "",
        category: "",
        amount: "",
        description: ""
    })

    const [stockFormData, setStockFormData] = useState({
        name: "",
        category: "",
        quantity: "",
        unit: "kg",
        minLimit: "",
        storeMinLimit: "",
        unitPurchasedPrice: "",
        unitCost: "",
        trackQuantity: true,
        showStatus: true,
    })

    const { t } = useLanguage()
    const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

    useEffect(() => {
        if (token) {
            fetchStockItems()
            fetchOperationalExpenses()
            fetchCategories()
            fetchAssetCategories()
            fetchExpenseCategories()
            fetchFixedAssets()
            fetchTransferRequests()
        }

        const timeout = setTimeout(() => {
            if (loading) {
                setLoading(false)
            }
        }, 10000)

        return () => clearTimeout(timeout)
    }, [token])

    const fetchStockItems = async () => {
        try {
            setLoading(true)
            const response = await fetch("/api/stock", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                setStockItems(data)
            }
        } catch (error) {
            console.error("Error fetching stock:", String(error))
        } finally {
            setLoading(false)
        }
    }


    const fetchOperationalExpenses = async (period: string = expenseDateFilter) => {
        try {
            const response = await fetch(`/api/operational-expenses?period=${period}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                setOperationalExpenses(data)
            }
        } catch (error) {
            console.error("Error fetching operational expenses:", String(error))
        }
    }

    useEffect(() => {
        if (token && activeTab === 'expenses') {
            fetchOperationalExpenses(expenseDateFilter)
        }
    }, [token, activeTab, expenseDateFilter])

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
            console.error("Error fetching categories:", String(error))
        }
    }

    const fetchAssetCategories = async () => {
        try {
            const response = await fetch("/api/categories?type=fixed-asset", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                setAssetCategories(data)
                if (data.length > 0 && !assetFormData.category) {
                    setAssetFormData(prev => ({ ...prev, category: data[0].name }))
                }
            }
        } catch (error) {
            console.error("Error fetching asset categories:", String(error))
        }
    }

    const fetchExpenseCategories = async () => {
        try {
            const response = await fetch("/api/categories?type=expense", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                setExpenseCategories(data)
                if (data.length > 0 && !operationalExpenseFormData.category) {
                    setOperationalExpenseFormData(prev => ({ ...prev, category: data[0].name }))
                }
            }
        } catch (error) {
            console.error("Error fetching expense categories:", String(error))
        }
    }

    const fetchFixedAssets = async () => {
        try {
            const response = await fetch("/api/fixed-assets", {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                setFixedAssets(data)
            }
        } catch (error) {
            console.error("Error fetching fixed assets:", String(error))
        }
    }

    const handleSaveAsset = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaveLoading(true)
        try {
            const url = editingAsset ? `/api/fixed-assets/${editingAsset._id}` : "/api/fixed-assets"
            const method = editingAsset ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: assetFormData.name,
                    category: assetFormData.category,
                    quantity: Number(assetFormData.quantity),
                    unitPrice: Number(assetFormData.unitPrice),
                    purchaseDate: assetFormData.purchaseDate,
                    notes: assetFormData.notes
                }),
            })

            if (response.ok) {
                fetchFixedAssets()
                fetchAssetCategories()
                resetAssetForm()
                notify({
                    title: editingAsset ? "Asset Updated" : "Asset Added",
                    message: editingAsset ? "Fixed asset has been updated." : "New fixed asset has been added.",
                    type: "success"
                })
            } else {
                const data = await response.json()
                notify({ title: "Save Failed", message: data.message || "Failed to save asset", type: "error" })
            }
        } catch (error) {
            console.error("Error saving asset:", String(error))
        } finally {
            setSaveLoading(false)
        }
    }

    const handleDismissSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!dismissingAsset) return
        setSaveLoading(true)
        try {
            const qty = Number(dismissQuantity)
            const val = dismissValue ? Number(dismissValue) : qty * dismissingAsset.unitPrice

            const response = await fetch(`/api/fixed-assets/${dismissingAsset._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: 'dismiss',
                    quantity: qty,
                    reason: dismissReason,
                    valueLost: val
                }),
            })

            if (response.ok) {
                const data = await response.json()
                fetchFixedAssets()
                setShowDismissModal(false)
                setDismissingAsset(null)
                setDismissReason("")
                setDismissQuantity("")
                setDismissValue("")
                notify({
                    title: "Asset Dismissed",
                    message: data.message || "Asset has been dismissed.",
                    type: "success"
                })
            } else {
                const data = await response.json()
                notify({ title: "Dismiss Failed", message: data.message || "Failed to dismiss asset.", type: "error" })
            }
        } catch (error) {
            console.error("Error dismissing asset:", String(error))
        } finally {
            setSaveLoading(false)
        }
    }

    const deleteFixedAsset = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Fixed Asset",
            message: "Are you sure you want to permanently delete this asset?\n\nThis action cannot be undone.",
            type: "danger",
            confirmText: "Delete Asset",
            cancelText: "Cancel"
        })
        if (!confirmed) return
        try {
            const response = await fetch(`/api/fixed-assets/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                fetchFixedAssets()
                notify({ title: "Asset Deleted", message: "Fixed asset has been removed.", type: "success" })
            }
        } catch (error) {
            console.error("Error deleting asset:", String(error))
        }
    }

    const openDismissModal = (asset: FixedAsset) => {
        setDismissingAsset(asset)
        setDismissQuantity("1")
        setDismissValue((asset.unitPrice).toString())
        setDismissReason("")
        setShowDismissModal(true)
    }

    const handleEditAsset = (asset: FixedAsset) => {
        setEditingAsset(asset)
        setAssetFormData({
            name: asset.name,
            category: asset.category,
            quantity: asset.quantity.toString(),
            unitPrice: asset.unitPrice.toString(),
            purchaseDate: new Date(asset.purchaseDate).toISOString().split('T')[0],
            notes: asset.notes || ""
        })
        setShowAssetForm(true)
    }

    const resetAssetForm = () => {
        setAssetFormData({
            name: "",
            category: assetCategories.length > 0 ? assetCategories[0].name : "",
            quantity: "",
            unitPrice: "",
            purchaseDate: new Date().toISOString().split('T')[0],
            notes: ""
        })
        setEditingAsset(null)
        setShowAssetForm(false)
    }

    const handleSaveCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaveLoading(true)
        try {
            const url = editingCategory ? `/api/categories/${editingCategory._id}` : "/api/categories"
            const method = editingCategory ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: newCategory.name,
                    type: categoryType
                }),
            })

            if (response.ok) {
                fetchCategories()
                fetchAssetCategories()
                fetchExpenseCategories()
                setNewCategory({ name: "" })
                setEditingCategory(null)
                notify({
                    title: editingCategory ? "Category Updated" : "Category Added",
                    message: `${categoryType === 'stock' ? 'Stock' : 'Fixed Asset'} category has been saved successfully.`,
                    type: "success"
                })
            }
        } catch (error) {
            console.error("Error saving category:", String(error))
        } finally {
            setSaveLoading(false)
        }
    }

    const handleDeleteCategory = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Category",
            message: "Are you sure you want to delete this category?\n\nThis will remove it from the dashboard and summary views.",
            type: "danger"
        })

        if (!confirmed) return
        try {
            const response = await fetch(`/api/categories?id=${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                fetchCategories()
                fetchAssetCategories()
                fetchExpenseCategories()
                notify({
                    title: "Category Deleted",
                    message: "Category has been removed successfully.",
                    type: "success"
                })
            }
        } catch (error) {
            console.error("Error deleting category:", String(error))
        }
    }

    const handleSaveOperationalExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaveLoading(true)
        try {
            const response = await fetch("/api/operational-expenses", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    _id: editingOperationalExpense?._id,
                    ...operationalExpenseFormData,
                    amount: Number(operationalExpenseFormData.amount)
                }),
            })

            if (response.ok) {
                fetchOperationalExpenses()
                resetOperationalExpenseForm()
                notify({
                    title: editingOperationalExpense ? "Expense Updated" : "Expense Saved",
                    message: "Operational expense has been saved successfully.",
                    type: "success"
                })
            } else {
                const data = await response.json()
                notify({ title: "Save Failed", message: data.message || "Failed to save expense", type: "error" })
            }
        } catch (error) {
            console.error("Error saving operational expense:", String(error))
        } finally {
            setSaveLoading(false)
        }
    }

    const handleEditOperationalExpense = (expense: OperationalExpense) => {
        setEditingOperationalExpense(expense)
        setOperationalExpenseFormData({
            date: new Date(expense.date).toISOString().split('T')[0],
            name: expense.name || "",
            category: expense.category,
            amount: expense.amount.toString(),
            description: expense.description || ""
        })
        setShowOperationalExpenseForm(true)
    }

    const deleteOperationalExpense = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Expense",
            message: "Are you sure you want to delete this expense record?",
            type: "danger"
        })
        if (!confirmed) return
        try {
            const response = await fetch(`/api/operational-expenses?id=${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                fetchOperationalExpenses()
                notify({ title: "Expense Deleted", message: "Expense record has been removed.", type: "success" })
            }
        } catch (error) {
            console.error("Error deleting operational expense:", String(error))
        }
    }


    const handleSaveStock = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaveLoading(true)
        try {
            const url = editingStock ? `/api/stock/${editingStock._id}` : "/api/stock"
            const method = editingStock ? "PUT" : "POST"

            const { quantity, minLimit, storeMinLimit, unitCost, unitPurchasedPrice, ...rest } = stockFormData
            
            const qty = quantity === "" ? 0 : Number(quantity)
            const unitPrice = unitPurchasedPrice === "" ? 0 : Number(unitPurchasedPrice)
            const totalCost = qty * unitPrice // Calculate total cost from quantity and unit price
            
            const payload = {
                ...rest,
                storeQuantity: qty || undefined,
                minLimit: minLimit === "" ? undefined : Number(minLimit),
                storeMinLimit: storeMinLimit === "" ? undefined : Number(storeMinLimit),
                unitCost: unitCost === "" ? undefined : Number(unitCost),
                totalPurchaseCost: totalCost || undefined,
                averagePurchasePrice: unitPurchasedPrice === "" ? undefined : Number(unitPurchasedPrice),
            }
            
            console.log('🔍 Sending payload:', payload)
            
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            })

            if (response.ok) {
                fetchStockItems()
                resetStockForm()
                notify({
                    title: editingStock ? "Store Item Updated" : "Store Item Added",
                    message: editingStock ? "Item has been updated successfully." : "New item has been added to store.",
                    type: "success"
                })
            } else {
                const data = await response.json()
                notify({
                    title: "Save Failed",
                    message: data.message || "Failed to save item",
                    type: "error"
                })
            }
        } catch (error) {
            console.error("Error saving stock:", String(error))
        } finally {
            setSaveLoading(false)
        }
    }

    const deleteStockItem = async (id: string) => {
        const confirmed = await confirm({
            title: "Delete Store Item",
            message: "Are you sure you want to delete this item from store?\n\nThis will only remove it from Store inventory. Active stock in POS will remain.",
            type: "danger",
            confirmText: "Delete Item",
            cancelText: "Cancel"
        })

        if (!confirmed) return
        try {
            const response = await fetch(`/api/stock/${id}?source=store`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.ok) {
                const data = await response.json()
                fetchStockItems()
                notify({
                    title: "Store Item Deleted",
                    message: data.message || "Item removed from store successfully.",
                    type: "success"
                })
            }
        } catch (error) {
            console.error("Error deleting stock:", String(error))
        }
    }

    const handleRestockSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!restockingItem) return

        setSaveLoading(true)
        try {
            const addedAmount = Number(restockAmount)
            const totalCost = Number(newTotalCost)
            const sellingPrice = newUnitCost ? Number(newUnitCost) : restockingItem.unitCost

            const response = await fetch(`/api/stock/${restockingItem._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: 'restock',
                    quantityAdded: addedAmount,
                    totalPurchaseCost: totalCost,
                    newUnitCost: sellingPrice,
                    notes: `Restocked ${addedAmount} ${restockingItem.unit} for total cost ${totalCost} Br`
                }),
            })

            if (response.ok) {
                const data = await response.json()
                fetchStockItems()
                setShowRestockModal(false)
                setRestockingItem(null)
                setRestockAmount("")
                setNewTotalCost("")
                setNewUnitCost("")
                notify({
                    title: "Store Restocked",
                    message: data.message || `Successfully restocked ${addedAmount} ${restockingItem.unit}`,
                    type: "success"
                })
            } else {
                const errorData = await response.json()
                notify({
                    title: "Restock Failed",
                    message: errorData.message || "Failed to restock item.",
                    type: "error"
                })
            }
        } catch (error) {
            console.error(String(error))
            notify({
                title: "Error",
                message: "An error occurred while restocking.",
                type: "error"
            })
        } finally {
            setSaveLoading(false)
        }
    }

    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!transferringItem) return

        setSaveLoading(true)
        try {
            const amount = Number(transferAmount)
            const isStoreKeeper = user?.role === 'store_keeper'
            const endpoint = isStoreKeeper ? '/api/inventory/transfers' : '/api/store/transfer'

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    stockId: transferringItem._id,
                    quantity: amount,
                    notes: `Transfer of ${amount} ${transferringItem.unit} to stock`
                }),
            })

            if (response.ok) {
                fetchStockItems()
                setShowTransferModal(false)
                setTransferringItem(null)
                setTransferAmount("")
                notify({
                    title: isStoreKeeper ? "Transfer Requested" : "Transfer Successful",
                    message: isStoreKeeper
                        ? `Request for ${amount} ${transferringItem.unit} sent to admin.`
                        : `Moved ${amount} ${transferringItem.unit} to active (POS) stock.`,
                    type: "success"
                })
            } else {
                const errorData = await response.json()
                notify({
                    title: "Transfer Failed",
                    message: errorData.message || "Failed to transfer items.",
                    type: "error"
                })
            }
        } catch (error) {
            console.error(String(error))
            notify({
                title: "Error",
                message: "An error occurred during transfer.",
                type: "error"
            })
        } finally {
            setSaveLoading(false)
        }
    }

    const fetchTransferRequests = async (status?: string) => {
        setTransfersLoading(true)
        try {
            const q = (status || transferFilterStatus) !== "all" ? `?status=${status || transferFilterStatus}` : ""
            const res = await fetch(`/api/inventory/transfers${q}`, { headers: { Authorization: `Bearer ${token}` } })
            if (res.ok) setTransferRequests(await res.json())
        } catch (e) { console.error("Failed to fetch transfers", e) }
        finally { setTransfersLoading(false) }
    }

    const handleTransferAction = async (id: string, action: 'approved' | 'denied', reason?: string) => {
        try {
            const res = await fetch(`/api/admin/inventory/transfers/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action, denialReason: reason })
            })
            if (res.ok) {
                setDenialModal({ isOpen: false, requestId: "", reason: "" })
                fetchTransferRequests()
                notify({ title: action === 'approved' ? "Transfer Approved" : "Request Denied", message: `Transfer request has been ${action}.`, type: action === 'approved' ? "success" : "error" })
            } else {
                const err = await res.json()
                notify({ title: "Action Failed", message: err.message, type: "error" })
            }
        } catch (e) { console.error(`Error during ${action}`, e) }
    }

    const openTransferModal = (item: StockItem) => {
        setTransferringItem(item)
        setTransferAmount("")
        setShowTransferModal(true)
    }

    const handleEditStock = (item: StockItem) => {
        setEditingStock(item)
        setStockFormData({
            name: item.name,
            category: item.category,
            quantity: item.storeQuantity?.toString() || "", // Editing store quantity here in store page
            unit: item.unit,
            minLimit: item.minLimit?.toString() || "",
            storeMinLimit: item.storeMinLimit?.toString() || "",
            unitPurchasedPrice: (item.averagePurchasePrice || 0).toString() || "",
            unitCost: item.unitCost?.toString() || "",
            trackQuantity: item.trackQuantity,
            showStatus: item.showStatus,
        })
        setShowStockForm(true)
    }




    const resetStockForm = () => {
        setStockFormData({
            name: "",
            category: categories.length > 0 ? categories[0].name : "",
            quantity: "",
            unit: "kg",
            minLimit: "",
            storeMinLimit: "",
            unitPurchasedPrice: "",
            unitCost: "",
            trackQuantity: true,
            showStatus: true,
        })
        setEditingStock(null)
        setShowStockForm(false)
    }

    const resetOperationalExpenseForm = () => {
        setOperationalExpenseFormData({
            date: new Date().toISOString().split('T')[0],
            name: "",
            category: expenseCategories.length > 0 ? expenseCategories[0].name : "",
            amount: "",
            description: ""
        })
        setEditingOperationalExpense(null)
        setShowOperationalExpenseForm(false)
    }

    const filteredStock = stockItems.filter(item => {
        const inSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.category.toLowerCase().includes(searchTerm.toLowerCase())
        return inSearch
    })


    const filteredOperationalExpenses = operationalExpenses.filter(e =>
        e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.description || "").toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredOperationalExpensesByDate = operationalExpenses.filter(e => {
        const expDate = new Date(e.date)
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

        const inSearch = e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (e.description || "").toLowerCase().includes(searchTerm.toLowerCase())

        if (!inSearch) return false

        if (expenseDateFilter === 'today') return expDate >= todayStart
        if (expenseDateFilter === 'week') return expDate >= weekStart
        if (expenseDateFilter === 'month') return expDate >= monthStart
        return true
    })

    const filteredFixedAssets = fixedAssets.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.category.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const exportStoreCSV = () => {
        if (stockItems.length === 0) {
            alert("No store inventory data found to export.")
            return
        }

        const data = filteredStock.map((item: any) => {
            const costPrice = item.averagePurchasePrice || item.unitCost || 0
            const storeQty = item.storeQuantity ?? 0
            const activeQty = item.quantity ?? 0
            const totalStoreValue = storeQty * costPrice
            const isLow = item.isLowStoreStock || ((storeQty <= (item.storeMinLimit || 5)) && storeQty > 0)
            return {
                "Item Name": item.name,
                "Category": item.category,
                "Unit": item.unit,
                "Unit Cost (Br)": Math.round(costPrice),
                "In Store": storeQty,
                "Active in Stock": activeQty,
                "Total Store Value (Br)": Math.round(totalStoreValue),
                "Min Limit (POS)": item.minLimit ?? "-",
                "Store Min Limit": item.storeMinLimit ?? "-",
                "Status": isLow ? "Low Stock" : storeQty === 0 ? "Empty" : "OK"
            }
        })

        ReportExporter.exportToCSV({
            title: "Bulk Inventory Report",
            period: "All Items",
            headers: ["Item Name", "Category", "Unit", "Unit Cost (Br)", "In Store", "Active in Stock", "Total Store Value (Br)", "Sell Unit", "Min Limit (POS)", "Store Min Limit", "Status"],
            data
        })
    }

    const exportOperationalExpensesCSV = () => {
        if (!filteredOperationalExpensesByDate || filteredOperationalExpensesByDate.length === 0) {
            alert("No operational expenses found for this period/filter.")
            return
        }

        const data = filteredOperationalExpensesByDate.map((exp: any) => ({
            "Date": new Date(exp.date).toLocaleDateString(),
            "Category": exp.category || "-",
            "Amount": exp.amount ? `${exp.amount.toLocaleString()} Br` : "0 Br",
            "Description": exp.description || "-",
            "Recorded At": new Date(exp.createdAt).toLocaleString()
        }))

        ReportExporter.exportToCSV({
            title: "Operational Expenses Report",
            period: expenseDateFilter === 'all' ? "All Time" : `Current Filter (${expenseDateFilter})`,
            headers: ["Date", "Category", "Amount", "Description", "Recorded At"],
            data
        })
    }

    const exportFixedAssetsCSV = () => {
        if (!filteredFixedAssets || filteredFixedAssets.length === 0) {
            alert("No fixed assets found to export.")
            return
        }

        const data = filteredFixedAssets.map((asset) => {
            const totalDismissed = asset.dismissals?.reduce((sum, d) => sum + d.valueLost, 0) || 0
            return {
                "Asset Name": asset.name,
                "Category": asset.category,
                "Quantity": asset.quantity,
                "Unit Price": `${asset.unitPrice.toLocaleString()} Br`,
                "Total Value": `${asset.totalValue.toLocaleString()} Br`,
                "Value Lost": totalDismissed > 0 ? `-${totalDismissed.toLocaleString()} Br` : "0 Br",
                "Status": asset.status === 'fully_dismissed' ? 'Dismissed' : asset.status === 'partially_dismissed' ? 'Partial' : 'Active',
                "Purchase Date": new Date(asset.purchaseDate).toLocaleDateString(),
                "Notes": asset.notes || "-"
            }
        })

        ReportExporter.exportToCSV({
            title: "Fixed Assets Report",
            period: "Current Filter",
            headers: ["Asset Name", "Category", "Quantity", "Unit Price", "Total Value", "Value Lost", "Status", "Purchase Date", "Notes"],
            data
        })
    }

    const totalStats = {
        storeValue: stockItems.filter(item => (item.storeQuantity ?? 0) > 0).reduce((sum, item) => {
            const storeQty = item.storeQuantity ?? 0
            const unitPrice = item.averagePurchasePrice ?? 0
            const itemValue = storeQty * unitPrice
            if (itemValue > 0) {
                console.log(`📦 ${item.name}: ${storeQty} × ${unitPrice} = ${itemValue}`)
            }
            return sum + itemValue
        }, 0),
        totalStoreInvestment: stockItems.filter(item => (item.storeQuantity ?? 0) > 0).reduce((sum, item) => sum + (item.totalInvestment || 0), 0),
        totalItems: stockItems.length,
        fixedAssetValue: fixedAssets.reduce((sum, a) => sum + (a.totalValue || 0), 0),
        fixedAssetCount: fixedAssets.length
    }
    console.log(`💰 Total Store Value: ${totalStats.storeValue}, Total Items: ${totalStats.totalItems}`)

    return (
        <ProtectedRoute requiredRoles={["admin", "store_keeper"]} requiredPermissions={["store:view"]}>
            <div className="min-h-screen bg-[#0f1110] p-6 text-white selection:bg-[#c5a059] selection:text-[#0f1110]">
                <div className="max-w-7xl mx-auto space-y-6">
                    <BentoNavbar />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Sidebar Stats */}
                        <div className="lg:col-span-4 space-y-4">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-[#151716] rounded-xl p-6 md:p-8 shadow-2xl border border-white/10 text-white overflow-hidden relative group"
                            >
                                <div className="absolute -right-4 -bottom-4 opacity-5 transform group-hover:rotate-12 group-hover:scale-110 transition-transform duration-500">
                                    <Package className="w-48 h-48 text-[#f3cf7a]" />
                                </div>
                                <h2 className="text-[10px] font-bold uppercase tracking-widest mb-6 text-[#f3cf7a]">
                                    Store Valuation
                                </h2>
                                <div className="space-y-6 relative z-10">
                                    <div>
                                        <p className="text-4xl font-playfair italic text-[#f3cf7a]">{totalStats.totalStoreInvestment.toLocaleString()} <span className="text-xs font-sans not-italic text-gray-400 uppercase tracking-widest">ETB</span></p>
                                        <p className="text-[10px] font-light uppercase tracking-widest text-gray-400 mt-1">Value of Bulk Storage</p>
                                    </div>
                                    <div className="pt-4 border-t border-white/5">
                                        <p className="text-xl font-bold text-white">{totalStats.totalItems}</p>
                                        <p className="text-[10px] font-light uppercase tracking-widest text-gray-500">Total SKU Templates</p>
                                    </div>
                                    <div className="pt-4 border-t border-white/5">
                                        <p className="text-xl font-bold text-white">{totalStats.fixedAssetValue.toLocaleString()} <span className="text-xs text-gray-500 uppercase tracking-widest">ETB</span></p>
                                        <p className="text-[10px] font-light uppercase tracking-widest text-gray-500">Fixed Assets ({totalStats.fixedAssetCount})</p>
                                    </div>
                                    <div className="pt-4 border-t border-white/5">
                                        <p className="text-xl font-bold text-white">{operationalExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()} <span className="text-xs text-gray-500 uppercase tracking-widest">ETB</span></p>
                                        <p className="text-[10px] font-light uppercase tracking-widest text-gray-500">Operational Expenses (This Month)</p>
                                    </div>
                                    
                                    {/* DEBUG: Show items contributing to store value */}
                                    <div className="pt-4 border-t border-white/5 bg-[#0f1110] p-3 rounded-lg">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-500 mb-2">DEBUG: Items in Store Value</p>
                                        <div className="space-y-1 text-[8px] text-gray-400">
                                            {stockItems.filter(item => (item.storeQuantity ?? 0) > 0).map(item => (
                                                <div key={item._id} className="flex justify-between">
                                                    <span>{item.name}: {item.storeQuantity} × {item.averagePurchasePrice} = {(item.storeQuantity * item.averagePurchasePrice).toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>

                            {user?.role === "admin" && (
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="bg-[#1a1c1b] rounded-xl p-6 shadow-xl border border-white/10"
                                >
                                    <h2 className="text-xl font-playfair italic text-[#f3cf7a] mb-2">Bulk Actions</h2>
                                    <p className="text-gray-400 font-light text-[10px] uppercase tracking-widest mb-4">Add new items to the store or manage categories.</p>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => { resetStockForm(); setShowStockForm(true); }}
                                            className="w-full bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.4)] transition-all flex items-center justify-center gap-2 transform active:scale-95 border border-[#f5db8b]"
                                        >
                                            <Plus className="w-4 h-4" /> Add New Item
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('categories')}
                                            className="w-full bg-[#151716] text-gray-300 border border-white/10 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#0f1110] hover:text-[#f3cf7a] hover:border-[#d4af37]/30 transition-all flex items-center justify-center gap-2"
                                        >
                                            <PlusCircle className="w-4 h-4" /> Manage Categories
                                        </button>
                                        <button
                                            onClick={() => { resetOperationalExpenseForm(); setShowOperationalExpenseForm(true); }}
                                            className="w-full bg-[#151716] text-gray-300 border border-white/10 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#0f1110] hover:text-red-400 hover:border-red-500/30 transition-all flex items-center justify-center gap-2"
                                        >
                                            <DollarSign className="w-4 h-4" /> Add Op. Expense
                                        </button>
                                        <button
                                            onClick={() => { resetAssetForm(); setShowAssetForm(true); }}
                                            className="w-full bg-[#151716] text-gray-300 border border-white/10 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#0f1110] hover:text-orange-400 hover:border-orange-500/30 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Wrench className="w-4 h-4" /> Add Fixed Asset
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Main Content */}
                        <div className="lg:col-span-8 space-y-4">
                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-playfair italic text-[#f3cf7a]">🏪 Store Management</h2>
                                    <p className="text-gray-400 font-light text-[10px] uppercase tracking-widest mt-1">Bulk inventory and expense management.</p>
                                </div>
                                <div className="flex p-1 bg-[#151716] border border-white/5 rounded-xl">
                                    <button
                                        onClick={() => setActiveTab('inventory')}
                                        className={`px-6 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all ${activeTab === 'inventory' ? 'bg-[#1a1c1b] text-[#f3cf7a] shadow-[0_4px_15px_rgba(212,175,55,0.1)] border border-[#d4af37]/30' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1c1b]'}`}
                                    >
                                        Bulk Inventory
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('fixed-assets')}
                                        className={`px-6 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all ${activeTab === 'fixed-assets' ? 'bg-[#1a1c1b] text-[#f3cf7a] shadow-[0_4px_15px_rgba(212,175,55,0.1)] border border-[#d4af37]/30' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1c1b]'}`}
                                    >
                                        Fixed Assets
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('categories')}
                                        className={`px-6 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all ${activeTab === 'categories' ? 'bg-[#1a1c1b] text-[#f3cf7a] shadow-[0_4px_15px_rgba(212,175,55,0.1)] border border-[#d4af37]/30' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1c1b]'}`}
                                    >
                                        Categories
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('expenses')}
                                        className={`px-6 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all ${activeTab === 'expenses' ? 'bg-[#1a1c1b] text-[#f3cf7a] shadow-[0_4px_15px_rgba(212,175,55,0.1)] border border-[#d4af37]/30' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1c1b]'}`}
                                    >
                                        Operational Expenses
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab('transfers'); fetchTransferRequests(); }}
                                        className={`px-6 py-2 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 ${activeTab === 'transfers' ? 'bg-[#1a1c1b] text-emerald-400 shadow-[0_4px_15px_rgba(52,211,153,0.1)] border border-emerald-500/30' : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1c1b]'}`}
                                    >
                                        <ArrowRightLeft className="h-3.5 w-3.5" />
                                        Transfers
                                    </button>
                                </div>
                            </div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[#151716] rounded-xl shadow-2xl border border-white/10 min-h-[600px] p-6"
                            >
                                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className="relative group w-full md:w-64">
                                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[#f3cf7a] transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Search store..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-10 pr-4 py-3 bg-[#0f1110] border border-white/10 rounded-2xl outline-none text-white focus:border-[#d4af37] focus:ring-0 transition-all font-light"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {activeTab === 'inventory' && (
                                            <button onClick={exportStoreCSV} className="flex items-center gap-2 px-4 py-3 bg-[#0f1110] border border-white/10 text-gray-300 rounded-2xl hover:text-emerald-400 hover:border-emerald-500/30 font-bold text-[10px] uppercase tracking-widest shadow-sm transition-all focus:outline-none active:scale-[0.98]">
                                                <Download size={14} className="text-emerald-500" /> Export CSV
                                            </button>
                                        )}
                                        {activeTab === 'expenses' && (
                                            <button onClick={exportOperationalExpensesCSV} className="flex items-center gap-2 px-4 py-3 bg-[#0f1110] border border-white/10 text-gray-300 rounded-2xl hover:text-emerald-400 hover:border-emerald-500/30 font-bold text-[10px] uppercase tracking-widest shadow-sm transition-all focus:outline-none active:scale-[0.98]">
                                                <Download size={14} className="text-emerald-500" /> Export CSV
                                            </button>
                                        )}
                                        {activeTab === 'fixed-assets' && (
                                            <button onClick={exportFixedAssetsCSV} className="flex items-center gap-2 px-4 py-3 bg-[#0f1110] border border-white/10 text-gray-300 rounded-2xl hover:text-emerald-400 hover:border-emerald-500/30 font-bold text-[10px] uppercase tracking-widest shadow-sm transition-all focus:outline-none active:scale-[0.98]">
                                                <Download size={14} className="text-emerald-500" /> Export CSV
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {activeTab === 'inventory' && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                    <th className="pb-4 pl-4">Item Details</th>
                                                    <th className="pb-4">Quantity in Store</th>
                                                    <th className="pb-4">Active in Stock</th>
                                                    <th className="pb-4 text-right pr-4">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {filteredStock.map((item) => (
                                                    <tr key={item._id} className="group hover:bg-[#1a1c1b] transition-colors">
                                                        <td className="py-5 pl-4">
                                                            <p className="font-playfair italic text-[#f3cf7a] text-lg">{item.name}</p>
                                                            <p className="text-[9px] uppercase text-gray-500 font-bold tracking-widest">{item.category} • {item.unit}</p>
                                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Total Purchased: {item.totalPurchased || 0} {item.unit}</p>
                                                        </td>
                                                        <td className="py-5">
                                                            <p className="text-2xl font-black text-white">
                                                                {(item.storeQuantity || 0).toLocaleString()}
                                                                <span className="text-[10px] font-bold text-gray-500 ml-1 uppercase">{item.unit}</span>
                                                            </p>
                                                        </td>
                                                        <td className="py-5">
                                                            {(item.quantity || 0) > 0 ? (
                                                                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 bg-[#1a2e20] px-2.5 py-1 rounded-lg border border-[#4ade80]/30 shadow-sm">
                                                                    {(item.quantity || 0).toLocaleString()} {item.unit} Active
                                                                </span>
                                                            ) : (
                                                                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 bg-[#0f1110] px-2.5 py-1 rounded-lg border border-white/10 shadow-sm">
                                                                    Inactive in POS
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-5 text-right pr-4">
                                                            <div className="flex justify-end gap-2">
                                                                {(user?.role === "admin" || hasPermission("store:transfer")) && (
                                                                    <button
                                                                        onClick={() => openTransferModal(item)}
                                                                        disabled={(item.storeQuantity || 0) <= 0}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f1110] text-[#f3cf7a] hover:bg-[#1a1c1b] rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest disabled:opacity-30 border border-[#d4af37]/30"
                                                                    >
                                                                        <ChevronRight size={12} /> Transfer
                                                                    </button>
                                                                )}
                                                                {(user?.role === "admin" || hasPermission("store:update")) && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => { setRestockingItem(item); setShowRestockModal(true); }}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f1110] text-[#f3cf7a] hover:bg-[#1a1c1b] rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest border border-[#d4af37]/30"
                                                                        >
                                                                            <PlusCircle size={12} /> Restock
                                                                        </button>
                                                                        <button onClick={() => handleEditStock(item)} className="p-2 hover:bg-[#1a1c1b] rounded-lg text-gray-400 hover:text-[#f3cf7a] transition-colors border border-transparent hover:border-[#d4af37]/30">
                                                                            <Edit2 size={16} />
                                                                        </button>
                                                                    </>
                                                                )}
                                                                {(user?.role === "admin" || hasPermission("store:delete")) && (
                                                                    <button onClick={() => deleteStockItem(item._id)} className="p-2 hover:bg-red-950/50 rounded-lg text-gray-400 hover:text-red-500 transition-colors border border-transparent hover:border-red-500/30">
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === 'fixed-assets' && (
                                    <div className="space-y-4">
                                        {filteredFixedAssets.length === 0 ? (
                                            <div className="text-center py-20 text-gray-500 text-[10px] font-bold uppercase tracking-widest border border-dashed border-white/10 rounded-[2rem] bg-[#0f1110]">
                                                <Wrench className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#f3cf7a]" />
                                                No fixed assets found.
                                            </div>
                                        ) : (
                                            filteredFixedAssets.map((asset) => {
                                                const isExpanded = expandedAsset === asset._id
                                                const totalDismissed = asset.dismissals.reduce((s, d) => s + d.valueLost, 0)
                                                return (
                                                    <div key={asset._id} className={`rounded-2xl border overflow-hidden transition-all ${asset.status === 'fully_dismissed' ? 'bg-red-950/20 border-red-500/20 opacity-60' :
                                                        asset.status === 'partially_dismissed' ? 'bg-[#b38822]/10 border-[#d4af37]/30' :
                                                            'bg-[#0f1110] border-white/10 hover:border-[#d4af37]/30'
                                                        }`}>
                                                        <div className="p-5">
                                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${asset.status === 'fully_dismissed' ? 'bg-red-950/50 text-red-500 border-red-500/30' :
                                                                        asset.status === 'partially_dismissed' ? 'bg-[#151716] text-[#f3cf7a] border-[#d4af37]/30' :
                                                                            'bg-[#151716] text-emerald-400 border-white/5'
                                                                        }`}>
                                                                        <Wrench size={18} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-playfair italic text-[#f3cf7a] text-lg">{asset.name}</p>
                                                                        <div className="flex items-center gap-2 mt-0.5">
                                                                            <span className="text-[9px] font-bold uppercase text-gray-500 tracking-widest">{asset.category}</span>
                                                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${asset.status === 'fully_dismissed' ? 'bg-[#1a0f0f] text-red-500 border border-red-500/30' :
                                                                                asset.status === 'partially_dismissed' ? 'bg-[#d4af37]/10 text-[#f3cf7a] border border-[#d4af37]/30' :
                                                                                    'bg-[#1a2e20] text-[#4ade80] border border-[#4ade80]/30'
                                                                                }`}>{asset.status === 'fully_dismissed' ? 'Dismissed' : asset.status === 'partially_dismissed' ? 'Partial' : 'Active'}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-6">
                                                                    <div className="text-center">
                                                                        <p className="text-2xl font-black text-white">{asset.quantity}</p>
                                                                        <p className="text-[9px] font-light text-gray-500 uppercase tracking-widest">Qty</p>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="text-lg font-bold text-gray-300">{asset.unitPrice.toLocaleString()} <span className="text-[9px] text-gray-500 uppercase tracking-widest">Br</span></p>
                                                                        <p className="text-[9px] font-light text-gray-500 uppercase tracking-widest">Unit Price</p>
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <p className="text-lg font-bold text-[#f3cf7a]">{asset.totalValue.toLocaleString()} <span className="text-[9px] text-gray-500 uppercase tracking-widest">Br</span></p>
                                                                        <p className="text-[9px] font-light text-gray-500 uppercase tracking-widest">Value</p>
                                                                    </div>
                                                                    {totalDismissed > 0 && (
                                                                        <div className="text-center">
                                                                            <p className="text-lg font-bold text-red-400">-{totalDismissed.toLocaleString()} <span className="text-[9px] text-gray-500 uppercase tracking-widest">Br</span></p>
                                                                            <p className="text-[9px] font-light text-gray-500 uppercase tracking-widest">Lost</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    {user?.role === "admin" && (
                                                                        <>
                                                                            {asset.status !== 'fully_dismissed' && (
                                                                                <button
                                                                                    onClick={() => openDismissModal(asset)}
                                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0f1110] text-red-500 hover:bg-red-950/50 rounded-lg transition-all font-bold text-[9px] uppercase tracking-widest border border-red-500/30"
                                                                                >
                                                                                    <AlertTriangle size={12} /> Dismiss
                                                                                </button>
                                                                            )}
                                                                            <button onClick={() => handleEditAsset(asset)} className="p-2 hover:bg-[#1a1c1b] rounded-lg text-gray-400 hover:text-[#f3cf7a] transition-colors border border-transparent hover:border-[#d4af37]/30">
                                                                                <Edit2 size={16} />
                                                                            </button>
                                                                            <button onClick={() => deleteFixedAsset(asset._id)} className="p-2 hover:bg-red-950/50 rounded-lg text-gray-400 hover:text-red-500 transition-colors border border-transparent hover:border-red-500/30">
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                    {asset.dismissals.length > 0 && (
                                                                        <button
                                                                            onClick={() => setExpandedAsset(isExpanded ? null : asset._id)}
                                                                            className="p-2 hover:bg-[#1a1c1b] rounded-lg text-gray-400 hover:text-white transition-colors"
                                                                        >
                                                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {asset.notes && (
                                                                <p className="mt-2 text-[10px] text-gray-500 font-light pl-[52px]">{asset.notes}</p>
                                                            )}
                                                        </div>

                                                        {/* Dismissal History */}
                                                        {isExpanded && asset.dismissals.length > 0 && (
                                                            <div className="border-t border-white/5 bg-[#151716] px-5 py-4">
                                                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-3">Dismissal History</p>
                                                                <div className="space-y-2">
                                                                    {asset.dismissals.map((d, i) => (
                                                                        <div key={i} className="flex items-start gap-3 p-3 bg-[#0f1110] rounded-xl border border-white/5">
                                                                            <div className="h-8 w-8 bg-red-950/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 border border-red-500/20">
                                                                                <AlertTriangle size={14} className="text-red-400" />
                                                                            </div>
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-sm font-bold text-white tracking-wide">{d.reason}</p>
                                                                                <p className="text-[10px] uppercase font-light tracking-widest text-gray-500 mt-1">
                                                                                    {d.quantity} unit(s) · -{d.valueLost.toLocaleString()} Br · {new Date(d.date).toLocaleDateString()}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                )}


                                {activeTab === 'categories' && (
                                    <div className="space-y-8">
                                        <div className="bg-[#151716] p-6 rounded-3xl border border-white/5">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                                <h3 className="font-bold text-[10px] uppercase tracking-widest text-[#f3cf7a]">
                                                    {editingCategory ? "Update Category" : `Add New ${categoryType === 'stock' ? 'Stock' : 'Asset'} Category`}
                                                </h3>
                                                <div className="flex p-1 bg-[#0f1110] border border-white/5 rounded-xl">
                                                    <button
                                                        onClick={() => setCategoryType('stock')}
                                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${categoryType === 'stock' ? 'bg-[#1a1c1b] text-[#f3cf7a] shadow-sm border border-[#d4af37]/30' : 'text-gray-500 hover:text-gray-300'}`}
                                                    >
                                                        Stock
                                                    </button>
                                                    <button
                                                        onClick={() => setCategoryType('fixed-asset')}
                                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${categoryType === 'fixed-asset' ? 'bg-[#1a1c1b] text-[#f3cf7a] shadow-sm border border-[#d4af37]/30' : 'text-gray-500 hover:text-gray-300'}`}
                                                    >
                                                        Fixed Asset
                                                    </button>
                                                    <button
                                                        onClick={() => setCategoryType('expense')}
                                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${categoryType === 'expense' ? 'bg-[#1a1c1b] text-[#f3cf7a] shadow-sm border border-[#d4af37]/30' : 'text-gray-500 hover:text-gray-300'}`}
                                                    >
                                                        Expense
                                                    </button>
                                                </div>
                                            </div>
                                            {user?.role === "admin" && (
                                                <form onSubmit={handleSaveCategory} className="flex gap-3">
                                                    <input
                                                        type="text"
                                                        placeholder="Category Name (e.g. Beverages)"
                                                        value={newCategory.name}
                                                        onChange={(e) => setNewCategory({ name: e.target.value })}
                                                        className="flex-1 bg-[#0f1110] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-[#d4af37]/50 focus:ring-1 focus:ring-[#d4af37]/50 placeholder-gray-600 transition-all"
                                                        required
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={saveLoading || !newCategory.name}
                                                        className="bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] px-8 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest disabled:opacity-50 hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all"
                                                    >
                                                        {saveLoading ? "Saving..." : (editingCategory ? "Update" : "Add")}
                                                    </button>
                                                    {editingCategory && (
                                                        <button
                                                            type="button"
                                                            onClick={() => { setEditingCategory(null); setNewCategory({ name: "" }) }}
                                                            className="bg-[#151716] text-gray-400 border border-white/10 px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#1a1c1b] hover:text-white transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </form>
                                            )}
                                        </div>
                                        {/* Display categories based on type */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                                            {(categoryType === 'stock' ? categories : categoryType === 'fixed-asset' ? assetCategories : expenseCategories).map((cat) => (
                                                <div key={cat._id} className="bg-[#0f1110] border border-white/10 p-6 rounded-2xl shadow-lg hover:border-[#d4af37]/30 transition-all group">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="h-12 w-12 bg-[#151716] rounded-xl flex items-center justify-center border border-white/5">
                                                            <Tag className="h-6 w-6 text-[#f3cf7a]" />
                                                        </div>
                                                        {user?.role === "admin" && (
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => { setEditingCategory(cat); setNewCategory({ name: cat.name }); }} className="p-2 hover:bg-[#1a1c1b] rounded-lg text-gray-400 hover:text-[#f3cf7a] transition-colors border border-transparent hover:border-[#d4af37]/30">
                                                                    <Edit2 size={14} />
                                                                </button>
                                                                <button onClick={() => handleDeleteCategory(cat._id)} className="p-2 hover:bg-red-950/50 rounded-lg text-gray-400 hover:text-red-500 transition-colors border border-transparent hover:border-red-500/30">
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="font-playfair italic text-[#f3cf7a] text-xl mb-1">{cat.name}</p>
                                                    {categoryType === 'stock' && (
                                                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                                                            <div>
                                                                <p className="text-xl font-black text-white">{filteredStock.filter(s => s.category === cat.name).length}</p>
                                                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Items</p>
                                                            </div>
                                                            <div className="w-px h-8 bg-white/5"></div>
                                                            <div>
                                                                <p className="text-xl font-black text-[#d4af37]">{(filteredStock.filter(s => s.category === cat.name).reduce((sum, item) => sum + (item.totalPurchaseCost || 0), 0)).toLocaleString()}</p>
                                                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Value (ETB)</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {categoryType === 'fixed-asset' && (
                                                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                                                            <div>
                                                                <p className="text-xl font-black text-white">{filteredFixedAssets.filter(s => s.category === cat.name).length}</p>
                                                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Assets</p>
                                                            </div>
                                                            <div className="w-px h-8 bg-white/5"></div>
                                                            <div>
                                                                <p className="text-xl font-black text-[#d4af37]">{(filteredFixedAssets.filter(s => s.category === cat.name).reduce((sum, a) => sum + (a.totalValue || 0), 0)).toLocaleString()}</p>
                                                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Total Value</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {categoryType === 'expense' && (
                                                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/5">
                                                            <div>
                                                                <p className="text-xl font-black text-white">{filteredOperationalExpenses.filter(s => s.category === cat.name).length}</p>
                                                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Records</p>
                                                            </div>
                                                            <div className="w-px h-8 bg-white/5"></div>
                                                            <div>
                                                                <p className="text-xl font-black text-red-500">{(filteredOperationalExpenses.filter(s => s.category === cat.name).reduce((sum, e) => sum + (e.amount || 0), 0)).toLocaleString()}</p>
                                                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Total Spend</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                </div>
                                )}
                                {activeTab === 'expenses' && (
                                    <div className="space-y-6">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div className="flex bg-[#0f1110] p-1 rounded-xl border border-white/5">
                                                {['today', 'week', 'month', 'all'].map((period) => (
                                                    <button
                                                        key={period}
                                                        onClick={() => setExpenseDateFilter(period as any)}
                                                        className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${expenseDateFilter === period ? "bg-[#d4af37] text-[#0f1110]" : "text-gray-500 hover:text-white"}`}
                                                    >
                                                        {period}
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                onClick={() => setShowOperationalExpenseForm(true)}
                                                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                                            >
                                                <Plus size={14} /> New Expense entry
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="border-b border-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                        <th className="pb-4 pl-4">Date</th>
                                                        <th className="pb-4">Expense Details</th>
                                                        <th className="pb-4">Category</th>
                                                        <th className="pb-4 text-right">Amount</th>
                                                        <th className="pb-4 text-right pr-4">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {filteredOperationalExpenses.length === 0 ? (
                                                        <tr><td colSpan={5} className="py-20 text-center text-gray-500 text-[10px] font-bold uppercase tracking-widest border border-dashed border-white/10 rounded-xl bg-[#0f1110] mt-4 block">No expenses found matching the criteria.</td></tr>
                                                    ) : (
                                                        filteredOperationalExpenses.map((expense) => (
                                                            <tr key={expense._id} className="group hover:bg-[#1a1c1b] transition-colors">
                                                                <td className="py-5 pl-4">
                                                                    <p className="font-bold text-white">{new Date(expense.date).toLocaleDateString()}</p>
                                                                    <p className="text-[9px] uppercase tracking-widest text-[#f3cf7a]">{new Date(expense.date).toLocaleDateString(undefined, { weekday: 'long' })}</p>
                                                                </td>
                                                                <td className="py-5">
                                                                    <p className="font-playfair italic text-[#f3cf7a] text-lg">{expense.name}</p>
                                                                    {expense.description && <p className="text-[10px] text-gray-500 font-light mt-1">{expense.description}</p>}
                                                                </td>
                                                                <td className="py-5">
                                                                    <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400 bg-[#1a2e20] px-2.5 py-1 rounded-lg border border-[#4ade80]/30 shadow-sm">{expense.category}</span>
                                                                </td>
                                                                <td className="py-5 text-right">
                                                                    <p className="text-xl font-black text-red-500">-{expense.amount.toLocaleString()} <span className="text-[10px] text-gray-500 uppercase tracking-widest">ETB</span></p>
                                                                </td>
                                                                <td className="py-5 text-right pr-4">
                                                                    {user?.role === "admin" && (
                                                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button onClick={() => handleEditOperationalExpense(expense)} className="p-2 hover:bg-[#151716] rounded-lg text-gray-400 hover:text-[#f3cf7a] transition-colors border border-transparent hover:border-[#d4af37]/30">
                                                                                <Edit2 size={16} />
                                                                            </button>
                                                                            <button onClick={() => deleteOperationalExpense(expense._id)} className="p-2 hover:bg-red-950/50 rounded-lg text-gray-400 hover:text-red-500 transition-colors border border-transparent hover:border-red-500/30">
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'transfers' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-lg font-playfair italic text-[#f3cf7a]">Transfer Requests</h3>
                                        </div>
                                        {transfersLoading ? (
                                            <div className="text-center py-20 text-[#f3cf7a] text-[10px] font-bold uppercase tracking-widest animate-pulse">Loading requests...</div>
                                        ) : transferRequests.length === 0 ? (
                                            <div className="text-center py-20 text-gray-500 text-[10px] font-bold uppercase tracking-widest border border-dashed border-white/10 rounded-[2rem] bg-[#0f1110]">
                                                <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-30 text-emerald-500" />
                                                No transfer requests found.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-4">
                                                {transferRequests.map((req) => (
                                                    <div key={req._id} className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${req.status === 'pending' ? 'bg-[#151716] border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_4px_15px_rgba(52,211,153,0.05)]' :
                                                        req.status === 'approved' ? 'bg-[#0f1110] border-white/5 opacity-70' : 'bg-red-950/10 border-red-500/20 opacity-70'
                                                        }`}>
                                                        <div className="flex items-start gap-4">
                                                            <div className={`mt-1 h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${req.status === 'pending' ? 'bg-emerald-950/50 text-emerald-500 border-emerald-500/30' :
                                                                req.status === 'approved' ? 'bg-[#1a2e20] text-[#4ade80] border-[#4ade80]/30' : 'bg-red-950/50 text-red-500 border-red-500/30'
                                                                }`}>
                                                                {req.status === 'pending' ? <Clock size={18} /> : req.status === 'approved' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <p className="text-white font-bold">{req.stockId?.name || "Deleted Item"}</p>
                                                                    <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${req.status === 'pending' ? 'bg-emerald-950/50 text-emerald-500 border border-emerald-500/30' :
                                                                        req.status === 'approved' ? 'bg-[#1a2e20] text-[#4ade80] border border-[#4ade80]/30' : 'bg-red-950/50 text-red-500 border border-red-500/30'
                                                                        }`}>
                                                                        {req.status}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">{req.stockId?.category || "N/A"}</p>
                                                                <p className="text-xl font-black text-white mb-2">{req.quantity} <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{req.stockId?.unit || ''}</span></p>
                                                                <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-widest">
                                                                    <span className="flex items-center gap-1 text-[#f3cf7a]"><Clock className="h-3 w-3" /> {new Date(req.createdAt).toLocaleDateString()}</span>
                                                                    <span className="text-gray-500">By <span className="text-gray-300">{req.requestedBy?.name}</span></span>
                                                                </div>
                                                                {req.notes && <p className="text-[10px] text-gray-400 italic mt-2 font-light bg-[#0f1110] p-2 rounded-lg border border-white/5">{req.notes}</p>}
                                                                {req.status === 'denied' && req.denialReason && (
                                                                    <p className="text-[10px] text-red-400 font-bold mt-2 flex items-center gap-1 bg-red-950/30 p-2 rounded-lg border border-red-500/20">
                                                                        <AlertTriangle size={12} /> Reason: {req.denialReason}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            {req.status === 'pending' && user?.role === 'admin' ? (
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => handleTransferAction(req._id, 'approved')} className="bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-widest transition-all">Approve</button>
                                                                    <button onClick={() => setDenialModal({ isOpen: true, requestId: req._id, reason: "" })} className="bg-red-500/20 text-red-500 hover:bg-red-500/40 border border-red-500/30 px-3 py-1.5 rounded-lg font-bold text-[9px] uppercase tracking-widest transition-all">Deny</button>
                                                                </div>
                                                            ) : (
                                                                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                                                                    {req.handledBy ? `Handled by ${req.handledBy.name}` : ''}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                </div>
                <AnimatePresence>
                    {showStockForm && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetStockForm} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-[#1a1c1b] border border-white/10 rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl">
                                <h2 className="text-2xl font-black mb-6 text-white tracking-tight">{editingStock ? 'Edit Item' : 'Add New Item'}</h2>
                                <form onSubmit={handleSaveStock} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Item Name</label>
                                        <input type="text" placeholder="Name" value={stockFormData.name} onChange={e => setStockFormData({ ...stockFormData, name: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl outline-none font-bold text-white focus:border-[#d4af37]/50 transition-all" required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Category</label>
                                            <select
                                                value={stockFormData.category}
                                                onChange={e => setStockFormData({ ...stockFormData, category: e.target.value })}
                                                className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-bold text-white focus:border-[#d4af37]/50 transition-all"
                                                required
                                            >
                                                {categories.length > 0 ? (
                                                    categories.map(cat => (
                                                        <option key={cat._id} value={cat.name}>{cat.name}</option>
                                                    ))
                                                ) : (
                                                    <option value="">Select Category</option>
                                                )}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Unit</label>
                                            <select value={stockFormData.unit} onChange={e => setStockFormData({ ...stockFormData, unit: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-bold text-white focus:border-[#d4af37]/50 transition-all">
                                                <option value="kg">kg</option>
                                                <option value="L">L</option>
                                                <option value="pcs">pcs</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block ml-1">In Store Qty</label>
                                            <input type="number" step="any" placeholder="0.00" value={stockFormData.quantity} onChange={e => setStockFormData({ ...stockFormData, quantity: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-bold text-white focus:border-[#d4af37]/50 transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block ml-1">Unit Purchased Price</label>
                                            <input type="number" step="any" placeholder="0.00" value={stockFormData.unitPurchasedPrice} onChange={e => setStockFormData({ ...stockFormData, unitPurchasedPrice: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-bold text-[#f3cf7a] focus:border-[#d4af37]/50 transition-all" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block ml-1">Store Alert Limit</label>
                                            <input type="number" placeholder="Min" value={stockFormData.storeMinLimit} onChange={e => setStockFormData({ ...stockFormData, storeMinLimit: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-bold text-white focus:border-[#d4af37]/50 transition-all" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-1">Selling Price</label>
                                            <input type="number" step="any" placeholder="0.00" value={stockFormData.unitCost} onChange={e => setStockFormData({ ...stockFormData, unitCost: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-bold text-[#d4af37] focus:border-[#d4af37]/50 transition-all" />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={resetStockForm} className="flex-1 py-4 font-bold text-gray-500 hover:text-white transition-colors">Cancel</button>
                                        <button type="submit" className="flex-[2] py-4 bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] rounded-xl font-black text-[11px] uppercase tracking-widest hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all">Save Item</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {showRestockModal && restockingItem && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowRestockModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-[#1a1c1b] border border-white/10 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl">
                                <h2 className="text-xl font-black mb-6 text-white tracking-tight flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-emerald-500" /> Restock Item
                                </h2>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">{restockingItem.name}</p>
                                <form onSubmit={handleRestockSubmit} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Amount to add ({restockingItem.unit})</label>
                                        <input type="number" step="any" placeholder="0.00" value={restockAmount} onChange={e => setRestockAmount(e.target.value)} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-bold text-white focus:border-[#d4af37]/50 transition-all" required />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Unit Purchased Price (ETB)</label>
                                        <input type="number" step="any" placeholder="0.00" value={newTotalCost} onChange={e => setNewTotalCost(e.target.value)} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-black text-xl text-[#f3cf7a] focus:border-[#d4af37]/50 transition-all" required />
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button type="button" onClick={() => setShowRestockModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:text-white transition-colors">Cancel</button>
                                        <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">Restock</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {showTransferModal && transferringItem && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTransferModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-[#1a1c1b] border border-white/10 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl">
                                <h2 className="text-xl font-black mb-1 text-white tracking-tight flex items-center gap-2">
                                    <ArrowRightLeft className="h-5 w-5 text-emerald-500" /> Transfer to POS
                                </h2>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">{transferringItem.name} · Max: {transferringItem.storeQuantity} {transferringItem.unit}</p>
                                <form onSubmit={handleTransferSubmit} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Quantity to Move</label>
                                        <input type="number" step="any" placeholder="0.00" max={transferringItem.storeQuantity} value={transferAmount} onChange={e => setTransferAmount(e.target.value)} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-black text-2xl text-emerald-500 focus:border-emerald-500/50 transition-all shadow-inner" required />
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button type="button" onClick={() => setShowTransferModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:text-white transition-colors">Cancel</button>
                                        <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">Confirm Move</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {/* Add/Edit Fixed Asset Modal */}
                    {showAssetForm && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetAssetForm} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-[#1a1c1b] border border-white/10 rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl">
                                <h2 className="text-2xl font-black mb-6 text-white tracking-tight">{editingAsset ? 'Edit Fixed Asset' : 'Add Fixed Asset'}</h2>
                                <form onSubmit={handleSaveAsset} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Asset Name</label>
                                        <input type="text" placeholder="Asset Name (e.g. Coffee Grinder)" value={assetFormData.name} onChange={e => setAssetFormData({ ...assetFormData, name: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl outline-none font-bold text-white focus:border-[#d4af37]/50 transition-all" required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Category</label>
                                            <select
                                                value={assetFormData.category}
                                                onChange={e => setAssetFormData({ ...assetFormData, category: e.target.value })}
                                                className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-bold text-white focus:border-[#d4af37]/50 transition-all"
                                            >
                                                {assetCategories.length > 0 ? (
                                                    assetCategories.map(cat => (
                                                        <option key={cat._id} value={cat.name}>{cat.name}</option>
                                                    ))
                                                ) : (
                                                    <option value="">Select Category</option>
                                                )}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Purchase Date</label>
                                            <input type="date" value={assetFormData.purchaseDate} onChange={e => setAssetFormData({ ...assetFormData, purchaseDate: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-bold text-white focus:border-[#d4af37]/50" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block ml-1">Quantity</label>
                                            <input type="number" placeholder="0" value={assetFormData.quantity} onChange={e => setAssetFormData({ ...assetFormData, quantity: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-bold text-white" required min="1" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 block ml-1">Unit Price (Br)</label>
                                            <input type="number" placeholder="0.00" value={assetFormData.unitPrice} onChange={e => setAssetFormData({ ...assetFormData, unitPrice: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-bold text-white" required min="0" />
                                        </div>
                                    </div>
                                    {assetFormData.quantity && assetFormData.unitPrice && (
                                        <div className="bg-[#151716] p-4 rounded-xl border border-white/5 shadow-inner">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Total Asset Value</span>
                                            <p className="text-2xl font-black text-[#f3cf7a]">{(Number(assetFormData.quantity) * Number(assetFormData.unitPrice)).toLocaleString()} <span className="text-[10px] text-gray-500">ETB</span></p>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Notes (optional)</label>
                                        <textarea placeholder="Additional details..." value={assetFormData.notes} onChange={e => setAssetFormData({ ...assetFormData, notes: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl outline-none font-bold text-white focus:border-[#d4af37]/50 resize-none" rows={2} />
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={resetAssetForm} className="flex-1 py-4 font-bold text-gray-500 hover:text-white transition-colors">Cancel</button>
                                        <button type="submit" className="flex-[2] py-4 bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-[#d4af37]/10">{saveLoading ? "Saving..." : (editingAsset ? "Update Asset" : "Add Asset")}</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {/* Dismiss Asset Modal */}
                    {showDismissModal && dismissingAsset && (
                        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDismissModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-[#1a1c1b] border border-white/10 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="h-12 w-12 bg-red-950/30 rounded-xl flex items-center justify-center border border-red-500/30">
                                        <AlertTriangle size={24} className="text-red-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight">Dismiss Asset</h2>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{dismissingAsset.name} · {dismissingAsset.quantity} units</p>
                                    </div>
                                </div>
                                <form onSubmit={handleDismissSubmit} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Quantity to Dismiss</label>
                                        <input type="number" placeholder="0" value={dismissQuantity} onChange={e => {
                                            setDismissQuantity(e.target.value)
                                            setDismissValue((Number(e.target.value) * dismissingAsset.unitPrice).toString())
                                        }} max={dismissingAsset.quantity} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-black text-2xl text-red-500 focus:border-red-500/50 transition-all shadow-inner" required min="1" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Value Lost (ETB)</label>
                                        <input type="number" placeholder="0.00" value={dismissValue} onChange={e => setDismissValue(e.target.value)} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-bold text-white focus:border-[#d4af37]/50 transition-all" required min="0" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Reason for Dismissal</label>
                                        <textarea placeholder="e.g. Damaged beyond repair..." value={dismissReason} onChange={e => setDismissReason(e.target.value)} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl outline-none font-bold text-white focus:border-[#d4af37]/50 resize-none transition-all" rows={3} required />
                                    </div>
                                    <div className="bg-red-950/20 p-4 rounded-xl border border-red-500/10 mb-4">
                                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Total Loss Estimate</p>
                                        <p className="text-2xl font-black text-red-500">-{Number(dismissValue || 0).toLocaleString()} <span className="text-[10px] text-gray-500 uppercase tracking-widest">ETB</span></p>
                                    </div>
                                    <div className="flex gap-3 pt-4">
                                        <button type="button" onClick={() => setShowDismissModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:text-white transition-colors">Cancel</button>
                                        <button type="submit" className="flex-1 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all">{saveLoading ? "Wait..." : "Confirm"}</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}

                    {showOperationalExpenseForm && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={resetOperationalExpenseForm} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="relative bg-[#1a1c1b] border border-white/10 rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl">
                                <h2 className="text-2xl font-black mb-6 text-white tracking-tight">{editingOperationalExpense ? 'Edit Operational Expense' : 'Add Operational Expense'}</h2>
                                <form onSubmit={handleSaveOperationalExpense} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Expense Name</label>
                                        <input type="text" placeholder="e.g. Electricity Bill, Rent, Water" value={operationalExpenseFormData.name} onChange={e => setOperationalExpenseFormData({ ...operationalExpenseFormData, name: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl outline-none font-bold text-white focus:border-[#d4af37]/50 transition-all" required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Date</label>
                                            <input type="date" value={operationalExpenseFormData.date} onChange={e => setOperationalExpenseFormData({ ...operationalExpenseFormData, date: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl outline-none font-bold text-white focus:border-[#d4af37]/50" required />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Category</label>
                                            <select
                                                value={operationalExpenseFormData.category}
                                                onChange={e => setOperationalExpenseFormData({ ...operationalExpenseFormData, category: e.target.value })}
                                                className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl font-bold text-white focus:border-[#d4af37]/50"
                                                required
                                            >
                                                {expenseCategories.length > 0 ? (
                                                    expenseCategories.map(cat => (
                                                        <option key={cat._id} value={cat.name}>{cat.name}</option>
                                                    ))
                                                ) : (
                                                    <option value="">Select Category</option>
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Amount (ETB)</label>
                                        <input type="number" placeholder="0.00" value={operationalExpenseFormData.amount} onChange={e => setOperationalExpenseFormData({ ...operationalExpenseFormData, amount: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl outline-none font-bold text-[#f3cf7a] focus:border-[#d4af37]/50 transition-all text-xl" required min="0" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Description (optional)</label>
                                        <textarea placeholder="Additional notes..." value={operationalExpenseFormData.description} onChange={e => setOperationalExpenseFormData({ ...operationalExpenseFormData, description: e.target.value })} className="w-full p-4 bg-[#0f1110] border border-white/10 rounded-xl outline-none font-bold text-white focus:border-[#d4af37]/50 shadow-inner resize-none transition-all" rows={3} />
                                    </div>
                                    <div className="flex gap-4 pt-4">
                                        <button type="button" onClick={resetOperationalExpenseForm} className="flex-1 py-4 font-bold text-gray-500 hover:text-white transition-colors">Cancel</button>
                                        <button type="submit" className="flex-[2] py-4 bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-[#d4af37]/10 hover:shadow-[#d4af37]/20 transition-all">{saveLoading ? "Wait..." : "Save Expense"}</button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Transfer Denial Modal */}
                <AnimatePresence>
                    {denialModal.isOpen && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDenialModal({ ...denialModal, isOpen: false })} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#1a1c1b] border border-white/10 w-full max-w-md rounded-[2rem] p-10 shadow-2xl">
                                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3 tracking-tight">
                                    <XCircle className="text-red-500 h-6 w-6" />
                                    Deny Transfer Request
                                </h3>
                                <textarea placeholder="Reason for denial..." value={denialModal.reason} onChange={e => setDenialModal({ ...denialModal, reason: e.target.value })} className="w-full bg-[#0f1110] border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white focus:outline-none focus:border-red-500/50 transition-all h-32 resize-none mb-6 shadow-inner" />
                                <div className="flex gap-3">
                                    <button onClick={() => handleTransferAction(denialModal.requestId, 'denied', denialModal.reason)} disabled={!denialModal.reason} className="flex-1 bg-red-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 transition-all shadow-lg shadow-red-600/20">Confirm Denial</button>
                                    <button onClick={() => setDenialModal({ ...denialModal, isOpen: false })} className="px-6 text-gray-500 font-bold text-xs hover:text-white transition-colors">Cancel</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>


                {/* Confirmations */}
                <ConfirmationCard
                    isOpen={confirmationState.isOpen}
                    onClose={closeConfirmation}
                    onConfirm={confirmationState.onConfirm}
                    title={confirmationState.options.title}
                    message={confirmationState.options.message}
                    type={confirmationState.options.type}
                />
                <NotificationCard
                    isOpen={notificationState.isOpen}
                    onClose={closeNotification}
                    title={notificationState.options.title}
                    message={notificationState.options.message}
                    type={notificationState.options.type}
                />
            </div >
        </ProtectedRoute >
    )
}
