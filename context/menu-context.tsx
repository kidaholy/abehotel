"use client"

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react"
import { useAuth } from "@/context/auth-context"

interface MenuItem {
  _id: string
  menuId?: string
  name: string
  mainCategory?: string
  description?: string
  category: string
  price: number
  image?: string
  available?: boolean
  preparationTime?: number
  reportUnit?: string
  distributions?: string[]
  menuType?: string
}

interface MenuContextValue {
  menuItems: MenuItem[]
  menuLoading: boolean
  menuError: string | null
  refetchMenu: () => void
}

const MenuContext = createContext<MenuContextValue>({
  menuItems: [],
  menuLoading: true,
  menuError: null,
  refetchMenu: () => { },
})

const CACHE_KEY = "pos_menu_cache_v4"

export function MenuProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuError, setMenuError] = useState<string | null>(null)
  const hasFetched = useRef(false)

  const fetchMenu = async (retryCount = 0) => {
    if (!token) return
    try {
      setMenuError(null)
      const response = await fetch("/api/menu?all=true", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        const seen = new Set<string>()
        const deduped = data.filter((item: any) => {
          if (item.available === false) return false
          if (seen.has(item._id)) return false
          seen.add(item._id)
          return true
        })
        localStorage.setItem(CACHE_KEY, JSON.stringify(deduped))
        setMenuItems(deduped)
        setMenuLoading(false)
      } else {
        if (response.status >= 500 && retryCount < 3) {
          setTimeout(() => fetchMenu(retryCount + 1), 1000 * (retryCount + 1))
        } else {
          setMenuError("Failed to load menu items")
          setMenuLoading(false)
        }
      }
    } catch {
      if (retryCount < 3) {
        setTimeout(() => fetchMenu(retryCount + 1), 1000 * (retryCount + 1))
      } else {
        setMenuError("Failed to load menu items. Please check your connection.")
        setMenuLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!token) return

    // Clear stale old caches
    localStorage.removeItem("pos_menu_cache")
    localStorage.removeItem("pos_menu_cache_v2")

    // Load from cache for instant display
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        const hasVip1 = parsed.some((i: any) => i.menuType === "vip1")
        const hasVip2 = parsed.some((i: any) => i.menuType === "vip2")
        if (parsed.length > 0 && hasVip1 && hasVip2) {
          const seen = new Set<string>()
          const deduped = parsed.filter((item: any) => {
            if (seen.has(item._id)) return false
            seen.add(item._id)
            return true
          })
          setMenuItems(deduped)
          setMenuLoading(false)
          hasFetched.current = true
          return // Cache is valid — don't re-fetch until explicit refresh
        }
      } catch {
        // Bad cache, fall through to fetch
      }
    }

    // No valid cache — fetch fresh
    if (!hasFetched.current) {
      hasFetched.current = true
      fetchMenu()
    }
  }, [token])

  // Listen for admin menu updates from other tabs
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "menuUpdated") {
        hasFetched.current = false
        fetchMenu()
      }
    }
    window.addEventListener("storage", handleStorage)
    return () => window.removeEventListener("storage", handleStorage)
  }, [token])

  const refetchMenu = () => {
    localStorage.removeItem(CACHE_KEY)
    hasFetched.current = false
    setMenuLoading(true)
    fetchMenu()
  }

  return (
    <MenuContext.Provider value={{ menuItems, menuLoading, menuError, refetchMenu }}>
      {children}
    </MenuContext.Provider>
  )
}

export function useMenu() {
  return useContext(MenuContext)
}
