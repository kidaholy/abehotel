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

const CACHE_KEY = "pos_menu_cache_v9"
const MENU_SYNC_EVENT = "menuUpdated"
const MENU_SYNC_CHANNEL = "abehotel-menu-sync"
const MENU_POLL_INTERVAL_MS = 10000

// Clear all old cache keys on module load
if (typeof window !== "undefined") {
  ["pos_menu_cache", "pos_menu_cache_v2", "pos_menu_cache_v3",
   "pos_menu_cache_v4", "pos_menu_cache_v5", "pos_menu_cache_v6",
   "pos_menu_cache_v7", "pos_menu_cache_v8"].forEach(k => localStorage.removeItem(k))
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuError, setMenuError] = useState<string | null>(null)
  const fetchingRef = useRef(false)

  const fetchMenu = async (retryCount = 0) => {
    if (!token || fetchingRef.current) return
    fetchingRef.current = true
    try {
      setMenuError(null)
      const response = await fetch("/api/menu", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      if (response.ok) {
        const data = await response.json()
        const seen = new Set<string>()
        const deduped = data.filter((item: any) => {
          // Use _id + menuType as the unique key — same item can exist in multiple collections
          const key = `${item._id}_${item.menuType || 'standard'}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
        localStorage.setItem(CACHE_KEY, JSON.stringify(deduped))
        setMenuItems(deduped)
        setMenuLoading(false)
      } else {
        if (response.status >= 500 && retryCount < 3) {
          fetchingRef.current = false
          setTimeout(() => fetchMenu(retryCount + 1), 1000 * (retryCount + 1))
        } else {
          setMenuError("Failed to load menu items")
          setMenuLoading(false)
        }
      }
    } catch {
      fetchingRef.current = false
      if (retryCount < 3) {
        setTimeout(() => fetchMenu(retryCount + 1), 1000 * (retryCount + 1))
      } else {
        setMenuError("Failed to load menu items. Please check your connection.")
        setMenuLoading(false)
      }
    } finally {
      fetchingRef.current = false
    }
  }

  useEffect(() => {
    if (!token) return

    // Show cached data instantly while fresh fetch runs in background
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed.length > 0) {
          const seen = new Set<string>()
          const deduped = parsed.filter((item: any) => {
            const key = `${item._id}_${item.menuType || 'standard'}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
          })
          setMenuItems(deduped)
          setMenuLoading(false)
        }
      } catch { /* bad cache */ }
    }

    // Always fetch fresh — cache is just for instant display
    fetchMenu()
  }, [token])

  // Listen for menu updates from other tabs/windows and periodic sync
  useEffect(() => {
    if (!token) return

    const handleStorage = (e: StorageEvent) => {
      if (e.key === MENU_SYNC_EVENT) {
        fetchingRef.current = false
        fetchMenu()
      }
    }

    const handleMenuUpdated = () => {
      fetchingRef.current = false
      fetchMenu()
    }

    const handleVisibilityOrFocus = () => {
      if (!document.hidden) {
        fetchingRef.current = false
        fetchMenu()
      }
    }

    const poller = window.setInterval(() => {
      if (!document.hidden) {
        fetchMenu()
      }
    }, MENU_POLL_INTERVAL_MS)

    let channel: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(MENU_SYNC_CHANNEL)
      channel.onmessage = (event) => {
        if (event?.data?.type === MENU_SYNC_EVENT) {
          fetchingRef.current = false
          fetchMenu()
        }
      }
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener(MENU_SYNC_EVENT, handleMenuUpdated)
    window.addEventListener("focus", handleVisibilityOrFocus)
    document.addEventListener("visibilitychange", handleVisibilityOrFocus)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(MENU_SYNC_EVENT, handleMenuUpdated)
      window.removeEventListener("focus", handleVisibilityOrFocus)
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus)
      window.clearInterval(poller)
      if (channel) channel.close()
    }
  }, [token])

  const refetchMenu = () => {
    localStorage.removeItem(CACHE_KEY)
    fetchingRef.current = false
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
