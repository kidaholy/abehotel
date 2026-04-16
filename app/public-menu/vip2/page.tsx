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

export default function PublicVip2MenuPage() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([])
    const [mainCategoryFilter, setMainCategoryFilter] = useState<'Food' | 'Drinks'>('Food')
    const [categoryFilter, setCategoryFilter] = useState("all")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                setLoading(true)
                const res = await fetch("/api/public/vip2-menu")
                if (res.ok) {
                    const data = await res.json()
                    setMenuItems(data)
                } else {
                    setError("Failed to load VIP 2 menu")
                }
            } catch {
                setError("Failed to load VIP 2 menu. Please check your connection.")
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
        <div className="min-h-screen bg-[#080808] text-white">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-gradient-to-b from-[#111111] to-[#080808] border-b border-[#D4AF37]/20">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 left-10 text-[#D4AF37] animate-pulse" style={{ animationDelay: '0s' }}><Coffee size={48} /></div>
                    <div className="absolute top-8 right-20 text-[#D4AF37] animate-pulse" style={{ animationDelay: '0.5s' }}><Crown size={40} /></div>
                    <div className="absolute bottom-4 left-1/3 text-[#D4AF37] animate-pulse" style={{ animationDelay: '1s' }}><Martini size={32} /></div>
                    <div className="absolute bottom-2 right-1/4 text-[#D4AF37] animate-pulse" style={{ animationDelay: '1.5s' }}><Soup size={40} /></div>
                </div>
                <div className="relative max-w-5xl mx-auto px-4 py-24 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="flex items-center justify-center gap-6 mb-6">
                            <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-[#D4AF37]"></div>
                            <Crown size={40} className="text-[#D4AF37] drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
                            <div className="h-[1px] w-16 bg-gradient-to-l from-transparent via-[#D4AF37]/50 to-[#D4AF37]"></div>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black text-white mb-6 tracking-tighter uppercase drop-shadow-[0_0_20px_rgba(212,175,55,0.4)] italic">
                            VIP 2 <span className="text-[#D4AF37]">Premium</span>
                        </h1>
                        <p className="text-xs md:text-sm text-gray-400 font-black uppercase tracking-[0.5em] opacity-80">
                            The Pinnacle of Taste & Luxury
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-12">
                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="relative w-28 h-28 mb-8">
                            <div className="absolute inset-0 border-2 border-[#D4AF37]/30 rounded-full animate-ping" />
                            <div className="absolute inset-3 border-2 border-t-[#D4AF37] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center text-[#D4AF37]"><Crown size={48} /></div>
                        </div>
                        <p className="text-[#D4AF37] font-black text-xl uppercase tracking-[0.2em] animate-pulse">Curating Your Experience...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="text-center py-24 bg-[#0F0F0F] rounded-[4rem] border border-[#D4AF37]/10 shadow-2xl">
                        <div className="text-[#D4AF37] mb-8 flex justify-center"><Crown size={80} className="opacity-40" /></div>
                        <h2 className="text-4xl font-black text-white mb-4 tracking-tighter">Temporarily Unavailable</h2>
                        <p className="text-gray-500 mb-10 max-w-sm mx-auto font-medium">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-12 py-5 bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-white rounded-[2rem] font-black uppercase tracking-[0.2em] text-sm hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all active:scale-95 flex items-center justify-center gap-3 mx-auto"
                        >
                            <RefreshCw size={22} /> Refresh Access
                        </button>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* Food / Drinks Tabs */}
                        <div className="flex justify-center gap-8 mb-16">
                            {(['Food', 'Drinks'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => { setMainCategoryFilter(tab); setCategoryFilter('all') }}
                                    className={`relative group flex items-center gap-4 px-12 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all duration-700 ${mainCategoryFilter === tab
                                        ? 'text-white'
                                        : 'text-gray-600 hover:text-gray-400'
                                        }`}
                                >
                                    {mainCategoryFilter === tab && (
                                        <motion.div
                                            layoutId="activeTabVip2"
                                            className="absolute inset-0 bg-gradient-to-br from-[#D4AF37] via-[#B8860B] to-[#8B5A2B] rounded-[2rem] shadow-[0_0_30px_rgba(212,175,55,0.25)]"
                                            transition={{ type: "spring", bounce: 0.1, duration: 0.8 }}
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center gap-3">
                                        {tab === 'Food' ? <Utensils size={20} /> : <Coffee size={20} />} {tab}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Sub-category Slider (Slide View) */}
                        <div className="mb-16 relative px-6">
                            <Carousel
                                opts={{
                                    align: "start",
                                    containScroll: "trimSnaps",
                                }}
                                className="w-full"
                            >
                                <CarouselContent className="-ml-4">
                                    {categories.map((cat: string) => (
                                        <CarouselItem key={cat} className="pl-4 basis-auto">
                                            <button
                                                onClick={() => setCategoryFilter(cat)}
                                                className={cn(
                                                    "flex items-center gap-4 px-8 py-4 rounded-3xl font-black whitespace-nowrap text-[11px] uppercase tracking-[0.25em] transition-all duration-500 border",
                                                    categoryFilter === cat
                                                        ? "bg-[#D4AF37] text-white border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)] scale-105"
                                                        : "bg-[#0F0F0F] text-gray-500 hover:text-[#D4AF37] border-white/5 hover:border-[#D4AF37]/30"
                                                )}
                                            >
                                                <span className={categoryFilter === cat ? "text-white" : "text-[#D4AF37]"}>
                                                    {cat === "all" ? <Sparkles size={16} /> : getCategoryIcon(cat)}
                                                </span>
                                                <span>{cat === "all" ? "Full Selection" : cat}</span>
                                            </button>
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                                <div className="hidden xl:block">
                                    <CarouselPrevious className="-left-16 size-12 bg-[#0F0F0F] hover:bg-[#D4AF37] text-white border-white/5 shadow-2xl transition-all" />
                                    <CarouselNext className="-right-16 size-12 bg-[#0F0F0F] hover:bg-[#D4AF37] text-white border-white/5 shadow-2xl transition-all" />
                                </div>
                            </Carousel>
                        </div>

                        {/* Empty */}
                        {filteredItems.length === 0 && (
                            <div className="text-center py-32 bg-[#0F0F0F] rounded-[5rem] border border-white/5 shadow-inner">
                                <div className="text-[#D4AF37]/10 mb-8 flex justify-center"><Crown size={100} /></div>
                                <h2 className="text-3xl font-black text-gray-500 uppercase tracking-[0.2em]">Exclusivity</h2>
                                <p className="text-gray-700 mt-4 font-black uppercase text-xs tracking-[0.4em]">Currently being refined by our chefs</p>
                            </div>
                        )}

                        {/* Menu Items (List View) */}
                        {filteredItems.length > 0 && (
                            <motion.div
                                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8"
                                layout
                            >
                                <AnimatePresence mode="popLayout">
                                    {filteredItems.map((item, idx) => (
                                        <motion.div
                                            key={item._id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ duration: 0.5, delay: idx * 0.08 }}
                                            className="group relative bg-gradient-to-br from-[#0F0F0F] to-[#080808] rounded-[3rem] p-6 border border-white/5 hover:border-[#D4AF37]/40 transition-all duration-700 overflow-hidden shadow-xl"
                                        >
                                            <div className="flex gap-6 relative z-10">
                                                {/* Image */}
                                                <div className="relative w-40 h-40 rounded-[2.5rem] overflow-hidden shrink-0 bg-[#050505] border border-white/10 shadow-2xl group-hover:border-[#D4AF37]/20 transition-all duration-700">
                                                    {item.image ? (
                                                        <Image
                                                            src={item.image}
                                                            alt={item.name}
                                                            fill
                                                            className="object-cover transition-transform duration-1000 group-hover:scale-110"
                                                            sizes="200px"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-[#D4AF37]/20">
                                                            {getCategoryIcon(item.category)}
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                                                </div>

                                                {/* Details */}
                                                <div className="flex-grow min-w-0 py-3 flex flex-col">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <h3 className="text-xl font-black text-white group-hover:text-[#D4AF37] transition-colors line-clamp-2 uppercase tracking-tight leading-tight italic">
                                                            {item.name}
                                                        </h3>
                                                    </div>

                                                    {item.description && (
                                                        <p className="text-[12px] text-gray-500 line-clamp-2 mb-6 leading-relaxed font-bold opacity-80 group-hover:opacity-100 transition-opacity">
                                                            {item.description}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center justify-between mt-auto">
                                                        <div className="flex flex-col">
                                                            <span className="text-2xl font-black text-[#D4AF37] group-hover:scale-105 transition-transform origin-left">
                                                                {item.price} <span className="text-xs uppercase ml-1 tracking-tighter opacity-70">Br</span>
                                                            </span>
                                                        </div>
                                                        
                                                        {item.preparationTime && (
                                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                                                                <Timer size={14} className="text-[#D4AF37]" />
                                                                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{item.preparationTime} min</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Glow Effect */}
                                            <div className="absolute -inset-24 bg-[#D4AF37]/5 rounded-full blur-[100px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                                            
                                            {/* ID Badge */}
                                            {item.menuId && (
                                                <div className="absolute top-6 right-8 bg-[#D4AF37] text-black text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] transform -rotate-2 opacity-0 group-hover:opacity-100 transition-all duration-700">
                                                    ID {item.menuId}
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {/* Footer */}
                        <div className="text-center mt-32 pb-16">
                            <div className="inline-flex flex-col items-center gap-6">
                                <div className="flex items-center gap-8">
                                    <div className="h-[2px] w-12 bg-gradient-to-r from-transparent to-[#D4AF37]/40"></div>
                                    <Crown size={32} className="text-[#D4AF37] opacity-60 animate-pulse" />
                                    <div className="h-[2px] w-12 bg-gradient-to-l from-transparent to-[#D4AF37]/40"></div>
                                </div>
                                <div className="bg-[#0F0F0F] backdrop-blur-xl px-12 py-6 rounded-[3rem] border border-[#D4AF37]/20 shadow-[0_0_50px_rgba(212,175,55,0.1)]">
                                    <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.6em]">
                                        Exclusive Member of <span className="text-[#D4AF37]">Prime Addis</span>
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
