"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/auth-context"
import { useSettings } from "@/context/settings-context"
import { Logo } from "@/components/logo"
import Link from "next/link"
import Image from "next/image"
import type React from "react"

import { useLanguage } from "@/context/language-context"
import { LanguageSwitcher } from "@/components/language-switcher"

export default function LoginPage() {
  const [mounted, setMounted] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { settings } = useSettings()
  const { t } = useLanguage()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#e2e7d8] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#f5bc6b]"></div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.message || "Login failed")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1110] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <Image 
            src="/bed-plate-bg.png" 
            alt="Abe Hotel Background" 
            fill
            className="object-cover opacity-20 scale-105"
            priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f1110]/80 to-[#0f1110]"></div>
      </div>

      {/* Language Switcher - Top Right */}
      <div className="absolute top-6 right-6 z-50">
        <LanguageSwitcher />
      </div>

      {/* Login Card */}
      <div className="max-w-md w-full z-10 animate-scale-in">
        <div className="bg-[#0f1110]/60 backdrop-blur-xl rounded-sm border border-white/10 p-10 shadow-2xl relative overflow-hidden">
          
          <div className="flex justify-center mb-8">
            <Logo size="lg" showText={true} textColor="text-white" />
          </div>
          
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-4 mb-3">
                <div className="w-8 h-[1px] bg-gradient-to-r from-transparent to-[#d4af37]"></div>
                <h2 className="text-3xl text-[#f3cf7a] font-playfair italic">{t("login.title")}</h2>
                <div className="w-8 h-[1px] bg-gradient-to-l from-transparent to-[#d4af37]"></div>
            </div>
            <p className="text-gray-400 font-light text-[10px] tracking-[0.2em] uppercase">{t("login.subtitle")}</p>
          </div>

          {error && (
            <div className="bg-red-950/50 text-red-400 p-4 rounded mb-6 text-sm font-light border border-red-900/50 flex items-center justify-center gap-2">
              <span className="text-[#d4af37]">⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2">{t("login.emailLabel")}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 px-5 py-3 rounded text-white font-light focus:outline-none focus:border-[#d4af37] focus:bg-white/10 transition-all placeholder-gray-600 text-sm"
                placeholder="admin@abehotel.com"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.2em] text-gray-400 mb-2">{t("login.passwordLabel")}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 px-5 py-3 rounded text-white font-light focus:outline-none focus:border-[#d4af37] focus:bg-white/10 transition-all placeholder-gray-600 text-sm"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] px-10 py-4 rounded text-[10px] uppercase tracking-[0.3em] font-bold shadow-[0_4px_15px_rgba(212,175,55,0.2)] hover:shadow-[0_4px_25px_rgba(212,175,55,0.4)] transition-all duration-300 border border-[#f5db8b] mt-2 flex justify-center items-center"
            >
              {loading ? t("common.loading") : t("login.logIn")}
            </button>
          </form>

          <div className="mt-8 text-center pt-6 border-t border-white/10">
            <Link href="/" className="text-gray-500 hover:text-[#d4af37] text-[10px] uppercase tracking-[0.2em] transition-colors inline-flex items-center gap-2">
              <span>←</span> {t("login.backHome")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
