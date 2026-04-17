"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Logo } from "@/components/logo"
import { Menu, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "@/context/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"

export function BentoNavbar() {
    const pathname = usePathname()
    const { user, logout, token } = useAuth()
    const { t } = useLanguage()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const [pendingReception, setPendingReception] = useState(0)
    const [pendingRoomOrders, setPendingRoomOrders] = useState(0)
    const [isRoomServiceHandler, setIsRoomServiceHandler] = useState(false)

    // Poll pending reception count for admin
    useEffect(() => {
        if (user?.role !== "admin" || !token) return
        const fetch_ = async () => {
            try {
                const res = await fetch("/api/reception-requests", { headers: { Authorization: `Bearer ${token}` } })
                if (res.ok) {
                    const data = await res.json()
                    setPendingReception(data.filter((r: any) => r.status === "pending").length)
                }
            } catch { /* silent */ }
        }
        fetch_()
        const interval = setInterval(fetch_, 30000)
        return () => clearInterval(interval)
    }, [user?.role, token])

    // Poll pending room orders for cashier
    useEffect(() => {
        if (user?.role !== "cashier" || !token) return
        const fetch_ = async () => {
            try {
                const res = await fetch("/api/room-orders", { headers: { Authorization: `Bearer ${token}` } })
                if (res.ok) {
                    const data = await res.json()
                    setPendingRoomOrders(data.length)
                }
            } catch { /* silent */ }
        }
        fetch_()
        const interval = setInterval(fetch_, 15000)
        return () => clearInterval(interval)
    }, [user?.role, token])

    // Check if cashier is assigned to any floor
    useEffect(() => {
        if (!user || !token) {
            setIsRoomServiceHandler(false)
            return
        }
        const checkAssignment = async () => {
            try {
                const res = await fetch("/api/floors", { headers: { Authorization: `Bearer ${token}` } })
                if (res.ok) {
                    const floors = await res.json()
                    const assigned = floors.some((f: any) => f.roomServiceCashierId === user.id)
                    setIsRoomServiceHandler(assigned)
                }
            } catch { /* silent */ }
        }
        checkAssignment()
    }, [user?.role, token, user?.id])

    const getLinkClass = (path: string) => {
        const base = "hover:text-[#f3cf7a] hover:scale-105 transition-all text-[10px] uppercase tracking-widest font-black"
        return pathname === path ? `${base} text-[#f3cf7a]` : `${base} text-gray-500`
    }

    // Admin links — Services back as plain link, Reception removed (it's inside Services tab)
    const adminLinks = [
        { label: t("nav.overview"), href: "/admin" },
        { label: t("nav.orders"), href: "/admin/orders" },
        { label: t("nav.users"), href: "/admin/users" },
        { label: t("nav.store"), href: "/admin/store" },
        { label: t("nav.stock"), href: "/admin/stock" },
        { label: t("nav.reports"), href: "/admin/reports" },
        {label: t("nav.services"), href: "/admin/services"},
        ...(isRoomServiceHandler ? [{ label: "Room Orders", href: "/cashier/room-orders" }] : []),
        {label: t("nav.settings"), href: "/admin/settings"}
    ]

    const storeKeeperLinks = [{ label: t("nav.store"), href: "/admin/store" }]
    const cashierLinks = [
        { label: "Standard POS", href: "/cashier" },
        { label: "VIP 1 POS", href: "/cashier/vip1" },
        { label: "VIP 2 POS", href: "/cashier/vip2" },
        ...(isRoomServiceHandler ? [{ label: "Room Orders", href: "/cashier/room-orders" }] : []),
        { label: t("nav.recentOrders"), href: "/cashier/orders" },
    ]
    const guestLinks = [
        { label: t("nav.home"), href: "/" },
        { label: t("nav.services"), href: "/menu" }
    ]
    const receptionLinks = [{ label: "Reception Desk", href: "/reception" }]

    // Build custom role links based on permissions
    const getCustomRoleLinks = () => {
        if (!user?.permissions) return guestLinks
        const perms = user.permissions
        const customLinks: typeof adminLinks = []
        
        if (perms.includes("overview:view")) customLinks.push({ label: t("nav.overview"), href: "/admin" })
        if (perms.includes("orders:view")) customLinks.push({ label: t("nav.orders"), href: "/admin/orders" })
        if (perms.includes("users:view")) customLinks.push({ label: t("nav.users"), href: "/admin/users" })
        if (perms.includes("store:view")) customLinks.push({ label: t("nav.store"), href: "/admin/store" })
        if (perms.includes("stock:view")) customLinks.push({ label: t("nav.stock"), href: "/admin/stock" })
        if (perms.includes("reports:financial_summary")) customLinks.push({ label: t("nav.reports"), href: "/admin/reports" })
        if (perms.includes("services:view")) customLinks.push({ label: t("nav.services"), href: "/admin/services" })
        if (perms.includes("settings:view")) customLinks.push({ label: t("nav.settings"), href: "/admin/settings" })
        if (perms.includes("cashier:access")) customLinks.push({ label: "Cashier POS", href: "/cashier" })
        if (perms.includes("chef:access")) customLinks.push({ label: t("nav.kitchen"), href: "/chef" })
        if (perms.includes("bar:access")) customLinks.push({ label: "Bar Display", href: "/bar" })
        if (perms.includes("reception:access")) customLinks.push({ label: "Reception Desk", href: "/reception" })
        if (perms.includes("display:access")) customLinks.push({ label: "Display Board", href: "/display" })
        if (isRoomServiceHandler) customLinks.push({ label: "Room Orders", href: "/cashier/room-orders" })
        
        return customLinks.length > 0 ? customLinks : guestLinks
    }

    const links = user?.role === "admin" ? adminLinks :
        user?.role === "store_keeper" ? storeKeeperLinks :
            user?.role === "cashier" ? cashierLinks :
                user?.role === "chef" ? [{ label: t("nav.kitchen"), href: "/chef" }] :
                    user?.role === "bar" ? [{ label: "Bar Display", href: "/bar" }] :
                        user?.role === "reception" ? receptionLinks :
                            user?.role === "custom" ? getCustomRoleLinks() :
                                guestLinks

    return (
        <>
            <nav className="flex justify-between items-center mb-4 md:mb-10 px-4 md:px-6 py-2 md:py-3 bg-[#151716]/80 backdrop-blur-xl rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/5 relative z-[100]">
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="lg:hidden p-2 hover:bg-white/5 rounded-full transition-colors text-white">
                        {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <Link href="/" className="flex items-center gap-3 group">
                        <Logo size="md" showText={true} />
                    </Link>
                </div>

                <div className="hidden lg:flex gap-8 font-bold text-sm uppercase tracking-wider items-center">
                    {links.map(link => (
                        <Link key={link.href} href={link.href} className={`${getLinkClass(link.href)} relative flex items-center gap-1.5`}>
                            {link.label}
                            {link.href === "/admin/services" && pendingReception > 0 && (
                                <span className="absolute -top-2 -right-3 min-w-[16px] h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1 shadow-lg">
                                    {pendingReception}
                                </span>
                            )}
                            {link.href === "/cashier/room-orders" && pendingRoomOrders > 0 && (
                                <span className="absolute -top-2 -right-3 min-w-[16px] h-4 bg-[#d4af37] text-[#0f1110] text-[8px] font-black rounded-full flex items-center justify-center px-1 shadow-lg border border-[#0f1110]">
                                    {pendingRoomOrders}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <LanguageSwitcher />
                    {user ? (
                        <div className="flex items-center gap-4">
                            <span className="hidden md:block text-[10px] uppercase tracking-widest font-black text-[#f3cf7a]">{t("nav.hi")}, {user.name}! ✨</span>
                            <button onClick={logout} className="bg-red-950/30 text-red-500 border border-red-500/20 px-5 py-2.5 rounded-full text-[10px] uppercase font-black tracking-widest hover:bg-red-500 hover:text-white transition-all transform active:scale-95">
                                {t("nav.logout")}
                            </button>
                        </div>
                    ) : (
                        <Link href="/login" className="bg-[#d4af37] text-[#0f1110] px-7 py-3 rounded-full flex items-center gap-2 text-[10px] uppercase font-black tracking-widest cursor-pointer hover:bg-[#f3cf7a] transition-all shadow-[0_4px_15px_rgba(212,175,55,0.2)]">
                            {t("common.login")}
                        </Link>
                    )}
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="lg:hidden fixed inset-x-6 top-24 bg-[#151716]/95 backdrop-blur-2xl rounded-[30px] p-6 shadow-2xl border border-white/5 z-[90] flex flex-col gap-4 overflow-hidden"
                    >
                        {links.map((link, idx) => (
                            <motion.div key={link.href} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                                <Link href={link.href} onClick={() => setIsMenuOpen(false)}
                                    className={`flex items-center justify-between py-3 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${pathname === link.href ? 'bg-[#d4af37] text-[#0f1110] shadow-lg' : 'hover:bg-white/5 text-gray-400'}`}>
                                    {link.label}
                                    {link.href === "/admin/services" && pendingReception > 0 && (
                                        <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-1">
                                            {pendingReception}
                                        </span>
                                    )}
                                    {link.href === "/cashier/room-orders" && pendingRoomOrders > 0 && (
                                        <span className="min-w-[18px] h-[18px] bg-[#d4af37] text-[#0f1110] text-[8px] font-black rounded-full flex items-center justify-center px-1">
                                            {pendingRoomOrders}
                                        </span>
                                    )}
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}

export default BentoNavbar;
