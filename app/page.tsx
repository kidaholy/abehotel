"use client"

import Link from "next/link"
import Image from "next/image"
import { ShoppingCart, ArrowRight, Star, TrendingUp, Clock, ChevronRight } from "lucide-react"
import { Logo } from "@/components/logo"
import { useSettings } from "@/context/settings-context"
import { useLanguage } from "@/context/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function WelcomePage() {
    const { settings } = useSettings()
    const { t } = useLanguage()

    return (
        <div className="min-h-screen bg-[#0f1110] text-white antialiased font-sans selection:bg-[#c5a059] selection:text-[#0f1110]">
            {/* Navigation */}
            <nav className="flex justify-between items-center px-4 md:px-12 py-6 sticky top-0 z-50 bg-[#0f1110]/90 backdrop-blur-md border-b border-white/10">
                <Link href="/" className="flex items-center gap-4 group">
                    <Logo size="md" showText={true} textColor="text-white" />
                </Link>
                


                <div className="flex items-center gap-6">
                    <LanguageSwitcher />
                    <Link href="/login" className="hidden sm:block border border-[#c5a059] px-8 py-3 text-[10px] uppercase tracking-[0.2em] font-bold hover:bg-[#c5a059] hover:text-[#0f1110] transition-all duration-500 transform hover:scale-105 active:scale-95">
                        {t("common.login")}
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative h-[95vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image 
                        src="/bed-plate-bg.png" 
                        alt="Abe Hotel Suite and Cuisine" 
                        fill
                        className="object-cover opacity-50 scale-105 animate-[float_20s_ease-in-out_infinite]"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0f1110]/40 to-[#0f1110]"></div>
                </div>

                <div className="relative z-10 text-center px-6 max-w-4xl pt-10">
                    <div className="flex items-center justify-center gap-6 mb-3 animate-slide-in-down">
                        <div className="w-16 h-[1px] bg-gradient-to-r from-transparent to-[#d4af37]"></div>
                        <span className="text-[#d4af37] text-lg md:text-xl font-playfair italic">Welcome to</span>
                        <div className="w-16 h-[1px] bg-gradient-to-l from-transparent to-[#d4af37]"></div>
                    </div>
                    
                    <h1 className="flex flex-col items-center justify-center mb-8 animate-slide-in-up">
                        <span className="text-7xl md:text-9xl text-[#f3cf7a] font-playfair italic whitespace-nowrap leading-none" style={{ textShadow: "0 4px 20px rgba(212,175,55,0.4)" }}>
                            {t("landing.heroTitlePart1")}
                        </span>
                        <span className="uppercase tracking-[0.5em] text-xl md:text-3xl text-[#d4af37] mt-4 font-serif">
                            {t("landing.heroTitlePart2")}
                        </span>
                    </h1>
                    
                    <div className="flex items-center justify-center gap-6 mb-12">
                        <div className="w-24 h-[1px] bg-gradient-to-r from-transparent to-white/40"></div>
                        <p className="text-gray-200 font-light text-sm md:text-lg tracking-widest uppercase text-shadow-sm">
                            {t("landing.heroSubtitle")}
                        </p>
                        <div className="w-24 h-[1px] bg-gradient-to-l from-transparent to-white/40"></div>
                    </div>
                    
                    <div className="flex items-center justify-center animate-slide-in-up [animation-delay:0.3s]">
                        <Link href="/menu" className="bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] px-10 py-3 rounded text-sm uppercase tracking-wider font-bold shadow-[0_4px_15px_rgba(212,175,55,0.3)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.6)] transition-all duration-300 border border-[#f5db8b]">
                            {t("landing.exploreSuites")}
                        </Link>
                    </div>
                </div>


            </header>


        </div>
    )
}
