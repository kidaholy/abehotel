"use client"

import { useState, useEffect, useMemo, use } from "react"
import { 
  Utensils, 
  Wine, 
  ShoppingCart, 
  ChevronLeft, 
  Plus, 
  Minus,
  CheckCircle2,
  Clock,
  ConciergeBell,
  X
} from "lucide-react"

interface MenuItem {
  _id: string
  name: string
  mainCategory: 'Food' | 'Drinks'
  category?: string
  price: number
  description?: string
  image?: string
  preparationTime?: number
}

interface CartItem extends MenuItem {
  cartQuantity: number
}

export default function RoomServicePage({ params }: { params: Promise<{ roomNumber: string }> }) {
  const resolvedParams = use(params)
  const roomNumber = resolvedParams.roomNumber

  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<'All' | 'Food' | 'Drinks'>('All')
  const [cart, setCart] = useState<Record<string, CartItem>>({})
  
  // Checkout sliding sheet state
  const [showCart, setShowCart] = useState(false)
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderComplete, setOrderComplete] = useState(false)

  // Fetch Menu
  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch(`/api/room-service/menu?roomNumber=${roomNumber}`)
        if (res.ok) {
          const data = await res.json()
          setMenuItems(data)
        }
      } catch (err) {
        console.error("Failed to fetch menu:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchMenu()
  }, [roomNumber])

  const filteredMenu = useMemo(() => {
    if (activeCategory === 'All') return menuItems
    return menuItems.filter(item => item.mainCategory === activeCategory)
  }, [menuItems, activeCategory])

  const cartItems = Object.values(cart)
  const cartTotal = cartItems.reduce((acc, item) => acc + (item.price * item.cartQuantity), 0)
  const cartCount = cartItems.reduce((acc, item) => acc + item.cartQuantity, 0)

  // Cart Functions
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev[item._id]
      if (existing) {
        return { ...prev, [item._id]: { ...existing, cartQuantity: existing.cartQuantity + 1 } }
      }
      return { ...prev, [item._id]: { ...item, cartQuantity: 1 } }
    })
  }

  const removeFromCart = (itemId: string) => {
    setCart(prev => {
      const existing = prev[itemId]
      if (!existing) return prev
      if (existing.cartQuantity === 1) {
        const newCart = { ...prev }
        delete newCart[itemId]
        if (Object.keys(newCart).length === 0) setShowCart(false)
        return newCart
      }
      return { ...prev, [itemId]: { ...existing, cartQuantity: existing.cartQuantity - 1 } }
    })
  }

  // Submit Order
  const submitOrder = async () => {
    if (cartItems.length === 0 || isSubmitting) return

    setIsSubmitting(true)
    const orderPayload = {
      tableNumber: roomNumber,
      items: cartItems.map(item => ({
        menuItemId: item._id,
        name: item.name,
        quantity: item.cartQuantity,
        price: item.price,
      })),
      totalAmount: cartTotal,
      notes: notes.trim(),
    }

    try {
      const res = await fetch("/api/room-service/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload)
      })

      if (res.ok) {
        setCart({})
        setNotes("")
        setShowCart(false)
        setOrderComplete(true)
      } else {
        alert("Failed to submit order. Please try again or call reception.")
      }
    } catch (err) {
      console.error(err)
      alert("Network error. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in bg-[#0f1110]">
        <div className="w-24 h-24 bg-gradient-to-br from-[#d4af37]/20 to-[#f3cf7a]/10 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={48} className="text-[#d4af37]" />
        </div>
        <h1 className="text-3xl font-playfair italic font-bold text-[#f3cf7a] mb-2">Order Received</h1>
        <p className="text-gray-400 font-medium mb-8">
          The kitchen is preparing your order for Room {roomNumber}. It will be brought to your room shortly and billed to your account.
        </p>
        <button 
          onClick={() => setOrderComplete(false)}
          className="bg-[#151716] border border-white/10 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-[#1a1c1b] transition-all"
        >
          Order More Items
        </button>
      </div>
    )
  }

  return (
    <div className="pb-32 bg-[#0f1110] min-h-screen relative">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0f1110]/90 backdrop-blur-xl border-b border-white/5 pt-6 pb-4 px-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-playfair italic font-bold text-[#f3cf7a]">Abe Hotel</h1>
            <p className="text-gray-500 font-bold tracking-widest uppercase text-[10px] mt-1 flex items-center gap-1.5">
              <ConciergeBell size={12} className="text-[#d4af37]" /> Room Service • Room {roomNumber}
            </p>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar relative z-10 pb-2">
          {['All', 'Food', 'Drinks'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat as any)}
              className={`px-6 py-2.5 rounded-full font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all border ${
                activeCategory === cat 
                  ? "bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] border-transparent shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                  : "bg-[#151716] hover:bg-[#1a1c1b] text-gray-400 border-white/5 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {cat === 'Food' ? <Utensils size={12} /> : cat === 'Drinks' ? <Wine size={12} /> : null}
                {cat}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Menu List */}
      <div className="px-5 py-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin text-[#d4af37] mb-4"><Utensils size={32} /></div>
            <p className="text-[#f3cf7a] font-bold text-xs uppercase tracking-widest">Waking up the Kitchen...</p>
          </div>
        ) : filteredMenu.length === 0 ? (
          <div className="text-center py-20 text-gray-500 font-bold uppercase tracking-widest text-xs">
            No items available in this category
          </div>
        ) : (
          filteredMenu.map(item => {
            const quantity = cart[item._id]?.cartQuantity || 0
            return (
              <div key={item._id} className="bg-[#151716] border border-white/5 rounded-2xl p-4 flex gap-4 overflow-hidden relative shadow-sm">
                
                {/* Visual Image / Placeholder */}
                <div className="w-24 h-24 rounded-xl bg-[#0f1110] border border-white/5 flex shrink-0 items-center justify-center overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    item.mainCategory === 'Drinks' ? <Wine size={24} className="text-gray-700" /> : <Utensils size={24} className="text-gray-700" />
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-white font-bold text-base leading-tight pr-4">{item.name}</h3>
                    {item.description && <p className="text-gray-500 text-[10px] mt-1 line-clamp-2 leading-relaxed">{item.description}</p>}
                  </div>
                  
                  <div className="flex items-end justify-between mt-3">
                    <div>
                      <p className="text-[#f3cf7a] font-black text-sm">{item.price} Br</p>
                      {item.preparationTime && <p className="text-[9px] text-gray-600 font-bold flex items-center gap-1 mt-0.5"><Clock size={9}/> {item.preparationTime} mins</p>}
                    </div>

                    {/* Add to Cart Control */}
                    {quantity > 0 ? (
                      <div className="flex items-center bg-[#0f1110] border border-white/10 rounded-lg overflow-hidden">
                        <button onClick={() => removeFromCart(item._id)} className="w-8 h-8 flex items-center justify-center text-[#d4af37] hover:bg-white/5 transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center font-bold text-white text-xs">{quantity}</span>
                        <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center text-[#d4af37] hover:bg-white/5 transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => addToCart(item)}
                        className="bg-[#0f1110] border border-[#d4af37]/20 text-[#f3cf7a] px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-[#d4af37]/10 transition-all"
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Floating View Cart Button */}
      {cartCount > 0 && !showCart && (
        <div className="fixed bottom-6 left-0 right-0 px-6 z-40 animate-slide-up">
          <button 
            onClick={() => setShowCart(true)}
            className="w-full bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] p-4 rounded-2xl shadow-[0_10px_30px_rgba(212,175,55,0.25)] flex items-center justify-between transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#0f1110]/10 rounded-full flex items-center justify-center">
                <span className="font-black text-sm">{cartCount}</span>
              </div>
              <span className="font-black uppercase tracking-widest text-[11px]">View Order</span>
            </div>
            <span className="font-black">{cartTotal} Br</span>
          </button>
        </div>
      )}

      {/* Slide-up Checkout Modal */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm transition-all">
          <div className="bg-[#151716] border-t border-white/10 rounded-t-3xl w-full max-h-[90vh] flex flex-col animate-slide-up shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#0f1110] rounded-t-3xl">
              <div className="flex items-center gap-3">
                <ShoppingCart size={20} className="text-[#d4af37]" />
                <h2 className="text-xl font-playfair italic font-bold text-[#f3cf7a]">Your Order</h2>
              </div>
              <button 
                onClick={() => setShowCart(false)} 
                className="w-8 h-8 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-full flex items-center justify-center transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {cartItems.map(item => (
                <div key={item._id} className="flex items-center justify-between border-b border-white/5 pb-4 last:border-0 last:pb-0">
                  <div className="flex-1 pr-4">
                    <h4 className="text-white font-bold text-sm leading-tight mb-1">{item.name}</h4>
                    <p className="text-[#f3cf7a] font-black text-xs">{item.price} Br</p>
                  </div>
                  <div className="flex items-center bg-[#0f1110] border border-white/10 rounded-lg shrink-0">
                    <button onClick={() => removeFromCart(item._id)} className="w-8 h-8 flex items-center justify-center text-[#d4af37] hover:bg-white/5"><Minus size={14} /></button>
                    <span className="w-6 text-center font-bold text-white text-xs">{item.cartQuantity}</span>
                    <button onClick={() => addToCart(item)} className="w-8 h-8 flex items-center justify-center text-[#d4af37] hover:bg-white/5"><Plus size={14} /></button>
                  </div>
                </div>
              ))}
              
              <div className="pt-4 mt-2 border-t border-white/10">
                <label className="block text-gray-500 font-bold uppercase tracking-widest text-[9px] mb-2">Special Instructions / Notes</label>
                <textarea 
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Need extra napkins? Allergy info?"
                  maxLength={150}
                  className="w-full bg-[#0f1110] border border-white/5 rounded-xl p-3 text-white text-sm outline-none focus:border-[#d4af37]/30 transition-colors resize-none h-20 placeholder:text-gray-700"
                />
              </div>
            </div>

            {/* Sticky Checkout Target */}
            <div className="p-6 bg-[#0f1110] border-t border-white/5 shrink-0 rounded-b-3xl pb-10">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">Total Amount</p>
                  <p className="text-[#f3cf7a] text-3xl font-black">{cartTotal} <span className="text-sm text-[#d4af37]">Br</span></p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mb-1">Payment Method</p>
                  <p className="text-white font-bold text-sm flex items-center justify-end gap-1"><CheckCircle2 size={12} className="text-[#d4af37]"/> Room Bill</p>
                </div>
              </div>
              <button 
                onClick={submitOrder}
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#d4af37] to-[#f3cf7a] text-[#0f1110] p-4.5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(212,175,55,0.2)] disabled:opacity-70 disabled:grayscale transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <><Clock size={18} className="animate-spin" /> Sending to Kitchen...</>
                ) : (
                  <>Place Order</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
      
      {/* Global styles for animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  )
}
