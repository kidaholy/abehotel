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
                
                <div className="hidden md:flex space-x-10 text-xs uppercase tracking-[0.2em] font-light">
                    <a href="#stay" className="hover:text-[#c5a059] transition-all duration-300 hover:tracking-[0.3em]">{t("landing.exploreLink")}</a>
                    <a href="#dining" className="hover:text-[#c5a059] transition-all duration-300 hover:tracking-[0.3em]">{t("landing.diningTitle")}</a>
                    <a href="#wellness" className="hover:text-[#c5a059] transition-all duration-300 hover:tracking-[0.3em]">{t("landing.poolTitle")}</a>
                    <a href="#experience" className="hover:text-[#c5a059] transition-all duration-300 hover:tracking-[0.3em]">{t("landing.connectLink")}</a>
                </div>

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
                        src="https://i.pinimg.com/736x/f6/41/af/f641afd29f156c2832df52575a9409b8.jpg" 
                        alt="Abe Hotel Suite" 
                        fill
                        className="object-cover opacity-50 scale-105 animate-[float_20s_ease-in-out_infinite]"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0f1110]/40 to-[#0f1110]"></div>
                </div>

                <div className="relative z-10 text-center px-6 max-w-4xl">
                    <div className="overflow-hidden mb-4">
                        <span className="uppercase tracking-[0.5em] text-[10px] md:text-sm block text-[#c5a059] animate-slide-in-down">
                            {t("landing.since")}
                        </span>
                    </div>
                    
                    <h1 className="text-5xl md:text-8xl lg:text-9xl mb-8 leading-[0.9] font-playfair animate-slide-in-up">
                        {t("landing.heroTitlePart1")}<br />
                        <span className="italic font-extralight opacity-80">{t("landing.heroTitlePart2")}</span>
                    </h1>
                    
                    <p className="max-w-xl mx-auto text-gray-400 font-light leading-relaxed mb-12 text-sm md:text-base animate-scale-in">
                        {t("landing.heroSubtitle")}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row justify-center gap-6 animate-slide-in-up [animation-delay:0.3s]">
                        <Link href="/menu" className="bg-white text-black px-12 py-5 text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-[#c5a059] transition-all duration-500 shadow-2xl hover:shadow-[#c5a059]/30">
                            {t("landing.exploreSuites")}
                        </Link>
                        <button className="border border-white/30 backdrop-blur-sm px-12 py-5 text-[10px] uppercase tracking-[0.3em] font-bold hover:bg-white/10 transition-all duration-500">
                            {t("landing.virtualTour")}
                        </button>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 opacity-50 animate-bounce-gentle">
                    <span className="text-[10px] uppercase tracking-[0.3em]">{t("landing.scroll")}</span>
                    <div className="w-px h-12 bg-gradient-to-b from-white to-transparent"></div>
                </div>
            </header>

            {/* Feature Section */}
            <section className="py-32 px-6 md:px-12 max-w-7xl mx-auto" id="stay">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 items-center">
                    
                    <div className="lg:col-span-12 mb-10 text-center">
                         <h2 className="text-4xl md:text-6xl font-playfair mb-4">{t("landing.featureTitle")}<br /><span className="italic">{t("landing.featureSubtitle")}</span></h2>
                         <div className="w-24 h-px bg-[#c5a059] mx-auto"></div>
                    </div>

                    <div className="lg:col-span-7 relative group">
                        <div className="aspect-[4/5] overflow-hidden rounded-sm relative">
                            <Image 
                                src="https://i.pinimg.com/736x/8a/2b/54/8a2b54d38ea5cb131725396b75bd3837.jpg" 
                                alt={settings.app_name || "Hotel Interior"} 
                                fill
                                className="object-cover grayscale hover:grayscale-0 transition-all duration-[1.5s] ease-in-out group-hover:scale-110"
                            />
                        </div>
                        <div className="absolute -bottom-10 -right-10 bg-[#c5a059] p-12 hidden lg:block w-80 shadow-2xl transform transition-transform duration-700 group-hover:-translate-x-4 group-hover:-translate-y-4">
                            <h3 className="text-black text-2xl font-playfair mb-4">{t("landing.penthouseTitle")}</h3>
                            <p className="text-black/80 text-sm font-light leading-relaxed mb-6">
                                {t("landing.penthouseDesc")}
                            </p>
                            <Link href="/menu" className="flex items-center gap-3 text-black text-[10px] uppercase font-bold tracking-[0.2em] group/btn">
                                {t("landing.explore")} <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    <div className="lg:col-span-5 space-y-10">
                        <p className="text-gray-400 leading-relaxed font-light text-lg">
                            {t("landing.featureDescriptionTop")} <span className="text-white font-normal underline decoration-[#c5a059] decoration-2 underline-offset-8">{settings.app_name || "Abe Hotel"}</span> {t("landing.featureDescriptionBottom")}
                        </p>
                        
                        <div className="grid grid-cols-1 gap-6">
                            {[
                                { title: t("landing.conciergeTitle"), desc: t("landing.conciergeDesc") },
                                { title: t("landing.diningTitle"), desc: t("landing.diningDesc") },
                                { title: t("landing.poolTitle"), desc: t("landing.poolDesc") }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-6 group/item">
                                    <div className="mt-1.5 w-10 h-px bg-[#c5a059] transition-all duration-300 group-hover/item:w-16"></div>
                                    <div>
                                        <h4 className="text-sm uppercase tracking-[0.2em] font-bold mb-2 group-hover/item:text-[#c5a059] transition-colors">{item.title}</h4>
                                        <p className="text-xs text-gray-500 font-light">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="pt-6">
                            <Link href="/menu" className="inline-block border-b border-[#c5a059] text-[#c5a059] uppercase tracking-[0.3em] text-[10px] pb-2 hover:text-white hover:border-white transition-all duration-300">
                                {t("landing.discoverServices")}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quote Section */}
            <section className="py-40 bg-white/5 backdrop-blur-sm mt-20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#c5a059]/5 rounded-full blur-[100px] -mr-48 -mt-48"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#c5a059]/5 rounded-full blur-[100px] -ml-48 -mb-48"></div>
                
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <Star className="text-[#c5a059] mx-auto mb-10 opacity-50" size={32} />
                    <h2 className="text-3xl md:text-5xl font-playfair leading-tight italic font-light opacity-90 mb-12">
                        {t("landing.quote")}
                    </h2>
                    <div className="w-12 h-px bg-white/20 mx-auto"></div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/5 py-20 px-6 md:px-12 mt-20 bg-black/30">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
                    <div className="md:col-span-2 space-y-6">
                        <Link href="/" className="flex items-center gap-4 group">
                            <Logo size="md" showText={true} textColor="text-white" />
                        </Link>
                        <p className="text-gray-500 text-sm font-light max-w-sm leading-relaxed">
                            {t("landing.footerDesc")}
                        </p>
                    </div>
                    
                    <div className="space-y-6">
                        <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#c5a059]">{t("landing.exploreLink")}</h4>
                        <ul className="space-y-3 text-xs text-gray-400 font-light uppercase tracking-widest">
                            <li><a href="#" className="hover:text-white transition-colors">{t("landing.exploreSuites")}</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">{t("landing.poolTitle")}</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">{t("landing.diningTitle")}</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">{t("landing.discoverServices")}</a></li>
                        </ul>
                    </div>

                    <div className="space-y-6">
                        <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#c5a059]">{t("landing.connectLink")}</h4>
                        <ul className="space-y-3 text-xs text-gray-400 font-light uppercase tracking-widest">
                            <li><a href="#" className="hover:text-white transition-colors">Instagram</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">LinkedIn</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Journal</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                        </ul>
                    </div>
                </div>
                
                <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
                    <p className="text-[10px] text-gray-600 tracking-widest uppercase">
                        {t("landing.rights")}
                    </p>
                    <div className="flex gap-8 text-[10px] text-gray-600 uppercase tracking-widest">
                        <a href="#" className="hover:text-white transition-colors">{t("landing.privacy")}</a>
                        <a href="#" className="hover:text-white transition-colors">{t("landing.legal")}</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
