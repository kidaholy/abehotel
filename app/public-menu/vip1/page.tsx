"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel"
import { cn } from "@/lib/utils"
import { 
  Utensils, 
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
  UtensilsCrossed,
  Pizza,
  Sparkles,
  Cake,
  Croissant,
  Timer,
  RefreshCw,
  Frown,
  Crown
} from "lucide-react"

// Category icon mapping
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
    preparationTime?: number
}

export default function PublicVip1MenuPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [mainCategoryFilter, setMainCategoryFilter] = useState<'Food' | 'Drinks'>('Food')
    const [categoryFilter, setCategoryFilter] = useState("all")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                setLoading(true)
                const res = await fetch("/api/public/vip1-menu")
                if (res.ok) {
                    const data = await res.json()
                    setMenuItems(data)
                } else {
                    setError("Failed to load VIP 1 menu")
                }
            } catch {
                setError("Failed to load VIP 1 menu. Please check your connection.")
            } finally {
                setLoading(false)
            }
        }
        fetchMenu()
    }, [])

    const itemsInTab = menuItems.filter(item => (item.mainCategory || 'Food') === mainCategoryFilter)
    const categories = ["all", ...new Set(itemsInTab.map(item => item.category))]
    const filteredItems = (categoryFilter === "all" ? itemsInTab : itemsInTab.filter(item => item.category === categoryFilter))
        .sort((a, b) => {
            const idA = a.menuId || ""
            const idB = b.menuId || ""
            return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' })
        })

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-gradient-to-b from-[#1A1A1A] to-[#0A0A0A] border-b border-[#D4AF37]/20">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 left-10 text-[#D4AF37] animate-pulse" style={{ animationDelay: '0s' }}><Coffee size={48} /></div>
                    <div className="absolute top-8 right-20 text-[#D4AF37] animate-pulse" style={{ animationDelay: '0.5s' }}><Crown size={40} /></div>
                    <div className="absolute bottom-4 left-1/3 text-[#D4AF37] animate-pulse" style={{ animationDelay: '1s' }}><Martini size={32} /></div>
                    <div className="absolute bottom-2 right-1/4 text-[#D4AF37] animate-pulse" style={{ animationDelay: '1.5s' }}><Soup size={40} /></div>
                </div>
                <div className="relative max-w-5xl mx-auto px-4 py-20 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#D4AF37]"></div>
                            <Crown size={32} className="text-[#D4AF37]" />
                            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#D4AF37]"></div>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                            VIP 1 <span className="text-[#D4AF37]">Menu</span>
                        </h1>
                        <p className="text-sm md:text-base text-gray-400 font-bold uppercase tracking-[0.3em]">
                            Excellence in every detail
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-12">
                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="relative w-24 h-24 mb-6">
                            <div className="absolute inset-0 border-2 border-[#D4AF37]/20 rounded-full animate-ping" />
                            <div className="absolute inset-2 border-2 border-t-[#D4AF37] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center text-[#D4AF37]"><Crown size={40} /></div>
                        </div>
                        <p className="text-[#D4AF37] font-bold text-lg uppercase tracking-widest animate-pulse">Preparing Premium Menu...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="text-center py-20 bg-[#121212] rounded-[3rem] border border-[#D4AF37]/20">
                        <div className="text-[#D4AF37] mb-6 flex justify-center"><Frown size={72} /></div>
                        <h2 className="text-3xl font-black text-white mb-3 tracking-tight">Access Interrupted</h2>
                        <p className="text-gray-400 mb-8 max-w-xs mx-auto">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-10 py-4 bg-gradient-to-r from-[#D4AF37] to-[#8B5A2B] text-white rounded-2xl font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all active:scale-95 flex items-center justify-center gap-3 mx-auto"
                        >
                            <RefreshCw size={20} /> Reconnect
                        </button>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* Food / Drinks Tabs */}
                        <div className="flex justify-center gap-6 mb-12">
                            {(['Food', 'Drinks'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => { setMainCategoryFilter(tab); setCategoryFilter('all') }}
                                    className={`relative group flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-500 ${mainCategoryFilter === tab
                                        ? 'text-white'
                                        : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                >
                                    {mainCategoryFilter === tab && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-gradient-to-r from-[#D4AF37] to-[#8B5A2B] rounded-2xl shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center gap-2">
                                        {tab === 'Food' ? <Utensils size={18} /> : <Coffee size={18} />} {tab}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Sub-category Slider (Slide View) */}
                        <div className="mb-12 relative px-4">
                            <Carousel
                                opts={{
                                    align: "start",
                                    containScroll: "trimSnaps",
                                }}
                                className="w-full"
                            >
                                <CarouselContent className="-ml-3">
                                    {categories.map((cat: string) => (
                                        <CarouselItem key={cat} className="pl-3 basis-auto">
                                            <button
                                                onClick={() => setCategoryFilter(cat)}
                                                className={cn(
                                                    "flex items-center gap-3 px-6 py-3 rounded-xl font-black whitespace-nowrap text-[10px] uppercase tracking-[0.2em] transition-all duration-300 border",
                                                    categoryFilter === cat
                                                        ? "bg-[#D4AF37] text-white border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)] scale-105"
                                                        : "bg-[#1A1A1A] text-gray-400 hover:text-[#D4AF37] border-white/5 hover:border-[#D4AF37]/30"
                                                )}
                                            >
                                                <span className={categoryFilter === cat ? "text-white" : "text-[#D4AF37]"}>
                                                    {cat === "all" ? <Sparkles size={14} /> : getCategoryIcon(cat)}
                                                </span>
                                                <span>{cat === "all" ? "Whole Collection" : cat}</span>
                                            </button>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                                <div className="hidden lg:block">
                                    <CarouselPrevious className="-left-14 size-10 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white border-white/5 shadow-xl transition-all" />
                                    <CarouselNext className="-right-14 size-10 bg-[#1A1A1A] hover:bg-[#D4AF37] text-white border-white/5 shadow-xl transition-all" />
                                </div>
                            </Carousel>
                        </div>

                        {/* Empty */}
                        {filteredItems.length === 0 && (
                            <div className="text-center py-24 bg-[#121212] rounded-[3rem] border border-white/5 shadow-inner">
                                <div className="text-[#D4AF37]/20 mb-6 flex justify-center"><Utensils size={80} /></div>
                                <h2 className="text-2xl font-black text-gray-400 uppercase tracking-widest">Minimalism</h2>
                                <p className="text-gray-600 mt-2 font-bold uppercase text-[10px] tracking-[0.3em]">No selections available in this category</p>
                            </div>
                        )}

                        {/* Menu Items (List View) */}
                        {filteredItems.length > 0 && (
                            <motion.div
                                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                                layout
                            >
                                <AnimatePresence mode="popLayout">
                                    {filteredItems.map((item, idx) => (
                                        <motion.div
                                            key={item._id}
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.4, delay: idx * 0.05 }}
                                            className="group relative bg-[#121212] rounded-3xl p-5 border border-white/5 hover:border-[#D4AF37]/30 transition-all duration-500 overflow-hidden"
                                        >
                                            <div className="flex gap-5 relative z-10">
                                                {/* Image */}
                                                <div className="relative w-32 h-32 rounded-2xl overflow-hidden shrink-0 bg-[#0A0A0A] border border-white/5 shadow-inner">
                                                    {item.image ? (
                                                        <Image
                                                            src={item.image}
                                                            alt={item.name}
                                                            fill
                                                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                                                            sizes="150px"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[#D4AF37]/30">
                                                            {getCategoryIcon(item.category)}
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                                </div>

                                                {/* Details */}
                                                <div className="flex-grow min-w-0 py-1">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="text-lg font-black text-white group-hover:text-[#D4AF37] transition-colors line-clamp-1 pr-2 uppercase tracking-tight">
                                                            {item.name}
                                                        </h3>
                                                    </div>

                                                    {item.description && (
                                                        <p className="text-[11px] text-gray-500 line-clamp-2 mb-4 leading-relaxed font-medium">
                                                            {item.description}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center justify-between mt-auto">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xl font-black text-[#D4AF37]">
                                                                {item.price} <span className="text-[10px] uppercase ml-0.5 tracking-tighter">Br</span>
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-3">
                                                            {item.preparationTime && (
                                                                <span className="flex items-center gap-1.5 text-[9px] text-gray-500 font-black uppercase tracking-[0.1em]">
                                                                    <Timer size={12} className="text-[#D4AF37]" /> {item.preparationTime}m
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* ID Badge */}
                                            {item.menuId && (
                                                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md text-[#D4AF37] text-[8px] font-black px-2 py-0.5 rounded-md border border-[#D4AF37]/10 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-2 group-hover:translate-x-0">
                                                    #{item.menuId}
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {/* Footer */}
                        <div className="text-center mt-20 pb-12">
                            <div className="inline-flex flex-col items-center gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-[1px] w-8 bg-white/10"></div>
                                    <Crown size={24} className="text-[#D4AF37] opacity-50" />
                                    <div className="h-[1px] w-8 bg-white/10"></div>
                                </div>
                                <div className="bg-[#121212]/50 backdrop-blur-sm px-8 py-4 rounded-[2rem] border border-[#D4AF37]/10 shadow-2xl">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.4em]">
                                        Powered by <span className="text-[#D4AF37]">Abekut Elite</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
