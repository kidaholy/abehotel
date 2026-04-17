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
        // For custom roles, check if they have the required permissions
        if (user.role === "custom") {
          if (requiredPermissions && Array.isArray(requiredPermissions) && requiredPermissions.length > 0) {
            const hasPermission = requiredPermissions.some(p => user.permissions?.includes(p))
            if (!hasPermission) {
              router.push("/unauthorized")
            }
          }
          // If no specific permissions required, allow custom roles through
        } else if (!requiredRoles.includes(user.role)) {
          // For non-custom roles, check if their role is in the required roles list
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
    // For custom roles, check if they have the required permissions
    if (user.role === "custom") {
      if (requiredPermissions && Array.isArray(requiredPermissions) && requiredPermissions.length > 0) {
        const hasPermission = requiredPermissions.some(p => user.permissions?.includes(p))
        if (!hasPermission) return null
      }
      // If no specific permissions required, allow custom roles through
    } else if (!requiredRoles.includes(user.role)) {
      // For non-custom roles, check if their role is in the required roles list
      return null
    }
  }

  return <>{children}</>
}
