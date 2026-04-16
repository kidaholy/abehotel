"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
// import { SidebarNav } from "@/components/sidebar-nav" // Commented out
// import { AuthHeader } from "@/components/auth-header" // Commented out
import { CartSidebar, CartItem } from "@/components/cart-sidebar"
import { ParticleSystem } from "@/components/particle-system"
import { AnimatedLoading } from "@/components/animated-loading"
import { AnimatedButton } from "@/components/animated-button"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Coffee, 
  IceCream, 
  Soup, 
  Flame, 
  CupSoda, 
  GlassWater, 
  Martini, 
  Egg, 
  Leaf, 
  Beef, 
  Sandwich as SandwichIcon, 
  Utensils, 
  UtensilsCrossed, 
  ShoppingCart,
  Pizza,
  Croissant,
  Timer,
  CheckCircle2,
  XCircle,
  ConciergeBell,
  RefreshCw,
  Frown,
  Cake,
  X
} from 'lucide-react'

// Category icon mapping function
const getCategoryIcon = (category: string) => {
  const icons: Record<string, React.ReactNode> = {
    "Hot Coffee": <Coffee size={18} />,
    "Iced & Cold Coffee": <IceCream size={18} />,
    "Tea & Infusions": <Soup size={18} />,
    "Hot Specialties": <Flame size={18} />,
    "Drinks": <CupSoda size={18} />,
    "Juice": <GlassWater size={18} />,
    "Mojito": <Martini size={18} />,
    "Breakfast": <Egg size={18} />,
    "Salad": <Leaf size={18} />,
    "Burrito": <Beef size={18} />,
    "Burgers": <Beef size={18} />,
    "Wraps": <Beef size={18} />,
    "Sandwich": <SandwichIcon size={18} />,
    "Pasta": <UtensilsCrossed size={18} />,
    "Chicken": <Beef size={18} />,
    "Ethiopian Taste": <Utensils size={18} />,
  }
  return icons[category] || <Utensils size={18} />
}

interface MenuItem {
  _id: string
  menuId: string
  name: string
  description?: string
  mainCategory: 'Food' | 'Drinks'
  category: string
  price: number
  image?: string
  available?: boolean
  preparationTime?: number
}




export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [mainCategoryFilter, setMainCategoryFilter] = useState<'Food' | 'Drinks'>('Food')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [menuLoading, setMenuLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { token, user } = useAuth()
  const { t } = useLanguage()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

  // Selection state for Table
  const [tableNumber, setTableNumber] = useState("")
  const [selectedFloorId, setSelectedFloorId] = useState<string>("")
  const [floors, setFloors] = useState<any[]>([])
  const [showMobileCart, setShowMobileCart] = useState(false)
  const [paperWidth, setPaperWidth] = useState(80)

  // Fetch floors to determine VIP status
  useEffect(() => {
    const fetchFloors = async () => {
      if (!token) return
      try {
        const res = await fetch("/api/floors", {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (res.ok) setFloors(await res.json())
      } catch (err) { console.error("Floor fetch error:", err) }
    }
    fetchFloors()
  }, [token])

  const currentFloor = floors.find(f => f._id === selectedFloorId)
  const isVipContext = currentFloor?.isVIP || false

  // Fetch menu items from API
  useEffect(() => {
    const fetchMenuItems = async () => {
      if (!token) return

      try {
        setMenuLoading(true)
        const response = await fetch("/api/menu", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setMenuItems(data)
        } else {
          setError(t("menu.error"))
        }
      } catch (err) {
        setError(t("menu.error"))
      } finally {
        setMenuLoading(false)
      }
    }

    fetchMenuItems()
  }, [token])

  const handleAddToCart = (item: MenuItem) => {
    const existingItem = cartItems.find((ci) => ci.id === item._id)
    if (existingItem) {
      setCartItems(cartItems.map((ci) => (ci.id === item._id ? { ...ci, quantity: ci.quantity + 1 } : ci)))
    } else {
      setCartItems([...cartItems, {
        id: item._id,
        menuId: item.menuId,
        name: item.name,
        price: item.price,
        quantity: 1,
        category: item.category
      }])
    }

    // Show success feedback
    setSelectedItem(item)
    setTimeout(() => setSelectedItem(null), 1500)
  }

  const handleRemoveFromCart = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id))
  }

  const handleQuantityChange = (id: string, quantity: number) => {
    if (quantity === 0) {
      handleRemoveFromCart(id)
    } else {
      setCartItems(cartItems.map((item) => (item.id === id ? { ...item, quantity } : item)))
    }
  }

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            menuItemId: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
          totalAmount: cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
          paymentMethod: "cash",
          status: "pending",
          tableNumber,
          floorId: user?.floorId
        }),
      })

      if (response.ok) {
        const data = await response.json()
        notify({
          title: "Order Placed Successfully!",
          message: `Order #${data.orderNumber} has been sent to the kitchen.\nYour items are being prepared.`,
          type: "success"
        })
        setCartItems([])
      } else {
        notify({
          title: "Order Failed",
          message: "Failed to place your order. Please try again.",
          type: "error"
        })
      }
    } catch (err) {
      notify({
        title: "Error",
        message: "Failed to create order. Please check your connection and try again.",
        type: "error"
      })
    } finally {
      setLoading(false)
    }
  }

  const itemsInTab = menuItems.filter(item => (item.mainCategory || 'Food') === mainCategoryFilter)
  const categories = ["all", ...new Set(itemsInTab.map((item) => item.category))]
  const filteredItems = (categoryFilter === "all" ? itemsInTab : itemsInTab.filter((item) => item.category === categoryFilter))
    .filter((item: any) => !item.isVIP || isVipContext)
    .sort((a, b) => {
      const idA = a.menuId || ""
      const idB = b.menuId || ""
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
    })

  if (user?.role === "cashier") {
    return (
      <ProtectedRoute requiredRoles={["cashier"]} requiredPermissions={["services:view", "cashier:access"]}>
        <div className="min-h-screen bg-white p-4 font-sans text-slate-800">
          <div className="max-w-7xl mx-auto">
            <BentoNavbar />

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Main Content Area */}
              <div className="md:col-span-8 lg:col-span-9">

                {/* Welcome Banner */}
                <div className="bg-[#D2691E] rounded-[40px] p-8 mb-6 custom-shadow relative overflow-hidden group">
                  <div className="relative z-10">
                    <h1 className="text-4xl font-bold text-white mb-2 bubbly-text flex items-center gap-3">{t("menu.title")} <Croissant size={32} /></h1>
                    <p className="text-white/90 font-medium">{t("menu.subtitle")}</p>
                  </div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 text-white/10 group-hover:scale-110 transition-transform duration-500">
                    <Coffee size={160} />
                  </div>
                </div>

                {/* Menu Grid Container */}
                <div className="bg-white rounded-[40px] p-6 custom-shadow min-h-[600px]">
                  {/* Loading State */}
                  {menuLoading && (
                    <AnimatedLoading message={t("menu.loading")} type="food" />
                  )}

                  {/* Error State */}
                  {error && (
                    <div className="text-center py-12">
                      <h2 className="text-2xl font-bold text-red-500 mb-2">{t("menu.error")}</h2>
                      <p className="text-gray-500 mb-4">{error}</p>
                      <AnimatedButton
                        onClick={() => window.location.reload()}
                        variant="glow"
                        size="lg"
                      >
                        <RefreshCw size={18} /> {t("menu.tryAgain")}
                      </AnimatedButton>
                    </div>
                  )}

                  {!menuLoading && !error && (
                    <div className="menu-content-safe-area">
                      {/* Food / Drinks top-level tabs */}
                      <div className="flex gap-2 mb-6">
                        {(['Food', 'Drinks'] as const).map(tab => (
                          <button
                            key={tab}
                            onClick={() => { setMainCategoryFilter(tab); setCategoryFilter('all') }}
                            className={`flex items-center gap-2 px-7 py-3 rounded-full font-black text-sm transition-all ${mainCategoryFilter === tab
                              ? 'bg-[#8B4513] text-white shadow-lg scale-105'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                          >
                            {tab === 'Food' ? <Utensils size={18} /> : <Coffee size={18} />} {tab}
                            <span className="text-[10px] opacity-70">({menuItems.filter(i => (i.mainCategory || 'Food') === tab).length})</span>
                          </button>
                        ))}
                      </div>

                      {/* Sub-category Filter */}
                      <div className="mb-8 overflow-x-auto pb-4 hide-scrollbar">
                        <div className="flex gap-3">
                          {categories.map((cat: string, index: number) => (
                            <button
                              key={cat}
                              onClick={() => setCategoryFilter(cat)}
                              className={`px-6 py-3 rounded-full font-bold whitespace-nowrap transition-all duration-300 flex-shrink-0 ${categoryFilter === cat
                                ? "bg-[#8B4513]/80 text-white shadow-lg scale-105"
                                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                }`}
                            >
                              {cat === "all" ? t("menu.allItems") : <span className="flex items-center gap-2">{getCategoryIcon(cat)} {cat}</span>}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Empty State */}
                      {filteredItems.length === 0 && (
                        <div className="text-center py-20">
                          <div className="text-gray-200 mb-4 opacity-30 flex justify-center"><Utensils size={64} /></div>
                          <h2 className="text-2xl font-bold text-gray-400">{t("menu.noItems")}</h2>
                        </div>
                      )}

                      {/* Menu Grid */}
                      {filteredItems.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                          {filteredItems.map((item, idx) => (
                            <MenuItemCard
                              key={item._id}
                              item={item}
                              onAddToCart={handleAddToCart}
                              isSelected={selectedItem?._id === item._id}
                              index={idx}
                              t={t}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart Sidebar - Desktop */}
              <div className="hidden md:block md:col-span-4 lg:col-span-3 sticky top-4">
                <div className="bg-white rounded-[40px] p-6 custom-shadow min-h-[500px] border border-gray-100">
                  <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6 flex items-center gap-2">
                    <ShoppingCart size={24} /> {t("menu.currentOrder")}
                  </h2>
                  <CartSidebar
                    items={cartItems}
                    onRemove={handleRemoveFromCart}
                    onQuantityChange={handleQuantityChange}
                    onCheckout={handleCheckout}
                    isLoading={loading}
                    tableNumber={tableNumber}
                    setTableNumber={setTableNumber}
                    paperWidth={paperWidth}
                    setPaperWidth={setPaperWidth}
                    assignedFloorId={selectedFloorId || user?.floorId}
                    setSelectedFloorId={setSelectedFloorId}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Floating Cart Button - Mobile Only */}
          <div className="md:hidden fixed bottom-6 right-6 z-40">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowMobileCart(true)}
              className="bg-[#2d5a41] text-white p-4 rounded-full shadow-2xl relative flex items-center justify-center"
            >
              <ShoppingCart size={24} />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-white">
                  {cartItems.length}
                </span>
              )}
            </motion.button>
          </div>

          {/* Mobile Cart Drawer */}
          <AnimatePresence>
            {showMobileCart && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowMobileCart(false)}
                  className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
                />
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="md:hidden fixed inset-y-0 right-0 w-full bg-white z-[101] shadow-2xl flex flex-col"
                >
                  <div className="p-8 border-b flex justify-between items-center bg-[#D2691E] rounded-b-[40px]">
                    <div className="flex items-center gap-3 text-white">
                      <ShoppingCart size={24} />
                      <h2 className="text-2xl font-bold">{t("menu.currentOrder")}</h2>
                    </div>
                    <button
                      onClick={() => setShowMobileCart(false)}
                      className="p-2 hover:bg-white/10 text-white rounded-full transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <div className="flex-1 overflow-hidden p-6">
                    <CartSidebar
                      items={cartItems}
                      onRemove={handleRemoveFromCart}
                      onQuantityChange={handleQuantityChange}
                      onCheckout={handleCheckout}
                      onClose={() => setShowMobileCart(false)}
                      isLoading={loading}
                      tableNumber={tableNumber}
                      setTableNumber={setTableNumber}
                      paperWidth={paperWidth}
                      setPaperWidth={setPaperWidth}
                      assignedFloorId={selectedFloorId || user?.floorId}
                      setSelectedFloorId={setSelectedFloorId}
                    />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Confirmation and Notification Cards */}
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-gray-200 mb-4 flex justify-center"><Frown size={64} /></div>
        <h1 className="text-3xl font-bold text-foreground mb-2">{t("menu.restricted")}</h1>
        <p className="text-muted-foreground mb-6">{t("menu.restrictedDesc")}</p>
        <Link href="/cashier" className="btn-primary">
          {t("menu.goToPos")}
        </Link>
      </div>
    </div>
  )
}

function MenuItemCard({
  item,
  onAddToCart,
  isSelected,
  index,
  t,
}: {
  item: MenuItem; onAddToCart: (item: MenuItem) => void;
  isSelected: boolean;
  index: number;
  t: (key: string) => string;
}) {
  return (
    <div
      className={`group card-base hover-lift cursor-pointer animate-bounce-in overflow-hidden relative menu-item-card ${isSelected ? "animate-rainbow-glow" : ""
        }`}
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={() => onAddToCart(item)}
    >
      {/* Floating particles for selected item */}
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-accent rounded-full animate-particle-float"
              style={{
                left: `${20 + i * 15}%`,
                top: `${20 + (i % 2) * 60}%`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Item Image */}
      <div className="relative w-full h-40 bg-gradient-to-br from-accent/20 to-primary/20 rounded-lg overflow-hidden mb-4">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover transition-all duration-500 group-hover:scale-125 group-hover:rotate-2"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-300 opacity-50 animate-float"><Cake size={64} /></div>
          </div>
        )}

        {/* Animated overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-accent/20 opacity-0 group-hover:opacity-100 transition-all duration-300" />

        {/* Price badge with animation */}
        <div className="absolute top-2 right-2 bg-accent text-accent-foreground px-2 py-1 rounded-full text-sm font-bold animate-heartbeat">
          {item.price} {t("common.currencyBr")}
        </div>

        {/* Category icon */}
        <div className="absolute top-2 left-2 text-[#8B4513] animate-wiggle">
          {getCategoryIcon(item.category)}
        </div>
      </div>

      <h3 className="text-lg font-bold text-foreground mb-2 group-hover:animate-neon-flicker">
        {item.menuId ? `#${item.menuId} ` : ""}{item.name}
      </h3>

      {item.description && (
        <p className="text-sm text-muted-foreground mb-3 group-hover:text-accent transition-colors">
          {item.description}
        </p>
      )}

      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {item.preparationTime && (
            <div className="flex items-center gap-1 text-xs bg-primary/20 text-foreground px-2 py-1 rounded animate-zoom-in-out">
              <Timer size={12} className="animate-pulse" /> {item.preparationTime}m
            </div>
          )}
        </div>

        {/* Availability indicator */}
        <div className="flex items-center gap-1 text-xs">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span className="text-success">{t("menu.available")}</span>
        </div>
      </div>

      {/* Add to Cart Button */}
      <AnimatedButton
        onClick={() => onAddToCart(item)}
        variant={isSelected ? "rainbow" : "glow"}
        className={`w-full ${isSelected ? "animate-heartbeat" : ""}`}
      >
        {isSelected ? (
          <>
            <span className="animate-bounce">✓</span> {t("menu.addedToCart")}
          </>
        ) : (
          <>
            <ShoppingCart size={18} className="group-hover:animate-wiggle" /> {t("menu.addToOrder")}
          </>
        )}
      </AnimatedButton>
    </div>
  )
}
