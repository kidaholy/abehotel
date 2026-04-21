"use client"

import { useState, useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { CartSidebar, CartItem } from "@/components/cart-sidebar"
import { MenuItemCard } from "@/components/menu-item-card"
import { OrderAnimation } from "@/components/order-animation"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { ShoppingCart, RefreshCw, X, Search, Hash, Utensils, Coffee, Crown, Wine, ConciergeBell } from 'lucide-react'
import { motion, AnimatePresence } from "framer-motion"
import { useMemo, useRef } from "react"
import { useSettings } from "@/context/settings-context"
import { getReceiptHTML } from "@/components/receipt-template"
import { useMenu } from "@/context/menu-context"

interface MenuItem {
  _id: string
  menuId?: string
  name: string
  mainCategory?: string
  description?: string
  category: string
  price: number
  image?: string
  available?: boolean
  preparationTime?: number
  reportUnit?: string
  distributions?: string[]
  menuType?: string
}

type MenuTier = 'standard' | 'vip1' | 'vip2'

const TIER_CONFIG: Record<MenuTier, { label: string; color: string; icon: React.ReactNode; cacheKey: string }> = {
  standard: { label: 'Standard POS', color: '#2d5a41', icon: <Utensils size={18} />, cacheKey: 'pos_menu_cache_v2' },
  vip1:     { label: 'VIP 1 POS',    color: '#7c3aed', icon: <Crown size={18} />,   cacheKey: 'pos_menu_cache_v2' },
  vip2:     { label: 'VIP 2 POS',    color: '#b45309', icon: <Wine size={18} />,    cacheKey: 'pos_menu_cache_v2' },
}

interface POSPageProps {
  fixedTier: MenuTier
}

export function POSPage({ fixedTier }: POSPageProps) {
  const config = TIER_CONFIG[fixedTier]
  const { menuItems, menuLoading, menuError } = useMenu()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [mainCategoryFilter, setMainCategoryFilter] = useState<'Food' | 'Drinks'>('Food')
  const [orderNumber, setOrderNumber] = useState("")
  const [showOrderAnimation, setShowOrderAnimation] = useState(false)
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
  const [tableNumber, setTableNumber] = useState("")
  const [batchNumber, setBatchNumber] = useState("")
  const [isButcherOrder, setIsButcherOrder] = useState(false)
  const [isDrinksOrder, setIsDrinksOrder] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [idSearchTerm, setIdSearchTerm] = useState("")
  const [selectedFloorId, setSelectedFloorId] = useState<string>("")
  const [floors, setFloors] = useState<any[]>([])
  const [distributions, setDistributions] = useState<string[]>([])
  const [variantModal, setVariantModal] = useState<{ item: MenuItem } | null>(null)
  const [roomOrdersCount, setRoomOrdersCount] = useState(0)
  const [isRoomServiceHandler, setIsRoomServiceHandler] = useState(false)
  const prevRoomOrdersCount = useRef(0)
  const { token, user } = useAuth()
  const { t } = useLanguage()
  const { settings } = useSettings()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()
  const receiptRef = useRef<HTMLDivElement>(null)

  // Floor sync on mount
  useEffect(() => {
    const refreshUserProfile = async () => {
      if (!token) return
      try {
        const res = await fetch("/api/system-check", { headers: { Authorization: `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          if (data.user && data.user.floorId !== user?.floorId) {
            localStorage.setItem("user", JSON.stringify(data.user))
            window.location.reload()
          }
        }
      } catch (err) { console.error("Failed to refresh user profile", err) }
    }
    refreshUserProfile()
  }, [token, user])

  // Check assignment and poll for room orders
  useEffect(() => {
    if (!token || user?.role !== 'cashier') return
    const checkAndPoll = async () => {
      try {
        const floorsRes = await fetch("/api/floors", { headers: { Authorization: `Bearer ${token}` } })
        if (floorsRes.ok) {
          const floorsData = await floorsRes.json()
          setFloors(floorsData)
          const assigned = floorsData.some((f: any) => f.roomServiceCashierId === user.id)
          setIsRoomServiceHandler(assigned)
          
          if (assigned) {
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
          }
        }
      } catch { /* silent */ }
    }
    checkAndPoll()
    const interval = setInterval(checkAndPoll, 15000)
    return () => clearInterval(interval)
  }, [token, user?.role, user?.id])

  const isMeatOnly = useMemo(() => {
    return cartItems.length > 0 && cartItems.every(item =>
      item.category === "Butchery" || item.category === "Meat" || item.reportUnit === "kg"
    )
  }, [cartItems])

  const isDrinksOnly = useMemo(() => {
    return cartItems.length > 0 && cartItems.every(item =>
      item.category === "Drinks" || item.category === "Beverages" || item.category === "Coffee" || item.category === "Juice"
    )
  }, [cartItems])

  const handleAddToCart = (item: MenuItem) => {
    if (item.distributions && item.distributions.length > 0) {
      setVariantModal({ item })
      return
    }
    const existingItem = cartItems.find((ci) => ci.id === item._id)
    if (existingItem) {
      setCartItems(cartItems.map((ci) => (ci.id === item._id ? { ...ci, quantity: ci.quantity + 1 } : ci)))
    } else {
      setCartItems([...cartItems, {
        id: item._id, menuId: item.menuId, name: item.name, price: item.price,
        quantity: 1, category: item.category, reportUnit: item.reportUnit
      }])
    }
  }

  const handleSelectVariant = (item: MenuItem, distribution: string) => {
    const cartItemId = `${item._id}_${distribution}`
    const cartItemName = `${item.name} - ${distribution}`
    const existingItem = cartItems.find((ci) => ci.id === cartItemId)
    if (existingItem) {
      setCartItems(cartItems.map((ci) => (ci.id === cartItemId ? { ...ci, quantity: ci.quantity + 1 } : ci)))
    } else {
      setCartItems([...cartItems, {
        id: cartItemId, menuId: item.menuId, name: cartItemName, price: item.price,
        quantity: 1, category: item.category, reportUnit: item.reportUnit, distribution
      }])
    }
    setVariantModal(null)
  }

  const handleRemoveFromCart = (id: string) => setCartItems(cartItems.filter((item) => item.id !== id))

  const handleClearCart = async () => {
    const confirmed = await confirm({ title: "Clear Cart", message: "Are you sure you want to remove all items from your cart?", type: "warning" })
    if (confirmed) {
      setCartItems([])
      notify({ title: "Cart Cleared", message: "All items have been removed from your cart.", type: "success" })
    }
  }

  const handleQuantityChange = (id: string, quantity: number) => {
    if (quantity === 0) handleRemoveFromCart(id)
    else setCartItems(cartItems.map((item) => (item.id === id ? { ...item, quantity } : item)))
  }

  const handleCheckout = async () => {
    if (cartItems.length === 0) return
    if (!isButcherOrder && !isMeatOnly && !isDrinksOrder && !isDrinksOnly && !tableNumber) {
      notify({ title: "Table Required", message: "Please select a table number before checking out.", type: "error" })
      return
    }
    const vatRate = parseFloat(settings.vat_rate || "0.08")
    const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const subtotal = totalAmount / (1 + vatRate)
    const tax = totalAmount - subtotal
    const finalTableNumber = isButcherOrder ? "Buy&Go" : isDrinksOrder ? "Drinks" : tableNumber
    setIsCheckoutLoading(true)
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          items: cartItems.map((item) => ({ menuItemId: item.id, name: item.name, quantity: item.quantity, price: item.price, menuTier: fixedTier })),
          totalAmount, subtotal, tax, paymentMethod: "cash", status: "pending",
          tableNumber: finalTableNumber, floorId: selectedFloorId || user?.floorId,
          distributions,
          batchNumber: batchNumber.trim() || undefined
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setOrderNumber(data.orderNumber)
        setShowOrderAnimation(true)
        const snapshotCart = [...cartItems]
        setCartItems([])
        setTableNumber("")
        setBatchNumber("")
        setDistributions([])
        setIsButcherOrder(false)
        setIsDrinksOrder(false)
        setIsCheckoutLoading(false)
        localStorage.setItem('newOrderCreated', Date.now().toString())
        setTimeout(() => {
          if (settings.enable_cashier_printing === "false") { setShowOrderAnimation(false); return }
          
          const currentFloorId = selectedFloorId || user?.floorId
          const floor = floors.find(f => String(f._id) === String(currentFloorId))
          const floorName = floor ? (floor.name || `Floor #${floor.floorNumber}`) : ""

          const printSingleReceipt = (copyType: 'KITCHEN' | 'CUSTOMER') => {
            const receiptHtml = getReceiptHTML({
              orderNumber: data.orderNumber, tableNumber: finalTableNumber,
              batchNumber: batchNumber.trim() || undefined,
              distributions,
              items: snapshotCart.map(item => ({ menuId: item.menuId, name: item.name, quantity: item.quantity, price: item.price })),
              subtotal, tax, total: totalAmount, paperWidth: 80,
              appName: settings.app_name, appTagline: settings.app_tagline, vatRate: settings.vat_rate,
              floorName,
              copyType
            })
            const iframe = document.createElement('iframe')
            Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
            document.body.appendChild(iframe)
            const doc = iframe.contentWindow?.document
            if (doc) {
              doc.open(); doc.write(receiptHtml); doc.close()
              setTimeout(() => {
                iframe.contentWindow?.focus(); iframe.contentWindow?.print()
                setTimeout(() => { document.body.removeChild(iframe) }, 500)
              }, 300)
            }
          }

          // Trigger Kitchen Copy
          printSingleReceipt('KITCHEN')
          
          // Trigger Customer Copy after a short delay to avoid browser blocking multiple print calls
          setTimeout(() => {
            printSingleReceipt('CUSTOMER')
            setShowOrderAnimation(false)
          }, 1000)
        }, 800)
      } else {
        const errorData = await response.json()
        notify({ title: "Order Failed", message: errorData.message || "Failed to create the order. Please try again.", type: "error" })
      }
    } catch (err) {
      notify({ title: "Error", message: "Failed to create order. Please check your connection and try again.", type: "error" })
    } finally {
      setIsCheckoutLoading(false)
    }
  }

  // Filter to only this tier's items
  const tierItems = menuItems.filter((item: any) => {
    if (fixedTier === 'standard') return !item.menuType || item.menuType === 'standard'
    return item.menuType === fixedTier
  })

  const categories = ["all", ...new Set(tierItems.filter(i => (i.mainCategory || 'Food') === mainCategoryFilter).map((item) => item.category))]
  const filteredItems = (categoryFilter === "all" ? tierItems : tierItems.filter((item) => item.category === categoryFilter))
    .filter((item) => (item.mainCategory || 'Food') === mainCategoryFilter)
    .filter((item) => {
      const nameMatch = !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase())
      const idMatch = !idSearchTerm || (item.menuId && item.menuId.toLowerCase() === idSearchTerm.toLowerCase())
      return nameMatch && idMatch
    })
    .sort((a, b) => {
      const idA = a.menuId || ""
      const idB = b.menuId || ""
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
    })

  const accentColor = config.color

  const cartSidebarProps = {
    items: cartItems, onRemove: handleRemoveFromCart, onQuantityChange: handleQuantityChange,
    onCheckout: handleCheckout, isLoading: isCheckoutLoading, isEmbedded: true,
    tableNumber, setTableNumber, isMeatOnly, isDrinksOnly, isButcherOrder, setIsButcherOrder,
    batchNumber, setBatchNumber,
    isDrinksOrder, setIsDrinksOrder,
    assignedFloorId: selectedFloorId || user?.floorId, setSelectedFloorId, onClear: handleClearCart,
    distribution: distributions, setDistribution: setDistributions,
  }

  return (
    <ProtectedRoute requiredRoles={["cashier"]}>
      <div className="min-h-screen bg-[#0f1110] p-1 md:p-6 overflow-x-hidden text-white selection:bg-[#c5a059] selection:text-[#0f1110]">
        <div className="max-w-[1900px] mx-auto md:space-y-6 w-full overflow-hidden">
          <div className="mb-4 md:mb-0">
            <BentoNavbar />
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block bg-[#151716] rounded-xl p-6 shadow-2xl border border-white/5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg" style={{ backgroundColor: accentColor + '15' }}>
                  <ShoppingCart className="h-8 w-8" style={{ color: accentColor }} />
                </div>
                <div>
                  <h1 className="text-3xl font-playfair italic font-bold text-white leading-tight flex items-center gap-3">
                    {config.icon}
                    <span className="text-[#f3cf7a]">{config.label}</span>
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
                    <span className="text-gray-300">•</span>
                    <p className="text-sm text-gray-500 font-medium">
                      {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Available Items</div>
                <div className="text-2xl font-black text-[#f3cf7a]">{tierItems.length}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4 items-start pb-20 md:pb-0 w-full overflow-hidden">
            <div className="flex-1 min-w-0 w-full flex flex-col md:gap-4 overflow-hidden">
              {/* Search Bar Group */}
              <div className="px-4 md:px-0 mb-4 md:mb-0 flex flex-col md:flex-row gap-3">
                <div className="flex-[2] relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by item name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-11 pr-10 py-3.5 bg-[#151716] border border-white/5 rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/50 transition-all font-bold text-sm shadow-sm"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <div className="flex-1 relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Hash className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Item ID"
                    value={idSearchTerm}
                    onChange={(e) => setIdSearchTerm(e.target.value)}
                    className="block w-full pl-11 pr-10 py-3.5 bg-[#151716] border border-white/5 rounded-2xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#d4af37]/50 focus:border-[#d4af37]/50 transition-all font-bold text-sm shadow-sm"
                  />
                  {idSearchTerm && (
                    <button onClick={() => setIdSearchTerm("")} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Main Category Filter (Food/Drinks) */}
              <div className="px-4 md:px-0 mb-4 flex gap-2">
                {(['Food', 'Drinks'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setMainCategoryFilter(tab); setCategoryFilter('all') }}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-black text-sm transition-all ${mainCategoryFilter === tab ? 'bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] shadow-lg' : 'bg-[#151716] text-gray-500 hover:text-white border border-white/5'}`}
                  >
                    {tab === 'Food' ? <Utensils size={16} /> : <Coffee size={16} />} {tab}
                    <span className="text-[10px] opacity-70">({tierItems.filter(i => (i.mainCategory || 'Food') === tab).length})</span>
                  </button>
                ))}
              </div>

              {/* Category Filter */}
              <div className="sticky top-0 md:static z-[40] bg-gray-50/95 backdrop-blur-md md:bg-transparent border-b md:border-none border-gray-200 w-full">
                <div className="flex flex-nowrap overflow-x-scroll px-4 md:px-0 gap-3 py-4 scroll-smooth" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x', scrollbarWidth: 'thin' }}>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-5 py-2.5 rounded-full font-black text-[14px] md:text-sm whitespace-nowrap transition-all flex-shrink-0 active:scale-90 shadow-sm ${categoryFilter === cat ? 'bg-[#f3cf7a] text-[#0f1110] ring-2 ring-[#d4af37]/50 scale-105' : 'bg-[#151716] text-gray-500 hover:text-white border border-white/5'}`}
                    >
                      {cat === "all" ? "ALL ITEMS" : cat.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Menu Grid */}
              <div className="md:bg-[#151716] md:rounded-xl md:p-6 pt-2 md:shadow-2xl md:border border-white/5 min-h-[600px]">
                {menuLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <RefreshCw className="h-12 w-12 animate-spin text-gray-400 mb-4" />
                    <p className="text-gray-600">Loading menu...</p>
                  </div>
                ) : menuError ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">⚠️</div>
                    <h2 className="text-xl font-bold text-red-600 mb-2">Failed to Load Menu</h2>
                    <p className="text-gray-600 mb-6">{menuError}</p>
                    <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">Retry</button>
                  </div>
                ) : filteredItems.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="flex justify-center mb-4 opacity-20"><Utensils size={64} /></div>
                    <h2 className="text-xl font-medium text-gray-400">No items found</h2>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-0 md:gap-4 bg-[#151716] md:bg-transparent rounded-2xl md:rounded-none overflow-hidden shadow-sm md:shadow-none border border-white/5 md:border-none w-full">
                    {filteredItems.map((item, idx) => (
                      <div key={item._id} className="transform transition-transform md:hover:scale-[1.02]">
                        <MenuItemCard
                          name={item.name} price={item.price} description={item.description}
                          image={item.image} category={item.category} preparationTime={item.preparationTime}
                          menuId={item.menuId} onAddToCart={() => handleAddToCart(item)} index={idx}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Cart Sidebar */}
            <div className="hidden lg:block w-[400px] sticky top-6 bg-[#151716] rounded-[32px] shadow-2xl border border-white/5 overflow-hidden h-[calc(100vh-120px)]">
              <CartSidebar {...cartSidebarProps} onClose={undefined} />
            </div>
          </div>

          {/* Mobile Cart Drawer */}
          <AnimatePresence>
            {showCart && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCart(false)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
                <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-[#151716] z-[101] shadow-2xl flex flex-col border-l border-white/5">
                  <div className="flex-1 overflow-hidden">
                    <CartSidebar {...cartSidebarProps} onClose={() => setShowCart(false)} />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Order Animation */}
          {showOrderAnimation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <div className="bg-[#151716] rounded-2xl p-10 shadow-2xl max-w-md w-full border border-white/5">
                <OrderAnimation orderNumber={orderNumber} totalItems={cartItems.length} isVisible={showOrderAnimation} />
              </div>
            </div>
          )}

          {/* Variant Modal */}
          {variantModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
              <div className="bg-[#151716] rounded-3xl p-8 shadow-2xl max-w-sm w-full border border-white/10">
                <h3 className="text-xl font-playfair italic font-bold text-white mb-2 text-center">{variantModal.item.name}</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest text-center mb-6">Select a distribution</p>
                <div className="space-y-3">
                  {variantModal.item.distributions?.map((dist) => (
                    <button key={dist} onClick={() => handleSelectVariant(variantModal.item, dist)} className="w-full py-4 bg-[#0f1110] hover:bg-[#1a1c1b] border border-white/5 hover:border-[#d4af37]/30 rounded-2xl font-bold text-[#f3cf7a] transition-all hover:scale-[1.02] active:scale-95">{dist}</button>
                  ))}
                </div>
                <button onClick={() => setVariantModal(null)} className="w-full mt-4 py-3 text-gray-500 font-bold hover:text-gray-700 transition-colors">Cancel</button>
              </div>
            </div>
          )}

          {/* Floating Cart Button (Mobile) */}
          <div className="fixed bottom-8 right-8 z-[80] lg:hidden">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowCart(true)} className="w-16 h-16 text-white rounded-full shadow-2xl flex items-center justify-center relative group" style={{ backgroundColor: accentColor }}>
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full z-0" />
              <ShoppingCart size={28} className="group-hover:animate-bounce z-10" />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-in zoom-in duration-300 z-20">{cartItems.length}</span>
              )}
            </motion.button>
          </div>

          <ConfirmationCard isOpen={confirmationState.isOpen} onClose={closeConfirmation} onConfirm={confirmationState.onConfirm} title={confirmationState.options.title} message={confirmationState.options.message} type={confirmationState.options.type} confirmText={confirmationState.options.confirmText} cancelText={confirmationState.options.cancelText} icon={confirmationState.options.icon} />
          <NotificationCard isOpen={notificationState.isOpen} onClose={closeNotification} title={notificationState.options.title} message={notificationState.options.message} type={notificationState.options.type} autoClose={notificationState.options.autoClose} duration={notificationState.options.duration} />
          
          {/* Room Service Notification Toast */}
          <AnimatePresence>
            {isRoomServiceHandler && roomOrdersCount > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed bottom-28 left-8 z-[100] cursor-pointer"
                onClick={() => window.location.href = '/cashier/room-orders'}
              >
                <div className="bg-[#151716] border-2 border-[#d4af37] rounded-2xl p-4 shadow-[0_0_30px_rgba(212,175,55,0.2)] flex items-center gap-4 group hover:bg-[#1a1c1b] transition-all">
                  <div className="w-12 h-12 bg-[#d4af37]/10 rounded-xl flex items-center justify-center text-[#d4af37] group-hover:scale-110 transition-transform">
                    <ConciergeBell className="animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-[#f3cf7a] font-playfair italic font-bold">New Room Request</h4>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none mt-1">
                      {roomOrdersCount} request{roomOrdersCount > 1 ? 's' : ''} waiting
                    </p>
                  </div>
                  <div className="ml-2 w-6 h-6 bg-[#d4af37] text-[#0f1110] rounded-full flex items-center justify-center text-[10px] font-black">
                    {roomOrdersCount}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </ProtectedRoute>
  )
}
