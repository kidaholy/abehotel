"use client"

import Image from "next/image"
import { useLanguage } from "@/context/language-context"
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
  Pizza
} from 'lucide-react'

interface MenuItemCardProps {
  menuId?: string
  name: string
  price: number
  description?: string
  image?: string
  category: string
  preparationTime?: number
  onAddToCart: () => void
  isSelected?: boolean
  index?: number
}

export function MenuItemCard({
  menuId,
  name,
  price,
  description,
  image,
  category,
  preparationTime,
  onAddToCart,
  isSelected = false,
  index = 0,
}: MenuItemCardProps) {
  const { t } = useLanguage()
  const getCategoryIcon = (cat: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      "Hot Coffee": <Coffee size={18} />,
      "Iced & Cold Coffee": <IceCream size={18} />,
      "Tea & Infusions": <Soup size={18} />,
      "Hot Specialties": <Flame size={18} />,
      "Drinks": <CupSoda size={18} />,
      "Juice": <GlassWater size={18} />,
      "Mojito": <Martini size={18} />,
      Breakfast: <Egg size={18} />,
      Salad: <Leaf size={18} />,
      Burrito: <Beef size={18} />,
      Burgers: <Beef size={18} />,
      Wraps: <Beef size={18} />,
      Sandwich: <SandwichIcon size={18} />,
      Pasta: <UtensilsCrossed size={18} />,
      Chicken: <Beef size={18} />,
      "Ethiopian Taste": <Utensils size={18} />,
    }
    return iconMap[cat] || <Utensils size={18} />
  }

  return (
    <div
      onClick={onAddToCart}
      className={`group transition-all duration-500 cursor-pointer animate-slide-in-up overflow-hidden
        flex flex-row md:flex-col p-3 md:p-6 gap-3 md:gap-4
        relative
        ${isSelected
          ? "bg-[#1a1c1b] ring-1 ring-[#d4af37]/50 shadow-[0_0_30px_rgba(212,175,55,0.1)] scale-[1.02]"
          : "bg-[#151716] md:hover:bg-[#1a1c1b] md:hover:scale-[1.01]"
        }
        rounded-xl
      `}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Decorative Border Layer */}
      <div className="absolute inset-2 border border-[#d4af37]/20 rounded-lg pointer-events-none z-0" />
      <div className="absolute inset-[10px] border border-[#d4af37]/5 rounded-md pointer-events-none z-0" />

      {/* Item Image */}
      <div className="relative w-20 h-20 md:w-full md:h-40 bg-[#0f1110] rounded-lg overflow-hidden flex-shrink-0 z-10">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover transition-all duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 64px, (max-width: 1200px) 33vw, 20vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0f1110]">
            <div className="text-gray-600 group-hover:text-[#f3cf7a] transition-colors duration-300">
              {getCategoryIcon(category)}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col items-center md:items-center text-center z-10">
        <div className="min-w-0 flex-1 md:mt-2 flex flex-col items-center">
          <h3 className="text-[15px] md:text-xl font-playfair italic font-bold text-white leading-tight mb-1">
            {name}
          </h3>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {description ? (
              <p className="text-[10px] md:text-xs text-gray-400 font-medium line-clamp-1">{description}</p>
            ) : (
              <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest">{category}</p>
            )}
          </div>
        </div>

        <div className="mt-2 md:mt-4 flex flex-col items-center gap-2 w-full">
          <div className="text-lg md:text-2xl font-playfair font-bold text-white">
            {price}
            <span className="text-sm md:text-lg text-[#f3cf7a] ml-1">{t("common.currencyBr")}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToCart();
            }}
            className={`w-full py-2.5 md:py-3.5 rounded-lg font-bold text-[11px] md:text-xs transition-all shadow-xl active:scale-95 uppercase tracking-[0.2em]
              ${isSelected
                ? "bg-green-500 text-white shadow-green-200"
                : "bg-accent text-white hover:bg-accent/90 shadow-accent/20"
              }
            `}
          >
            {isSelected ? "Added" : "Add"}
          </button>
        </div>
      </div>
    </div>
  )
}
