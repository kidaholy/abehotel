"use client"

import type React from "react"

import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useLanguage } from "@/context/language-context"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[]
  requiredPermissions?: string[]
}

export function ProtectedRoute({ children, requiredRoles, requiredPermissions }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth()
  const router = useRouter()
  const { t } = useLanguage()

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/login")
      } else if (requiredRoles && user) {
        if (user.role === "custom" && requiredPermissions) {
          const hasPermission = requiredPermissions.some(p => user.permissions?.includes(p))
          if (!hasPermission) {
            router.push("/unauthorized")
          }
        } else if (!requiredRoles.includes(user.role)) {
          router.push("/unauthorized")
        }
      }
    }
  }, [isAuthenticated, loading, user, requiredRoles, requiredPermissions, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (requiredRoles && user) {
    if (user.role === "custom" && requiredPermissions) {
      const hasPermission = requiredPermissions.some(p => user.permissions?.includes(p))
      if (!hasPermission) return null
    } else if (!requiredRoles.includes(user.role)) {
      return null
    }
  }

  return <>{children}</>
}
