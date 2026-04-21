"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

interface AppSettings {
  logo_url: string
  favicon_url: string
  app_name: string
  app_tagline: string
  vat_rate: string
  enable_cashier_printing?: string
  enable_cashier_today_revenue?: string
}

interface SettingsContextType {
  settings: AppSettings
  loading: boolean
  refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({
    logo_url: "/logo.jpg",
    favicon_url: "",
    app_name: "ABE HOTEL",
    app_tagline: "Quiet Luxury Redefined",
    vat_rate: "0.08",
    enable_cashier_printing: "true",
    enable_cashier_today_revenue: "false"
  })
  const [loading, setLoading] = useState(true)

  const refreshSettings = async () => {
    try {
      const response = await fetch("/api/settings/public", { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshSettings()

    // 🔄 Sync settings when window gains focus (helps with multi-tab usage)
    const handleFocus = () => refreshSettings()
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}