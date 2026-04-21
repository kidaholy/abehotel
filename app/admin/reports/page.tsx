"use client"

import React, { useEffect, useState } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { useSettings } from "@/context/settings-context"
import { ReportExporter, type ComprehensiveSection } from "@/lib/export-utils"
import { Download, FileText, Printer, CheckCircle, Clock, ShoppingCart, AlertTriangle, Package, ChevronRight, Calendar as CalendarIcon, Users, User, TrendingUp } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"

interface MenuSalesItem {
    name: string;
    category: string;
    mainCategory: string;
    quantity: number;
    revenue: number;
}

const ALL_SLIDES = [
    { id: "financial", label: "Financial Summary", icon: FileText, color: "#d4af37", bg: "bg-gradient-to-r from-[#d4af37] to-[#f3cf7a]", permission: "reports:financial_summary" },
    { id: "orders", label: "Order History", icon: ShoppingCart, color: "#c5a059", bg: "bg-gradient-to-r from-[#d4af37] to-[#f3cf7a]", permission: "reports:order_history" },
    { id: "inventory", label: "Inventory Investment", icon: Clock, color: "#b38822", bg: "bg-gradient-to-r from-[#d4af37] to-[#f3cf7a]", permission: "reports:inventory_investment" },
    { id: "store", label: "Store Investment", icon: Package, color: "#d4af37", bg: "bg-gradient-to-r from-[#d4af37] to-[#f3cf7a]", permission: "reports:store_investment" },
    { id: "menu-sales", label: "Menu Item Sales", icon: ShoppingCart, color: "#f3cf7a", bg: "bg-gradient-to-r from-[#d4af37] to-[#f3cf7a]", permission: "reports:menu_item_sales" },
    { id: "cashier-insights", label: "Cashier Insights", icon: Users, color: "#d4af37", bg: "bg-gradient-to-r from-[#c5a059] to-[#f3cf7a]", permission: "reports:cashier_insights" },
]

export default function ReportsPage() {
    const { token, user, hasPermission } = useAuth()
    
    // Dynamically filter slides so users only see ones they're allowed to see
    const SLIDES = React.useMemo(() => {
        if (!user) return []
        // Admin or custom role with reports:view permission gets all reports
        if (user.role === "admin" || (user.role === "custom" && user.permissions?.includes("reports:view"))) return ALL_SLIDES;
        // Custom role with any specific report permission can see those reports
        if (user.role === "custom" && user.permissions) {
            return ALL_SLIDES.filter(s => user.permissions?.includes(s.permission))
        }
        // Other roles use hasPermission check
        return ALL_SLIDES.filter(s => hasPermission(s.permission))
    }, [user, hasPermission])

    const [timeRange, setTimeRange] = useState("week")
    const [activeSlide, setActiveSlide] = useState(0)
    const [animating, setAnimating] = useState(false)
    const [direction, setDirection] = useState<"left" | "right">("right")

    // Per-section loading — never block the whole page
    const [loadingSlide, setLoadingSlide] = useState(false)
    const [orders, setOrders] = useState<any[]>([])
    const [stockItems, setStockItems] = useState<any[]>([])
    const [periodData, setPeriodData] = useState<any>(null)
    const [stockUsageData, setStockUsageData] = useState<any>(null)
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
    const [menuItems, setMenuItems] = useState<any[]>([])
    const [menuSearchTerm, setMenuSearchTerm] = useState("")
    const [orderHistoryTab, setOrderHistoryTab] = useState<'All' | 'Food' | 'Drinks'>('All')
    const [menuSalesTab, setMenuSalesTab] = useState<'Food' | 'Drinks'>('Food')
    const [initialized, setInitialized] = useState(false)
    const [receptionRevenue, setReceptionRevenue] = useState(0)
    const [activeCashierIdx, setActiveCashierIdx] = useState(0)

    // Context
    const { t } = useLanguage()
    const { settings } = useSettings()

    useEffect(() => {
        if (token) fetchAllData()
    }, [token, timeRange]) // removed selectedDate — custom date triggers separately

    const fetchAllData = async () => {
        setLoadingSlide(true)
        const startTime = Date.now()
        try {
            let salesUrl = `/api/reports/sales?period=${timeRange}`
            let ordersUrl = getOrdersUrl(timeRange)

            let bedroomUrl = `/api/reports/bedroom-revenue?period=${timeRange}`

            if (timeRange === 'custom' && selectedDate) {
                const d = new Date(selectedDate)
                const startDateStr = new Date(d.setHours(0, 0, 0, 0)).toISOString()
                const endDateStr   = new Date(d.setHours(23, 59, 59, 999)).toISOString()
                salesUrl  += `&startDate=${startDateStr}&endDate=${endDateStr}`
                ordersUrl  = `/api/orders?startDate=${startDateStr}&endDate=${endDateStr}&includeDeleted=true&limit=1000`
                bedroomUrl += `&startDate=${startDateStr}&endDate=${endDateStr}`
            }

            // Fetch critical data first (financial + orders + reception revenue), then secondary
            const [salesRes, ordersRes, bedroomRes] = await Promise.all([
                fetch(salesUrl,  { headers: { Authorization: `Bearer ${token}` } }),
                fetch(ordersUrl, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(bedroomUrl, { headers: { Authorization: `Bearer ${token}` } }),
            ])
            if (salesRes.ok)  setPeriodData(await salesRes.json())
            if (ordersRes.ok) setOrders(await ordersRes.json())
            if (bedroomRes.ok) {
                const bd = await bedroomRes.json()
                setReceptionRevenue(bd.totalRevenue || 0)
            }

            setInitialized(true)

            // Ensure minimum 1.5 second loading time for better UX
            const elapsedTime = Date.now() - startTime
            const remainingDelay = Math.max(0, 1500 - elapsedTime)
            if (remainingDelay > 0) {
                await new Promise(resolve => setTimeout(resolve, remainingDelay))
            }

            setLoadingSlide(false)

            // Secondary data in background — don't block render
            const [stockRes, usageRes, menuRes] = await Promise.all([
                fetch(`/api/stock`,                                    { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`/api/reports/stock-usage?period=${timeRange}`,  { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`/api/menu?all=true`,                            { headers: { Authorization: `Bearer ${token}` } }),
            ])
            if (stockRes.ok) setStockItems(await stockRes.json())
            if (usageRes.ok) setStockUsageData(await usageRes.json())
            if (menuRes.ok)  setMenuItems(await menuRes.json())
        } catch (error) {
            console.error("Failed to load report data:", error)
            setInitialized(true)
            setLoadingSlide(false)
        }
    }

    const getOrdersUrl = (range: string) => {
        let url = "/api/orders"
        const now = new Date()
        let startDate: Date | null = null

        if (range === 'custom' && selectedDate) {
            startDate = selectedDate
        } else if (range === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        } else if (range === 'week') {
            startDate = new Date(now)
            startDate.setDate(now.getDate() - 7)
            startDate.setHours(0, 0, 0, 0)
        } else if (range === 'month') {
            startDate = new Date(now)
            startDate.setDate(now.getDate() - 30)
            startDate.setHours(0, 0, 0, 0)
        } else if (range === 'year') {
            startDate = new Date(now)
            startDate.setDate(now.getDate() - 365)
            startDate.setHours(0, 0, 0, 0)
        }

        if (startDate) {
            const ISO_START = new Date(startDate)
            ISO_START.setHours(0, 0, 0, 0)
            url += `?startDate=${ISO_START.toISOString()}`

            if (range === 'custom') {
                const ISO_END = new Date(startDate)
                ISO_END.setHours(23, 59, 59, 999)
                url += `&endDate=${ISO_END.toISOString()}`
            }
        }
        // Add limit and includeDeleted to ensure we get enough data for reports
        url += (url.includes('?') ? '&' : '?') + "includeDeleted=true&limit=1000"
        return url
    }

    const goToSlide = (idx: number) => {
        if (idx === activeSlide || animating) return
        setDirection(idx > activeSlide ? "right" : "left")
        setAnimating(true)
        setTimeout(() => {
            setActiveSlide(idx)
            setAnimating(false)
        }, 260)
    }

    // Calculations
    const salesSummary = periodData?.summary || {}
    const orderRevenue = salesSummary.totalRevenue || 0
    const totalRevenue = orderRevenue + receptionRevenue
    const periodInvestment = (salesSummary.periodStockInvestment || 0) + (salesSummary.totalOtherExpenses || 0)
    const periodProfit = salesSummary.periodNetProfit || 0
    const totalOperationalExpenses = salesSummary.totalOperationalExpenses || 0
    const filteredOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const foodRevenue = filteredOrders
        .filter(o => o.status !== "cancelled" && !o.isDeleted)
        .reduce((sum, o) => sum + o.items
            .filter((i: any) => i.mainCategory === 'Food')
            .reduce((s: number, it: any) => s + ((it.price || 0) * (it.quantity || 0)), 0), 0)

    const drinksRevenue = filteredOrders
        .filter(o => o.status !== "cancelled" && !o.isDeleted)
        .reduce((sum, o) => sum + o.items
            .filter((i: any) => i.mainCategory === 'Drinks')
            .reduce((s: number, it: any) => s + ((it.price || 0) * (it.quantity || 0)), 0), 0)

    const cashierRevenueMap = filteredOrders
        .filter(o => o.status !== "cancelled" && !o.isDeleted)
        .reduce((acc, o) => {
            // Group by cashier name (staff member), not by management group
            const cashierName = o.createdBy?.name || "Unknown Cashier";
            
            if (!acc[cashierName]) {
                acc[cashierName] = { 
                    total: 0, 
                    breakdowns: {} as Record<string, number>,
                    floors: new Set<string>()
                };
            }
            
            acc[cashierName].total += (o.totalAmount || 0);
            
            const floorLabel = o.floorNumber || "Other";
            acc[cashierName].breakdowns[floorLabel] = (acc[cashierName].breakdowns[floorLabel] || 0) + (o.totalAmount || 0);
            acc[cashierName].floors.add(floorLabel);
            
            return acc;
        }, {} as Record<string, { total: number, breakdowns: Record<string, number>, floors: Set<string> }>);

    const cashierRevenue = Object.entries(cashierRevenueMap)
        .map(([cashierName, data]: [string, any]) => {
            const floorsList = Array.from(data.floors).join(", ");
            // Show cashier name with floors they worked in
            return { 
                name: cashierName, 
                amount: data.total, 
                breakdowns: data.breakdowns,
                floors: floorsList
            }
        })
        .sort((a, b) => b.amount - a.amount);

    const menuItemSalesMap = filteredOrders.reduce((acc, order) => {
        if (order.status === 'cancelled' || order.isDeleted) return acc;
        
        // Use cashier name instead of management group
        const cashierName = order.createdBy?.name || "Unknown Cashier";

        order.items.forEach((item: any) => {
            const name = item.name;
            const key = `${name} | ${cashierName}`;
            if (!acc[key]) {
                acc[key] = { 
                    name: name, 
                    cashier: cashierName,
                    category: item.category || 'N/A', 
                    mainCategory: item.mainCategory || 'Food', 
                    quantity: 0, 
                    revenue: 0 
                };
            }
            acc[key].quantity += (item.quantity || 0);
            acc[key].revenue += (item.quantity || 0) * (item.price || 0);
        });
        return acc;
    }, {} as Record<string, any>);

    const menuItemSales: any[] = Object.values(menuItemSalesMap).sort((a: any, b: any) => (b.quantity || 0) - (a.quantity || 0));

    // Export functions
    const exportFinancialReport = () => {
        const data = [
            { Metric: "Total Revenue", Type: "INCOME", Amount: `${totalRevenue.toLocaleString()} ETB`, Description: "Combined revenue (orders + approved room bookings) for this period" },
            ...cashierRevenue.map(c => ({
                Metric: `  - Cashier: ${c.name}`,
                Type: "BREAKDOWN",
                Amount: `${c.amount.toLocaleString()} ETB`,
                Description: `Generated by ${c.name}`
            })),
            { Metric: "Reception Revenue", Type: "INCOME", Amount: `${receptionRevenue.toLocaleString()} ETB`, Description: "Approved room bookings for this period" },
            { Metric: "Period Investment (Stock)", Type: "EXPENSE", Amount: `${periodInvestment.toLocaleString()} ETB`, Description: "Inventory restocks and historical bulk purchases" },
            { Metric: "Operational Expenses", Type: "EXPENSE", Amount: `${totalOperationalExpenses.toLocaleString()} ETB`, Description: "Running costs (Rent, Utilities, etc.)" },
            { Metric: "Period Net Profit", Type: "RESULT", Amount: `${periodProfit.toLocaleString()} ETB`, Description: "Revenue - Total Investment for this period" },
        ]
        ReportExporter.exportToWord({ title: "Financial Summary Report", period: timeRange, headers: ["Metric", "Type", "Amount", "Description"], data, metadata: { companyName: settings.app_name || "Prime Addis" } })
    }

    const exportOrdersReport = () => {
        const data = filteredOrders.map(o => ({
            "Item Names": o.items.map((i: any) => i.name).join(", "),
            "Table": o.tableNumber ? `T-${o.tableNumber}` : "-",
            "Items (Qty)": o.items.reduce((acc: number, i: any) => acc + (i.quantity || 0), 0),
            "Total Payment": `${o.totalAmount.toLocaleString()} ETB`,
            "Status": o.status,
            "Date/Time": new Date(o.createdAt).toLocaleString(),
            "Cashier": o.createdBy?.name || "Unknown",
            "Floor": o.floorNumber || "Global"
        }))
        ReportExporter.exportToWord({ title: "Order History Report", period: timeRange, headers: ["Item Names", "Table", "Items (Qty)", "Total Payment", "Status", "Date/Time", "Cashier", "Floor"], data, metadata: { companyName: settings.app_name || "Prime Addis" } })
    }

    const exportCategoryCSV = (mainCat: 'Food' | 'Drinks') => {
        if (loadingSlide || (menuItems.length === 0 && orders.length > 0)) {
            alert("Please wait for menu data to finish loading...")
            return
        }

        console.log(`Exporting ${mainCat} CSV... Total orders: ${filteredOrders.length}`)

        // 1. Build normalized category map for fallback
        const catMap = new Map()
        menuItems.forEach(m => {
            if (m.category && m.mainCategory) {
                catMap.set(m.category.trim().toLowerCase(), m.mainCategory.trim().toLowerCase())
            }
        })

        const targetMainCat = mainCat.toLowerCase()

        // 2. Flatten orders into items and filter by mainCategory
        const flattenedData: any[] = []
        filteredOrders.forEach(order => {
            // Filter out cancelled/deleted for sales reports
            if (order.status === 'cancelled' || order.isDeleted) return

            order.items.forEach((item: any) => {
                const itemCat = (item.category || "").trim().toLowerCase()
                const mappedMainCat = catMap.get(itemCat) || 'food' // Default to food if unknown

                // Prioritize persisted mainCategory, then mapped, then food
                const itemMainCat = (item.mainCategory || mappedMainCat).trim().toLowerCase()

                if (itemMainCat === targetMainCat) {
                    const qty = Number(item.quantity) || 0
                    const price = Number(item.price) || 0
                    flattenedData.push({
                        "Date": new Date(order.createdAt).toLocaleDateString(),
                        "Time": new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        "Order#": (order.orderNumber || order._id.slice(-6)),
                        "Table": order.tableNumber || "-",
                        "Item": item.name,
                        "Category": item.category || "-",
                        "Qty": qty,
                        "Unit Price": price,
                        "Total": (qty * price),
                        "Cashier": order.createdBy?.name || "Unknown",
                        "Floor": order.floorNumber || "Global"
                    })
                }
            })
        })

        console.log(`Flattened ${mainCat} items: ${flattenedData.length}`)

        if (flattenedData.length === 0) {
            alert(`No ${mainCat} items found in completed/active orders for this period.`)
            return
        }

        ReportExporter.exportToCSV({
            title: `${mainCat} Sales Report`,
            period: timeRange,
            headers: ["Date", "Time", "Order#", "Table", "Item", "Category", "Qty", "Unit Price", "Total", "Cashier", "Floor"],
            data: flattenedData
        })
    }

    const exportAllToCSV = () => {
        console.log(`Exporting All orders CSV... Orders count: ${filteredOrders.length}`)
        const flattenedData: any[] = []
        filteredOrders.forEach(order => {
            if (order.status === 'cancelled' || order.isDeleted) return

            order.items.forEach((item: any) => {
                const qty = Number(item.quantity) || 0
                const price = Number(item.price) || 0
                flattenedData.push({
                    "Date": new Date(order.createdAt).toLocaleDateString(),
                    "Time": new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    "Order#": (order.orderNumber || order._id.slice(-6)),
                    "Table": order.tableNumber || "-",
                    "Item": item.name,
                    "Category": item.category || "-",
                    "Qty": qty,
                    "Unit Price": price,
                    "Total": (qty * price),
                    "Cashier": order.createdBy?.name || "Unknown",
                    "Floor": order.floorNumber || "Global"
                })
            })
        })

        console.log(`Total flattened items: ${flattenedData.length}`)

        if (flattenedData.length === 0) {
            alert("No orders found to export.")
            return
        }

        ReportExporter.exportToCSV({
            title: "All Sales Report",
            period: timeRange,
            headers: ["Date", "Time", "Order#", "Table", "Item", "Category", "Qty", "Unit Price", "Total", "Cashier", "Floor"],
            data: flattenedData
        })
    }

    const exportMenuSalesCSV = (mainCat: 'Food' | 'Drinks') => {
        const data = menuItemSales
            .filter((item) => item.mainCategory === mainCat)
            .map((item) => ({
                "Menu Item": item.name,
                "Cashier": item.cashier,
                "Sub Category": item.category,
                "Quantity Sold": item.quantity,
                "Total Revenue": `${item.revenue.toLocaleString()} ETB`
            }))

        if (data.length === 0) {
            alert(`No ${mainCat} sales data to export for this period.`)
            return
        }

        ReportExporter.exportToCSV({
            title: `${mainCat} Menu Item Sales Summary`,
            period: timeRange,
            headers: ["Menu Item", "Sub Category", "Quantity Sold", "Total Revenue"],
            data
        })
    }

    const exportInventoryReport = () => {
        const data = (stockUsageData?.stockAnalysis || stockItems || []).map((item: any) => {
            const costPrice = item.weightedAvgCost ?? item.averagePurchasePrice ?? 0
            const sellingPrice = item.currentUnitCost ?? item.unitCost ?? 0
            const closingQuantity = item.closingStock ?? item.quantity ?? 0
            const consumedCount = item.consumed ?? 0
            const totalHandled = item.totalLifetimePurchased ?? (closingQuantity + consumedCount)
            const totalPurchaseValue = item.totalLifetimeInvestment ?? (totalHandled * costPrice)
            const potentialRevenue = closingQuantity * sellingPrice
            const isLow = item.isLowStock || (closingQuantity <= (item.minLimit || 5))
            return {
                "Item Name": item.name,
                "Unit Cost": Math.round(sellingPrice),
                "Quantity": totalHandled,
                "Total Purchase": totalPurchaseValue,
                "Consumed": consumedCount,
                "Remains": closingQuantity,
                "Potential Rev.": potentialRevenue,
                "Status": isLow ? "Low Stock" : "OK"
            }
        })
        ReportExporter.exportToCSV({ title: "Inventory Investment Report", period: timeRange, headers: ["Item Name", "Unit Cost", "Quantity", "Total Purchase", "Consumed", "Remains", "Potential Rev.", "Status"], data })
    }

    if (!initialized && loadingSlide) {
        return (
            <ProtectedRoute requiredRoles={["admin"]} requiredPermissions={["reports:view", "reports:financial_summary", "reports:order_history", "reports:inventory_investment", "reports:store_investment", "reports:menu_item_sales", "reports:cashier_insights"]}>
                <div className="min-h-screen bg-[#0f1110] p-6 text-white">
                    <div className="max-w-7xl mx-auto space-y-4">
                        <BentoNavbar />
                        <div className="bg-[#151716] rounded-xl p-5 border border-white/5 animate-pulse h-20" />
                        <div className="flex gap-4">
                            <div className="hidden md:flex flex-col gap-2 w-52 shrink-0">
                                {SLIDES.map(s => <div key={s.id} className="h-14 bg-[#151716] rounded-2xl border border-white/5 animate-pulse" />)}
                            </div>
                            <div className="flex-1 bg-[#151716] rounded-2xl border border-white/5 animate-pulse min-h-[400px]" />
                        </div>
                    </div>
                </div>
            </ProtectedRoute>
        )
    }

    if (!SLIDES || SLIDES.length === 0) {
        return (
            <ProtectedRoute requiredRoles={["admin"]} requiredPermissions={["reports:view", "reports:financial_summary", "reports:order_history", "reports:inventory_investment", "reports:store_investment", "reports:menu_item_sales", "reports:cashier_insights"]}>
                <div className="min-h-screen bg-[#0f1110] flex items-center justify-center text-white">
                    <p className="text-gray-500 text-sm">No report sections available. Please check permissions.</p>
                </div>
            </ProtectedRoute>
        )
    }

    const slide = SLIDES[activeSlide] || SLIDES[0]
    const SlideIcon = slide.icon

    return (
        <ProtectedRoute requiredRoles={["admin"]} requiredPermissions={["reports:view", "reports:financial_summary", "reports:order_history", "reports:inventory_investment", "reports:store_investment", "reports:menu_item_sales", "reports:cashier_insights"]}>
            <style>{`
                @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
                @keyframes slideInLeft  { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
                .slide-enter-right { animation: slideInRight 0.26s ease forwards; }
                .slide-enter-left  { animation: slideInLeft  0.26s ease forwards; }
            `}</style>

            <div className="min-h-screen bg-[#0f1110] text-white selection:bg-[#c5a059] selection:text-[#0f1110]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 md:py-6 space-y-4">
                    <BentoNavbar />

                    {/* Top Header */}
                    <div className="bg-[#151716] rounded-xl p-4 md:p-5 shadow-2xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-playfair italic font-bold text-[#f3cf7a]">Business Intelligence</h1>
                            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-0.5">Consolidated reports · {SLIDES[activeSlide].label}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            {/* Time Range */}
                            <div className="flex bg-[#0f1110] p-1 rounded-xl overflow-x-auto hide-scrollbar w-full sm:w-auto border border-white/5">
                                {["today", "week", "month", "year"].map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => setTimeRange(r)}
                                        className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${timeRange === r ? "bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] shadow-[0_0_10px_rgba(212,175,55,0.2)]" : "text-gray-500 hover:text-white"}`}
                                    >{r}</button>
                                ))}

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <button
                                            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${timeRange === 'custom' ? "bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] shadow-[0_0_10px_rgba(212,175,55,0.2)]" : "text-gray-500 hover:text-white"}`}
                                        >
                                            <CalendarIcon size={12} />
                                            {timeRange === 'custom' && selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Specific Date"}
                                        </button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-[#151716] text-white border border-[#d4af37]/30 shadow-2xl shadow-[#d4af37]/10 rounded-2xl z-50" align="end">
                                        <Calendar
                                            mode="single"
                                            selected={selectedDate}
                                            onSelect={(date) => {
                                                setSelectedDate(date)
                                                setTimeRange('custom')
                                                // Trigger fetch for custom date
                                                if (date && token) {
                                                    const d = new Date(date)
                                                    const startDateStr = new Date(new Date(d).setHours(0,0,0,0)).toISOString()
                                                    const endDateStr   = new Date(new Date(d).setHours(23,59,59,999)).toISOString()
                                                    setLoadingSlide(true)
                                                    Promise.all([
                                                        fetch(`/api/reports/sales?period=custom&startDate=${startDateStr}&endDate=${endDateStr}`, { headers: { Authorization: `Bearer ${token}` } }),
                                                        fetch(`/api/orders?startDate=${startDateStr}&endDate=${endDateStr}&includeDeleted=true&limit=1000`, { headers: { Authorization: `Bearer ${token}` } }),
                                                        fetch(`/api/reports/bedroom-revenue?period=custom&startDate=${startDateStr}&endDate=${endDateStr}`, { headers: { Authorization: `Bearer ${token}` } }),
                                                    ]).then(async ([sRes, oRes, bRes]) => {
                                                        if (sRes.ok) setPeriodData(await sRes.json())
                                                        if (oRes.ok) setOrders(await oRes.json())
                                                        if (bRes.ok) {
                                                            const bd = await bRes.json()
                                                            setReceptionRevenue(bd.totalRevenue || 0)
                                                        }
                                                    }).finally(() => setLoadingSlide(false))
                                                }
                                            }}
                                            initialFocus
                                            captionLayout="dropdown"
                                            fromYear={2020}
                                            toYear={new Date().getFullYear() + 2}
                                            className="text-white"
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <button onClick={() => window.print()} className="bg-[#0f1110] border border-white/5 text-gray-500 p-2 rounded-xl hover:text-[#d4af37] hover:border-[#d4af37]/30 transition-all shadow-sm">
                                <Printer size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Main Layout: Side Tabs + Slide Panel */}
                    <div className="flex flex-col md:flex-row gap-4 items-stretch">

                        {/* Vertical Side Tab Bar */}
                        <div className="hidden md:flex flex-col gap-2 w-52 shrink-0">
                            {SLIDES.map((s, idx) => {
                                const Icon = s.icon
                                const isActive = idx === activeSlide
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => goToSlide(idx)}
                                        className={`flex items-center gap-3 px-4 py-4 rounded-2xl font-bold text-sm text-left transition-all duration-200 group border ${isActive
                                            ? `${s.bg} text-[#0f1110] border-transparent shadow-[0_0_15px_rgba(212,175,55,0.2)] scale-[1.02]`
                                            : "bg-[#151716] text-gray-500 hover:text-white border-white/5 hover:border-[#d4af37]/30"
                                            }`}
                                    >
                                        <Icon size={18} className={isActive ? "text-[#0f1110]" : "text-gray-500 group-hover:text-[#d4af37]"} />
                                        <span className={`leading-tight text-[10px] font-bold uppercase tracking-widest ${isActive ? "text-[#0f1110]" : ""}`}>{s.label}</span>
                                        {isActive && <ChevronRight size={14} className="ml-auto text-[#0f1110]/70" />}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Mobile Horizontal Tab Bar */}
                        <div className="md:hidden flex gap-2 overflow-x-auto pb-4 hide-scrollbar w-full px-1">
                            {SLIDES.map((s, idx) => {
                                const Icon = s.icon
                                const isActive = idx === activeSlide
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => goToSlide(idx)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-[10px] uppercase tracking-widest whitespace-nowrap transition-all shrink-0 ${isActive
                                            ? `${s.bg} text-[#0f1110] border-transparent shadow-[0_0_15px_rgba(212,175,55,0.2)]`
                                            : "bg-[#151716] text-gray-500 border-white/5"
                                            }`}
                                    >
                                        <Icon size={14} />
                                        {s.label}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Slide Panel */}
                        <div className="flex-1 min-w-0 overflow-hidden">
                            {/* Thin refresh indicator */}
                            {loadingSlide && (
                                <div className="h-0.5 w-full bg-[#151716] rounded-full mb-3 overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] animate-pulse rounded-full" style={{ width: "60%" }} />
                                </div>
                            )}
                            <div
                                key={activeSlide}
                                className={`${!animating
                                    ? direction === "right" ? "slide-enter-right" : "slide-enter-left"
                                    : "opacity-0"
                                    }`}
                            >
                                {/* ── FINANCIAL SUMMARY ── */}
                                {slide.id === "financial" && (
                                    <div className="bg-[#151716] rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/5 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-[#0f1110] border border-[#d4af37]/30 rounded-full flex items-center justify-center text-[#f3cf7a]">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-playfair italic font-bold text-white">Financial Summary</h2>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Period · {timeRange}</p>
                                                </div>
                                            </div>
                                            <button onClick={exportFinancialReport} className="flex items-center gap-2 text-[#d4af37] hover:text-[#f3cf7a] font-bold text-[10px] uppercase tracking-widest transition-colors">
                                                <Download size={14} /> Export
                                            </button>
                                        </div>

                                        {/* Desktop Table */}
                                        <div className="hidden md:block overflow-x-auto border border-white/5 rounded-2xl bg-[#0f1110]">
                                            <table className="w-full text-left">
                                                <thead className="bg-[#151716] text-gray-400 uppercase text-[10px] font-bold tracking-widest border-b border-white/5">
                                                    <tr>
                                                        <th className="p-4">Metric</th>
                                                        <th className="p-4 text-center">Type</th>
                                                        <th className="p-4 text-right">Amount</th>
                                                        <th className="p-4">Description</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 font-bold text-sm">
                                                    <tr className="hover:bg-white/5 transition-colors">
                                                        <td className="p-4 text-white">Total Revenue</td>
                                                        <td className="p-4 text-center"><span className="bg-[#1a2e20] text-[#4ade80] border border-[#4ade80]/30 py-1 px-3 rounded-md text-[9px] font-black uppercase tracking-widest">INCOME</span></td>
                                                        <td className="p-4 text-right font-black text-[#4ade80]">+{totalRevenue.toLocaleString()} ETB</td>
                                                        <td className="p-4 text-gray-500 text-xs text-medium">Combined value of completed orders and approved room bookings for this period</td>
                                                    </tr>
                                                    <tr className="hover:bg-white/5 transition-colors">
                                                        <td className="p-4 text-gray-300 pl-8 flex items-center gap-2"><div className="w-1.5 h-4 bg-blue-400 rounded-full"></div> Reception Revenue</td>
                                                        <td className="p-4 text-center"><span className="bg-blue-950/30 text-blue-400 border border-blue-500/30 py-1 px-3 rounded-md text-[9px] font-black uppercase tracking-widest">INCOME</span></td>
                                                        <td className="p-4 text-right font-black text-blue-400">+{receptionRevenue.toLocaleString()} ETB</td>
                                                        <td className="p-4 text-gray-500 text-xs">Approved room bookings for this period</td>
                                                    </tr>
                                                    <tr className="hover:bg-white/5 transition-colors">
                                                        <td className="p-4 text-gray-300 pl-8 flex items-center gap-2"><div className="w-1.5 h-4 bg-[#f3cf7a] rounded-full"></div> Food Revenue</td>
                                                        <td className="p-4 text-center"><span className="bg-[#b38822]/10 text-[#f3cf7a] border border-[#d4af37]/30 py-1 px-3 rounded-md text-[9px] font-black uppercase tracking-widest">BREAKDOWN</span></td>
                                                        <td className="p-4 text-right font-bold text-[#f3cf7a]">{foodRevenue.toLocaleString()} ETB</td>
                                                        <td className="p-4 text-gray-500 text-xs text-medium">Revenue from Food items</td>
                                                    </tr>
                                                    <tr className="hover:bg-white/5 transition-colors">
                                                        <td className="p-4 text-gray-300 pl-8 flex items-center gap-2"><div className="w-1.5 h-4 bg-[#b38822] rounded-full"></div> Drinks Revenue</td>
                                                        <td className="p-4 text-center"><span className="bg-[#b38822]/10 text-[#f3cf7a] border border-[#d4af37]/30 py-1 px-3 rounded-md text-[9px] font-black uppercase tracking-widest">BREAKDOWN</span></td>
                                                        <td className="p-4 text-right font-bold text-[#b38822]">{drinksRevenue.toLocaleString()} ETB</td>
                                                        <td className="p-4 text-gray-500 text-xs text-medium">Revenue from Drinks items</td>
                                                    </tr>

                                                    {/* Cashier Breakdown */}
                                                    {cashierRevenue.length > 0 && (
                                                        <>
                                                            <tr className="bg-white/[0.02]">
                                                                <td colSpan={4} className="p-2 pl-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Cashier Contributions</td>
                                                            </tr>
                                                            {cashierRevenue.map((c, idx) => (
                                                                <tr key={idx} className="hover:bg-white/5 transition-colors border-l-2 border-[#d4af37]/30">
                                                                    <td className="p-4 text-gray-400 pl-10 flex items-center gap-2">
                                                                        <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                                                                        {c.name}
                                                                    </td>
                                                                    <td className="p-4 text-center">
                                                                        <span className="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">CASHIER SALES</span>
                                                                    </td>
                                                                    <td className="p-4 text-right font-medium text-gray-300">
                                                                        {c.amount.toLocaleString()} <span className="text-[10px]">Br</span>
                                                                    </td>
                                                                    <td className="p-4 text-gray-500 text-[10px] italic">
                                                                        <div>{((c.amount / (orderRevenue || 1)) * 100).toFixed(1)}% of order revenue</div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </>
                                                    )}
                                                    <tr className="hover:bg-white/5 transition-colors">
                                                        <td className="p-4 text-white flex items-center justify-between">
                                                            Operational Expenses
                                                        </td>
                                                        <td className="p-4 text-center"><span className="bg-red-950/30 text-red-500 border border-red-500/30 py-1 px-3 rounded-md text-[9px] font-black uppercase tracking-widest">EXPENSE</span></td>
                                                        <td className="p-4 text-right font-black text-red-500">-{totalOperationalExpenses.toLocaleString()} ETB</td>
                                                        <td className="p-4 text-gray-500 text-xs text-medium">Rent, Utilities, and other running costs</td>
                                                    </tr>
                                                    <tr className="hover:bg-white/5 transition-colors">
                                                        <td className="p-4 text-white flex items-center justify-between">
                                                            Period Investment (Stock)
                                                        </td>
                                                        <td className="p-4 text-center"><span className="bg-red-950/30 text-red-500 border border-red-500/30 py-1 px-3 rounded-md text-[9px] font-black uppercase tracking-widest">EXPENSE</span></td>
                                                        <td className="p-4 text-right font-black text-red-500">-{periodInvestment.toLocaleString()} ETB</td>
                                                        <td className="p-4 text-gray-500 text-xs text-medium">Restocks + Historical bulk purchases</td>
                                                    </tr>
                                                    <tr className="hover:bg-white/5 transition-colors">
                                                        <td className="p-4 text-white">Period Net Profit</td>
                                                        <td className="p-4 text-center"><span className="bg-[#1a2e20] text-[#4ade80] border border-[#4ade80]/30 py-1 px-3 rounded-md text-[9px] font-black uppercase tracking-widest">PROFIT</span></td>
                                                        <td className={`p-4 text-right font-black ${periodProfit >= 0 ? "text-[#4ade80]" : "text-red-500"}`}>{periodProfit.toLocaleString()} ETB</td>
                                                        <td className="p-4 text-gray-500 text-xs text-medium">Revenue - Total Expenses (Stock + OpEx)</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Cards */}
                                        <div className="md:hidden space-y-4">
                                            <div className="p-4 rounded-2xl bg-[#0f1110] border border-white/5">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-black text-[#4ade80] uppercase tracking-widest">Income</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Total Revenue</span>
                                                </div>
                                                <p className="text-2xl font-black text-white">+{totalRevenue.toLocaleString()} <span className="text-xs text-[#d4af37]">ETB</span></p>
                                                {receptionRevenue > 0 && (
                                                    <p className="text-[10px] text-blue-400 mt-1">+{receptionRevenue.toLocaleString()} ETB reception</p>
                                                )}
                                            </div>
                                            <div className="p-4 rounded-2xl bg-[#0f1110] border border-white/5">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Expense</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Operational Expenses</span>
                                                    </div>
                                                </div>
                                                <p className="text-2xl font-black text-white">-{totalOperationalExpenses.toLocaleString()} <span className="text-xs text-[#d4af37]">ETB</span></p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-[#0f1110] border border-white/5">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Expense</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Period Investment (Stock)</span>
                                                    </div>
                                                </div>
                                                <p className="text-2xl font-black text-white">-{periodInvestment.toLocaleString()} <span className="text-xs text-[#d4af37]">ETB</span></p>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-[#0f1110] border border-[#d4af37]/30 shadow-[0_0_15px_rgba(212,175,55,0.05)]">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[10px] font-black text-[#f3cf7a] uppercase tracking-widest">Profit</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Period Profit</span>
                                                </div>
                                                <p className={`text-2xl font-black ${periodProfit >= 0 ? "text-[#f3cf7a]" : "text-red-500"}`}>{periodProfit.toLocaleString()} <span className="text-xs text-[#d4af37]">ETB</span></p>
                                            </div>
                                            {/* Removed Lifetime Investment card */}
                                        </div>
                                    </div>
                                )}

                                {/* ── ORDER HISTORY ── */}
                                {slide.id === "orders" && (
                                    <div className="bg-[#151716] rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/5 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-[#0f1110] border border-[#d4af37]/30 rounded-full flex items-center justify-center text-[#f3cf7a]">
                                                    <ShoppingCart size={20} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-playfair italic font-bold text-white">Order History</h2>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{filteredOrders.length} Orders · {timeRange}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                                <button onClick={() => exportCategoryCSV('Food')} className="flex items-center gap-2 text-[#d4af37] hover:text-[#f3cf7a] font-bold text-[10px] sm:text-xs transition-all bg-[#0f1110] px-2 sm:px-3 py-1.5 rounded-lg border border-[#d4af37]/30 shadow-sm active:scale-95">
                                                    <Download size={12} className="sm:w-3.5 sm:h-3.5" /> Food CSV
                                                </button>
                                                <button onClick={() => exportCategoryCSV('Drinks')} className="flex items-center gap-2 text-[#d4af37] hover:text-[#f3cf7a] font-bold text-[10px] sm:text-xs transition-all bg-[#0f1110] px-2 sm:px-3 py-1.5 rounded-lg border border-[#d4af37]/30 shadow-sm active:scale-95">
                                                    <Download size={12} className="sm:w-3.5 sm:h-3.5" /> Drinks CSV
                                                </button>
                                                <button onClick={exportAllToCSV} className="flex items-center gap-2 text-white hover:text-gray-300 font-bold text-[10px] sm:text-xs transition-all bg-[#0f1110] px-2 sm:px-3 py-1.5 rounded-lg border border-white/10 shadow-sm active:scale-95 ml-auto sm:ml-0">
                                                    <Download size={12} className="sm:w-3.5 sm:h-3.5" /> All CSV
                                                </button>
                                            </div>
                                        </div>

                                        {/* Sub Tabs for Order History */}
                                        <div className="flex bg-[#0f1110] p-1 rounded-xl w-full sm:w-max border border-white/5">
                                            {['All', 'Food', 'Drinks'].map((tab) => (
                                                <button
                                                    key={tab}
                                                    onClick={() => setOrderHistoryTab(tab as any)}
                                                    className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap ${orderHistoryTab === tab ? "bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] shadow-[0_0_15px_rgba(212,175,55,0.2)]" : "text-gray-500 hover:text-white"}`}
                                                >
                                                    {tab} Orders
                                                </button>
                                            ))}
                                        </div>

                                        <div className="hidden lg:block max-h-[560px] overflow-y-auto border border-white/5 rounded-2xl bg-[#0f1110] custom-scrollbar">
                                            <table className="w-full text-left">
                                                <thead className="bg-[#151716] text-gray-400 uppercase text-[10px] font-bold tracking-widest sticky top-0 z-10 border-b border-white/5">
                                                    <tr>
                                                        <th className="p-4">Item Names</th>
                                                        <th className="p-4 text-center">Table</th>
                                                        <th className="p-4 text-center">Qty</th>
                                                        {orderHistoryTab !== 'Drinks' && <th className="p-4 text-right text-[#f3cf7a] font-bold">Food</th>}
                                                        {orderHistoryTab !== 'Food' && <th className="p-4 text-right text-[#d4af37] font-bold">Drinks</th>}
                                                        <th className="p-4 text-right font-black">Total Payment</th>
                                                        <th className="p-4 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 font-bold text-sm">
                                                    {filteredOrders
                                                        .filter(order => {
                                                            if (orderHistoryTab === 'All') return true;
                                                            return order.items.some((i: any) => i.mainCategory === orderHistoryTab);
                                                        })
                                                        .length === 0 ? (
                                                        <tr><td colSpan={orderHistoryTab === 'All' ? 7 : 6} className="p-8 text-center text-gray-500 italic font-medium">No {orderHistoryTab.toLowerCase()} orders found for this period.</td></tr>
                                                    ) : (
                                                        filteredOrders
                                                            .filter(order => {
                                                                if (orderHistoryTab === 'All') return true;
                                                                return order.items.some((i: any) => i.mainCategory === orderHistoryTab);
                                                            })
                                                            .map((order) => {
                                                                // If Tab is Food or Drinks, ONLY show items of that category
                                                                const displayItems = orderHistoryTab === 'All'
                                                                    ? order.items
                                                                    : order.items.filter((i: any) => i.mainCategory === orderHistoryTab)

                                                                const itemNames = displayItems.map((i: any) => i.name).join(", ")
                                                                const totalQty = displayItems.reduce((acc: number, i: any) => acc + (i.quantity || 0), 0)
                                                                const orderFoodRev = displayItems.filter((i: any) => i.mainCategory === 'Food').reduce((s: number, i: any) => s + ((i.price || 0) * (i.quantity || 0)), 0)
                                                                const orderDrinksRev = displayItems.filter((i: any) => i.mainCategory === 'Drinks').reduce((s: number, i: any) => s + ((i.price || 0) * (i.quantity || 0)), 0)
                                                                const rowTotalPayment = orderHistoryTab === 'All' ? order.totalAmount : (orderFoodRev + orderDrinksRev)

                                                                return (
                                                                    <tr key={order._id} className="hover:bg-white/5 transition-colors">
                                                                        <td className="p-4 text-white w-1/3 min-w-[250px]">
                                                                            <div className="leading-relaxed whitespace-pre-wrap">{itemNames}</div>
                                                                            <div className="text-[10px] text-[#d4af37] font-bold mt-1 uppercase tracking-widest">{new Date(order.createdAt).toLocaleString()}</div>
                                                                        </td>
                                                                        <td className="p-4 text-center text-gray-400 whitespace-nowrap">{order.tableNumber ? `T-${order.tableNumber}` : "Takeaway"}</td>
                                                                        <td className="p-4 text-center text-white">{totalQty} <span className="text-[10px] text-gray-500 uppercase tracking-widest">units</span></td>
                                                                        {orderHistoryTab !== 'Drinks' && <td className="p-4 text-right text-[#f3cf7a] font-bold">{orderFoodRev > 0 ? orderFoodRev.toLocaleString() : "-"}</td>}
                                                                        {orderHistoryTab !== 'Food' && <td className="p-4 text-right text-[#d4af37] font-bold">{orderDrinksRev > 0 ? orderDrinksRev.toLocaleString() : "-"}</td>}
                                                                        <td className="p-4 text-right">
                                                                            <div className="font-black text-white">{rowTotalPayment.toLocaleString()} Br</div>
                                                                            <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{order.paymentMethod || "CASH"}</div>
                                                                        </td>
                                                                        <td className="p-4 text-center uppercase tracking-widest text-[9px]">
                                                                            <span className={`px-2 py-1 border rounded-md font-black ${order.status === 'completed' ? 'bg-[#1a2e20] text-[#4ade80] border-[#4ade80]/30' : order.status === 'cancelled' ? 'bg-red-950/30 text-red-500 border-red-500/30' : 'bg-[#b38822]/10 text-[#f3cf7a] border-[#d4af37]/30'}`}>{order.status}</span>
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Order Cards */}
                                        <div className="lg:hidden space-y-3">
                                            {filteredOrders
                                                .filter(order => {
                                                    if (orderHistoryTab === 'All') return true;
                                                    return order.items.some((i: any) => i.mainCategory === orderHistoryTab);
                                                })
                                                .length === 0 ? (
                                                <div className="p-8 text-center text-gray-500 italic font-medium">No orders found.</div>
                                            ) : (
                                                filteredOrders
                                                    .filter(order => {
                                                        if (orderHistoryTab === 'All') return true;
                                                        return order.items.some((i: any) => i.mainCategory === orderHistoryTab);
                                                    })
                                                    .slice(0, 50).map((order) => {
                                                        const displayItems = orderHistoryTab === 'All'
                                                            ? order.items
                                                            : order.items.filter((i: any) => i.mainCategory === orderHistoryTab)

                                                        const itemNames = displayItems.map((i: any) => i.name).join(", ")
                                                        const orderFoodRev = displayItems.filter((i: any) => i.mainCategory === 'Food').reduce((s: number, i: any) => s + ((i.price || 0) * (i.quantity || 0)), 0)
                                                        const orderDrinksRev = displayItems.filter((i: any) => i.mainCategory === 'Drinks').reduce((s: number, i: any) => s + ((i.price || 0) * (i.quantity || 0)), 0)
                                                        const rowTotalPayment = orderHistoryTab === 'All' ? order.totalAmount : (orderFoodRev + orderDrinksRev)

                                                        return (
                                                            <div key={order._id} className="p-4 rounded-2xl bg-[#0f1110] border border-white/5 shadow-2xl">
                                                                <div className="flex justify-between items-start mb-2 border-b border-white/5 pb-2">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-playfair italic font-bold text-white line-clamp-1">{itemNames}</span>
                                                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">#{order._id.slice(-6)} · {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                                    </div>
                                                                    <span className={`px-2 py-0.5 border rounded-md text-[9px] font-black uppercase tracking-widest ${order.status === 'completed' ? 'bg-[#1a2e20] text-[#4ade80] border-[#4ade80]/30' : 'bg-[#b38822]/10 text-[#f3cf7a] border-[#d4af37]/30'}`}>{order.status}</span>
                                                                </div>
                                                                <div className="flex justify-between items-end mt-3">
                                                                    <div className="flex flex-col gap-2">
                                                                        <div className="flex items-center gap-2">
                                                                            {order.floorNumber && <span className="bg-[#151716] border border-[#d4af37]/30 text-[#d4af37] px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest">Floor #{order.floorNumber}</span>}
                                                                            {order.tableNumber && <span className="bg-[#151716] border border-white/5 text-gray-400 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest">T-{order.tableNumber}</span>}
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">{displayItems.reduce((s: any, i: any) => s + (i.quantity || 0), 0)} ITEMS</span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="text-lg font-black text-white">{rowTotalPayment.toLocaleString()} <span className="text-[10px] text-[#d4af37] uppercase tracking-widest mt-1 block">{order.paymentMethod || "CASH"}</span></span>
                                                                        {orderHistoryTab === 'All' && (
                                                                            <div className="flex flex-col items-end gap-1.5 mt-2">
                                                                                {orderFoodRev > 0 && <span className="text-[9px] text-[#f3cf7a] font-bold uppercase tracking-widest">Food: {orderFoodRev.toLocaleString()}</span>}
                                                                                {orderDrinksRev > 0 && <span className="text-[9px] text-[#d4af37] font-bold uppercase tracking-widest">Drinks: {orderDrinksRev.toLocaleString()}</span>}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    })
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ── INVENTORY INVESTMENT ── */}
                                {slide.id === "inventory" && (
                                    <div className="bg-[#151716] rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/5 space-y-6 flex flex-col h-full min-h-0">
                                        <div className="flex items-center justify-between shrink-0">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-[#0f1110] border border-[#d4af37]/30 rounded-full flex items-center justify-center text-[#f3cf7a]">
                                                    <Clock size={20} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-playfair italic font-bold text-white">Inventory Investment Details</h2>
                                                    {stockUsageData && (
                                                        <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 uppercase tracking-widest mt-0.5">
                                                            <AlertTriangle size={11} /> {stockUsageData.summary.lowStockItemsCount} Low Stock items
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <button onClick={exportInventoryReport} className="flex items-center gap-2 text-[#d4af37] hover:text-[#f3cf7a] font-bold text-[10px] uppercase tracking-widest transition-colors">
                                                <Download size={14} /> Export
                                            </button>
                                        </div>

                                        <div className="hidden lg:block flex-1 overflow-y-auto border border-white/5 rounded-2xl bg-[#0f1110] custom-scrollbar">
                                            <table className="w-full text-left">
                                                <thead className="bg-[#151716] text-gray-400 uppercase text-[10px] font-bold tracking-widest sticky top-0 z-10 border-b border-white/5">
                                                    <tr>
                                                        <th className="p-4">Item Name</th>
                                                        <th className="p-4 text-center text-[#d4af37]">Sell Price</th>
                                                        <th className="p-4 text-center">Remains</th>
                                                        <th className="p-4 text-center text-[#4ade80]">Investment</th>
                                                        <th className="p-4 text-center text-red-500">Usage</th>
                                                        <th className="p-4 text-right text-blue-400">Potential Value</th>
                                                        <th className="p-4 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 font-bold text-sm">
                                                    {(stockUsageData?.stockAnalysis || stockItems || [])
                                                        .filter((item: any) => item.openingStock > 0 || item.transferred > 0 || item.closingStock > 0 || item.consumed > 0 || item.quantity > 0)
                                                        .map((item: any, idx: number) => {
                                                            const costPrice = item.weightedAvgCost ?? item.averagePurchasePrice ?? 0
                                                            const sellingPrice = item.currentUnitCost ?? item.unitCost ?? 0
                                                            const remains = item.closingStock ?? item.quantity ?? 0
                                                            const consumedCount = item.consumed ?? 0
                                                            const totalHandled = item.transferred ?? (remains + consumedCount)
                                                            const totalPurchaseValue = item.transferredValue ?? (totalHandled * costPrice)
                                                            const isLow = item.isLowStock || (remains <= (item.minLimit || 5))
                                                            const potentialRevenue = remains * sellingPrice
                                                            return (
                                                                <tr key={idx} className={`hover:bg-white/5 transition-colors ${isLow ? 'bg-red-950/20' : ''}`}>
                                                                    <td className="p-4">
                                                                        <p className="font-playfair font-bold text-white">{item.name}</p>
                                                                        <p className="text-[9px] font-bold text-[#d4af37] uppercase tracking-widest mt-0.5">{item.category}</p>
                                                                    </td>
                                                                    <td className="p-4 text-center text-[#f3cf7a]">{Math.round(sellingPrice).toLocaleString()} <span className="text-[10px]">Br</span></td>
                                                                    <td className="p-4 text-center"><p className={`text-sm ${isLow ? 'text-red-500' : 'text-white'}`}>{remains} <span className="text-[10px] text-gray-500 uppercase tracking-widest">{item.unit}</span></p></td>
                                                                    <td className="p-4 text-center text-[#4ade80]">
                                                                        {totalPurchaseValue.toLocaleString()} <span className="text-[10px]">Br</span>
                                                                        <div className="text-[9px] text-[#4ade80]/60 font-bold uppercase tracking-widest mt-1">@{Math.round(costPrice)} avg</div>
                                                                    </td>
                                                                    <td className="p-4 text-center text-red-400">
                                                                        {consumedCount} <span className="text-[10px] text-red-500/60 uppercase font-bold tracking-widest">{item.unit}</span>
                                                                    </td>
                                                                    <td className="p-4 text-right text-blue-400">{potentialRevenue.toLocaleString()} <span className="text-[10px]">Br</span></td>
                                                                    <td className="p-4 text-center">
                                                                        <span className={`px-2 py-1 border rounded-md text-[9px] font-black uppercase tracking-widest ${isLow ? 'bg-red-950/30 text-red-500 border-red-500/30' : 'bg-[#1a2e20] text-[#4ade80] border-[#4ade80]/30'}`}>
                                                                            {isLow ? 'LOW' : 'OK'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Inventory Cards */}
                                        <div className="lg:hidden flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                                            {(stockUsageData?.stockAnalysis || stockItems || [])
                                                .filter((item: any) => item.openingStock > 0 || item.transferred > 0 || item.closingStock > 0 || item.consumed > 0 || item.quantity > 0)
                                                .map((item: any, idx: number) => {
                                                    const remains = item.closingStock ?? item.quantity ?? 0
                                                    const consumedCount = item.consumed ?? 0
                                                    const isLow = item.isLowStock || (remains <= (item.minLimit || 5))
                                                    const sellingPrice = item.currentUnitCost ?? item.unitCost ?? 0
                                                    const potentialRevenue = remains * sellingPrice
                                                    return (
                                                        <div key={idx} className={`p-4 rounded-2xl border ${isLow ? 'bg-[#0f1110] border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-[#0f1110] border-white/5 shadow-2xl'}`}>
                                                            <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-3">
                                                                <div>
                                                                    <p className="font-playfair font-bold text-white text-lg leading-tight">{item.name}</p>
                                                                    <p className="text-[10px] font-bold uppercase text-[#d4af37] tracking-widest mt-1">{item.category}</p>
                                                                </div>
                                                                <span className={`px-2 py-0.5 border rounded-md text-[9px] font-black uppercase tracking-widest ${isLow ? 'bg-red-950/30 text-red-500 border-red-500/30' : 'bg-[#1a2e20] text-[#4ade80] border-[#4ade80]/30'}`}>{isLow ? 'Low Stock' : 'Healthy'}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                                <div className="bg-[#151716] p-3 rounded-xl border border-white/5">
                                                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Stock Remains</p>
                                                                    <p className={`text-xl font-black ${isLow ? 'text-red-500' : 'text-white'}`}>{remains} <span className="text-[10px] text-gray-500 uppercase">{item.unit}</span></p>
                                                                </div>
                                                                <div className="bg-[#151716] p-3 rounded-xl border border-white/5">
                                                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Usage Count</p>
                                                                    <p className="text-xl font-black text-white">{consumedCount} <span className="text-[10px] text-gray-500 uppercase">{item.unit}</span></p>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                                                                <div>
                                                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Potential Rev.</p>
                                                                    <p className="text-lg font-black text-blue-400">{potentialRevenue.toLocaleString()} <span className="text-[10px] text-blue-400/60 font-bold uppercase tracking-widest">Br</span></p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Unit Price</p>
                                                                    <p className="text-lg font-black text-[#f3cf7a]">{sellingPrice.toLocaleString()} <span className="text-[10px] text-[#d4af37] font-bold uppercase tracking-widest">Br</span></p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                        </div>
                                    </div>
                                )}

                                {/* ── STORE INVESTMENT ── */}
                                {slide.id === "store" && (
                                    <div className="bg-[#151716] rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/5 space-y-6 flex flex-col h-full min-h-0">
                                        <div className="flex items-center justify-between shrink-0">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-[#0f1110] border border-[#d4af37]/30 rounded-full flex items-center justify-center text-[#f3cf7a]">
                                                    <Package size={20} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-playfair italic font-bold text-white">Store Investment Details</h2>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Bulk inventory overview</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="hidden lg:block flex-1 overflow-y-auto border border-white/5 rounded-2xl bg-[#0f1110] custom-scrollbar">
                                            <table className="w-full text-left">
                                                <thead className="bg-[#151716] text-gray-400 uppercase text-[10px] font-bold tracking-widest sticky top-0 z-10 border-b border-white/5">
                                                    <tr>
                                                        <th className="p-4">Item Name</th>
                                                        <th className="p-4 text-center text-[#d4af37]">Unit Cost</th>
                                                        <th className="p-4 text-center">In Store</th>
                                                        <th className="p-4 text-center text-[#4ade80]">Total Inv.</th>
                                                        <th className="p-4 text-center text-red-500">Transferred</th>
                                                        <th className="p-4 text-center">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5 font-bold text-sm">
                                                    {(stockUsageData?.stockAnalysis || stockItems || [])
                                                        .filter((item: any) => (item.storeQuantity || 0) > 0 || (item.purchased || 0) > 0 || (item.totalPurchased || 0) > 0 || (item.storeOpeningStock || 0) > 0)
                                                        .map((item: any, idx: number) => {
                                                            const costPrice = item.averagePurchasePrice || item.currentUnitCost || item.unitCost || 0
                                                            const remains = item.storeQuantity ?? 0
                                                            const transferredCount = item.transferred ?? 0
                                                            const totalPurchaseValue = item.storeClosingValue ?? (remains * costPrice)
                                                            const isLow = item.isLowStoreStock || (remains <= (item.storeMinLimit || 5)) && remains > 0
                                                            return (
                                                                <tr key={idx} className={`hover:bg-white/5 transition-colors ${isLow ? 'bg-red-950/20' : ''}`}>
                                                                    <td className="p-4">
                                                                        <p className="font-playfair font-bold text-white">{item.name}</p>
                                                                        <p className="text-[9px] font-bold text-[#d4af37] uppercase tracking-widest mt-0.5">{item.category}</p>
                                                                    </td>
                                                                    <td className="p-4 text-center text-[#f3cf7a]">{Math.round(costPrice).toLocaleString()} <span className="text-[10px]">Br</span></td>
                                                                    <td className="p-4 text-center"><p className={`text-sm ${isLow ? 'text-red-500' : 'text-white'}`}>{remains} <span className="text-[10px] text-gray-500 uppercase tracking-widest">{item.unit}</span></p></td>
                                                                    <td className="p-4 text-center text-[#4ade80]">{totalPurchaseValue.toLocaleString()} <span className="text-[10px]">Br</span></td>
                                                                    <td className="p-4 text-center text-red-400">{transferredCount} <span className="text-[10px] text-red-500/60 uppercase font-black tracking-widest">Moved</span></td>
                                                                    <td className="p-4 text-center"><span className={`px-2 py-1 border rounded-md text-[9px] font-black uppercase tracking-widest ${isLow ? 'bg-red-950/30 text-red-500 border-red-500/30' : 'bg-[#1a2e20] text-[#4ade80] border-[#4ade80]/30'}`}>{isLow ? 'LOW' : 'OK'}</span></td>
                                                                </tr>
                                                            )
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile Store Cards */}
                                        <div className="lg:hidden flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                                            {(stockUsageData?.stockAnalysis || stockItems || [])
                                                .filter((item: any) => (item.storeQuantity || 0) > 0 || (item.purchased || 0) > 0 || (item.totalPurchased || 0) > 0 || (item.storeOpeningStock || 0) > 0)
                                                .map((item: any, idx: number) => {
                                                    const costPrice = item.averagePurchasePrice || item.currentUnitCost || item.unitCost || 0
                                                    const remains = item.storeQuantity ?? 0
                                                    const transferredCount = item.transferred ?? 0
                                                    const totalPurchaseValue = item.storeClosingValue ?? (remains * costPrice)
                                                    const isLow = item.isLowStoreStock || (remains <= (item.storeMinLimit || 5)) && remains > 0
                                                    return (
                                                        <div key={idx} className={`p-4 rounded-2xl border ${isLow ? 'bg-[#0f1110] border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-[#0f1110] border-white/5 shadow-2xl'}`}>
                                                            <div className="flex justify-between items-start mb-3 border-b border-white/5 pb-3">
                                                                <div>
                                                                    <p className="font-playfair font-bold text-white text-lg leading-tight">{item.name}</p>
                                                                    <p className="text-[10px] font-bold uppercase text-[#d4af37] tracking-widest mt-1">{item.category}</p>
                                                                </div>
                                                                <span className={`px-2 py-0.5 border rounded-md text-[9px] font-black uppercase tracking-widest ${isLow ? 'bg-red-950/30 text-red-500 border-red-500/30' : 'bg-[#1a2e20] text-[#4ade80] border-[#4ade80]/30'}`}>{isLow ? 'Low Stock' : 'Healthy'}</span>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-4 mt-4">
                                                                <div className="bg-[#151716] p-3 rounded-xl border border-white/5">
                                                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Store Remains</p>
                                                                    <p className={`text-xl font-black ${isLow ? 'text-red-500' : 'text-white'}`}>{remains} <span className="text-[10px] text-gray-500 uppercase">{item.unit}</span></p>
                                                                </div>
                                                                <div className="bg-[#151716] p-3 rounded-xl border border-white/5">
                                                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Moved to Stock</p>
                                                                    <p className="text-xl font-black text-white">{transferredCount} <span className="text-[10px] text-gray-500 uppercase">Moved</span></p>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                                                                <div>
                                                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Inv</p>
                                                                    <p className="text-lg font-black text-[#4ade80]">{totalPurchaseValue.toLocaleString()} <span className="text-[10px] text-[#4ade80]/60 font-bold uppercase tracking-widest">Br</span></p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Unit Cost</p>
                                                                    <p className="text-lg font-black text-[#f3cf7a]">{Math.round(costPrice).toLocaleString()} <span className="text-[10px] text-[#d4af37] font-bold uppercase tracking-widest">Br</span></p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                        </div>
                                    </div>
                                )}

                                {/* ── MENU ITEM SALES ── */}
                                {slide.id === "menu-sales" && (
                                    <div className="bg-[#151716] rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/5 flex flex-col min-h-0 h-full space-y-6">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-[#0f1110] border border-[#d4af37]/30 rounded-full flex items-center justify-center text-[#f3cf7a]">
                                                    <ShoppingCart size={20} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-playfair italic font-bold text-white">Menu Item Sales</h2>
                                                    <div className="flex gap-2">
                                                        <div className="flex bg-[#0f1110] border border-white/5 p-1 rounded-xl mt-1">
                                                            {['Food', 'Drinks'].map((tab) => (
                                                                <button
                                                                    key={tab}
                                                                    onClick={() => setMenuSalesTab(tab as any)}
                                                                    className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${menuSalesTab === tab ? "bg-[#b38822]/20 text-[#f3cf7a] shadow-sm border border-[#d4af37]/30" : "text-gray-500 hover:text-gray-300"}`}
                                                                >
                                                                    {tab}
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <button 
                                                            onClick={() => exportMenuSalesCSV(menuSalesTab)}
                                                            className="flex items-center gap-1.5 px-3 py-1 rounded-xl mt-1 bg-[#1a2e20] text-[#4ade80] border border-[#4ade80]/30 font-bold text-[10px] uppercase tracking-widest hover:bg-[#1a2e20]/80 transition-all"
                                                        >
                                                            <Download size={12} /> CSV
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="relative w-full sm:w-64">
                                                <input
                                                    type="text"
                                                    placeholder="Search menu items..."
                                                    value={menuSearchTerm}
                                                    onChange={(e) => setMenuSearchTerm(e.target.value)}
                                                    className="pl-4 pr-4 py-2 bg-[#0f1110] border border-white/5 rounded-xl text-sm font-bold text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#d4af37] focus:border-[#d4af37] transition-all w-full custom-scrollbar"
                                                />
                                            </div>
                                        </div>

                                        <div className="hidden lg:block overflow-y-auto border border-white/5 rounded-2xl flex-1 custom-scrollbar bg-[#0f1110]">
                                            <table className="w-full text-left relative text-sm">
                                                <thead className="bg-[#151716] text-gray-400 uppercase text-[10px] font-bold tracking-widest sticky top-0 z-10 border-b border-white/5">
                                                    <tr>
                                                        <th className="p-4">Menu Item</th>
                                                        <th className="p-4">Cashier</th>
                                                        <th className="p-4 text-center text-[#4ade80]">Quantity Sold</th>
                                                        <th className="p-4 text-right text-[#d4af37]">Revenue Generated</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {menuItemSales
                                                        .filter((item) => item.mainCategory === menuSalesTab && item.name.toLowerCase().includes(menuSearchTerm.toLowerCase()))
                                                        .map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                                <td className="p-4">
                                                                    <p className="font-playfair font-bold text-white">{item.name}</p>
                                                                    <p className="text-[9px] font-bold text-[#d4af37] uppercase tracking-widest mt-0.5">{item.category}</p>
                                                                </td>
                                                                <td className="p-4">
                                                                    <p className="text-xs font-bold text-gray-400">{item.cashier}</p>
                                                                </td>
                                                                <td className="p-4 text-center">
                                                                    <span className="text-lg font-black text-[#4ade80]">{item.quantity}</span>
                                                                    <span className="text-[10px] text-gray-500 ml-1 uppercase tracking-widest">Sold</span>
                                                                </td>
                                                                <td className="p-4 text-right">
                                                                    <span className="text-md font-bold text-white">{item.revenue.toLocaleString()}</span>
                                                                    <span className="text-[10px] text-[#f3cf7a] ml-1 uppercase tracking-widest">Br</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile View */}
                                        <div className="lg:hidden space-y-4 flex-1 overflow-y-auto custom-scrollbar">
                                            {menuItemSales
                                                .filter((item) => item.mainCategory === menuSalesTab && item.name.toLowerCase().includes(menuSearchTerm.toLowerCase()))
                                                .map((item, idx) => (
                                                    <div key={idx} className="bg-[#0f1110] rounded-2xl p-4 border border-white/5 shadow-2xl flex flex-col space-y-3">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-playfair font-bold text-white text-lg">{item.name}</p>
                                                                <p className="text-[10px] font-bold text-[#d4af37] uppercase tracking-widest mt-0.5">{item.category}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Cashier</p>
                                                                <p className="text-xs font-bold text-[#f3cf7a]">{item.cashier}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center pt-3 border-t border-white/5">
                                                            <div>
                                                                <p className="text-xl font-black text-[#4ade80]">{item.quantity} <span className="text-[10px] text-gray-500 uppercase tracking-widest">Sold</span></p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-bold text-white">{item.revenue.toLocaleString()} <span className="text-[10px] text-[#f3cf7a] uppercase tracking-widest">Br</span></p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── CASHIER INSIGHTS ── */}
                                {slide.id === "cashier-insights" && (
                                    <div className="bg-[#151716] rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/5 space-y-6 flex flex-col h-full min-h-0">
                                        <div className="flex items-center justify-between shrink-0">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-[#0f1110] border border-[#d4af37]/30 rounded-full flex items-center justify-center text-[#f3cf7a]">
                                                    <Users size={20} />
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-playfair italic font-bold text-white">Cashier Analysis</h2>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Performance Breakdown</p>
                                                </div>
                                            </div>
                                            {cashierRevenue.length > 0 && (
                                                <div className="flex bg-[#0f1110] border border-white/5 p-1 rounded-xl">
                                                    <button 
                                                        onClick={() => setActiveCashierIdx(prev => Math.max(0, prev - 1))}
                                                        disabled={activeCashierIdx === 0}
                                                        className="p-1 px-2 text-gray-400 hover:text-white disabled:opacity-20"
                                                    >
                                                        <ChevronRight size={18} className="rotate-180" />
                                                    </button>
                                                    <div className="px-3 py-1 text-[10px] font-bold text-[#f3cf7a] uppercase tracking-widest flex items-center">
                                                        {activeCashierIdx + 1} / {cashierRevenue.length}
                                                    </div>
                                                    <button 
                                                        onClick={() => setActiveCashierIdx(prev => Math.min(cashierRevenue.length - 1, prev + 1))}
                                                        disabled={activeCashierIdx === cashierRevenue.length - 1}
                                                        className="p-1 px-2 text-gray-400 hover:text-white disabled:opacity-20"
                                                    >
                                                        <ChevronRight size={18} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {cashierRevenue.length > 0 ? (
                                            <div key={activeCashierIdx} className="flex-1 min-h-0 flex flex-col space-y-6 slide-enter-right">
                                                {/* Cashier Hero Card */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="bg-[#0f1110] p-6 rounded-2xl border border-[#d4af37]/30 relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                                            <User size={80} />
                                                        </div>
                                                        <p className="text-[#d4af37] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Staff Member</p>
                                                        <h3 className="text-2xl font-playfair italic font-bold text-white mb-4">{cashierRevenue[activeCashierIdx]?.name}</h3>
                                                        <div className="flex items-center gap-2 text-gray-400 text-xs font-bold">
                                                            <div className="w-2 h-2 bg-[#4ade80] rounded-full animate-pulse"></div>
                                                            Active this period
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="bg-[#0f1110] p-6 rounded-2xl border border-white/5">
                                                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Contribution</p>
                                                        <h3 className="text-3xl font-black text-[#4ade80]">{cashierRevenue[activeCashierIdx]?.amount.toLocaleString()} <span className="text-sm font-bold opacity-60">Br</span></h3>
                                                        <p className="text-[10px] text-gray-400 mt-2 font-bold uppercase tracking-tighter">
                                                            {((cashierRevenue[activeCashierIdx]?.amount / (orderRevenue || 1)) * 100).toFixed(1)}% of order revenue
                                                        </p>
                                                    </div>

                                                    <div className="bg-[#0f1110] p-6 rounded-2xl border border-white/5">
                                                        <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Orders Handled</p>
                                                        <h3 className="text-3xl font-black text-white">
                                                            {filteredOrders.filter(o => {
                                                                const oName = o.createdBy?.name || "Unknown";
                                                                const oFloor = o.floorNumber ? ` (${o.floorNumber})` : "";
                                                                return `${oName}${oFloor}` === cashierRevenue[activeCashierIdx]?.name && o.status !== 'cancelled' && !o.isDeleted;
                                                            }).length}
                                                        </h3>
                                                        <div className="mt-2 flex items-center gap-1 text-[#f3cf7a]">
                                                            <TrendingUp size={12} />
                                                            <span className="text-[10px] font-bold uppercase">Consistency OK</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Detailed Item Sales for this Cashier */}
                                                <div className="flex-1 min-h-0 overflow-y-auto border border-white/5 rounded-2xl bg-[#0f1110] custom-scrollbar">
                                                    <table className="w-full text-left relative">
                                                        <thead className="bg-[#151716] text-gray-400 uppercase text-[10px] font-bold tracking-widest sticky top-0 z-10 border-b border-white/5">
                                                            <tr>
                                                                <th className="p-4">Item Sold by {cashierRevenue[activeCashierIdx]?.name}</th>
                                                                <th className="p-4 text-center">Category</th>
                                                                <th className="p-4 text-center">Qty</th>
                                                                <th className="p-4 text-right">Revenue</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5">
                                                            {menuItemSales
                                                                .filter(item => item.cashier === cashierRevenue[activeCashierIdx]?.name)
                                                                .sort((a, b) => b.revenue - a.revenue)
                                                                .map((item, idx) => (
                                                                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                                        <td className="p-4 text-white font-bold">{item.name}</td>
                                                                        <td className="p-4 text-center text-xs text-gray-500">{item.category}</td>
                                                                        <td className="p-4 text-center font-black text-[#4ade80]">{item.quantity}</td>
                                                                        <td className="p-4 text-right font-bold text-gray-300">{item.revenue.toLocaleString()} <span className="text-[10px] opacity-40">Br</span></td>
                                                                    </tr>
                                                                ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-20">
                                                <AlertTriangle size={48} className="mb-4 opacity-20" />
                                                <p className="font-bold uppercase tracking-widest text-[10px]">No cashier data available for this period</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}
