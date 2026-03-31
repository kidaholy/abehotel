"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // Always use dark theme for Quiet Luxury aesthetic
  useEffect(() => {
    setThemeState('dark')
    setMounted(true)
  }, [])

  // Apply dark theme to document
  useEffect(() => {
    if (mounted) {
      const root = document.documentElement
      root.classList.remove('light', 'dark')
      root.classList.add('dark')
      localStorage.setItem('prime-addis-theme', 'dark')
    }
  }, [theme, mounted])

  const toggleTheme = () => {
    // Do nothing - always stay dark
    setThemeState('dark')
  }

  const setTheme = (newTheme: Theme) => {
    // Always force dark theme
    setThemeState('dark')
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}