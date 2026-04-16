"use client"

import { useEffect } from "react"
import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { useAuth } from "@/context/auth-context"
import { useLanguage } from "@/context/language-context"
import { useBusinessMetrics, MetricsUtils } from "@/hooks/use-business-metrics"
import { useConfirmation } from "@/hooks/use-confirmation"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  TrendingUp,
} from 'lucide-react'

export default function AdminDashboardPage() {
  const { token } = useAuth()
  const { t } = useLanguage()
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

  const { metrics, loading, error, refresh, lastUpdated } = useBusinessMetrics({
    period: 'today',
    autoRefresh: true,
    refreshInterval: 60000
  })

  if (error) {
    return (
      <ProtectedRoute requiredRoles={["admin"]} requiredPermissions={["overview:view"]}>
        <div className="min-h-screen bg-[#0f1110] p-6 flex items-center justify-center">
          <Card className="bg-[#151716] border-red-900/50 max-w-md shadow-2xl">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Data</h2>
              <p className="text-gray-400 mb-4">{error}</p>
              <Button onClick={refresh} className="bg-gradient-to-b from-[#f3cf7a] to-[#b38822] text-[#2a1708] hover:shadow-[0_4px_15px_rgba(212,175,55,0.4)] border border-[#f5db8b]">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredRoles={["admin"]} requiredPermissions={["overview:view"]}>
      <div className="min-h-screen bg-[#0f1110] p-6 text-white selection:bg-[#d4af37] selection:text-[#0f1110]">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          {/* Header */}
          <div className="bg-[#151716] rounded-xl p-6 border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#1a1c1b] rounded-lg border border-[#d4af37]/20">
                <BarChart3 className="h-7 w-7 text-[#d4af37]" />
              </div>
              <div>
                <h1 className="text-2xl font-playfair italic font-bold text-[#f3cf7a]">Admin Dashboard</h1>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mt-0.5">Business Overview</p>
              </div>
            </div>
            <button onClick={refresh} disabled={loading} className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all disabled:opacity-30">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              icon={<DollarSign className="h-6 w-6" />}
              label="Today's Revenue"
              value={metrics ? MetricsUtils.formatCurrency(metrics.realTimeMetrics.todayRevenue) : "---"}
              color="gold"
            />
            <MetricCard
              icon={<ShoppingCart className="h-6 w-6" />}
              label="Total Orders"
              value={metrics ? metrics.realTimeMetrics.todayOrders.toString() : "-"}
              subtext={metrics ? `${metrics.operationalMetrics.customerSatisfaction.completedOrders} completed` : "loading..."}
              color="gold"
            />
            <MetricCard
              icon={<TrendingUp className="h-6 w-6" />}
              label="Average Order"
              value={metrics ? MetricsUtils.formatCurrency(metrics.realTimeMetrics.averageOrderValue) : "---"}
              color="gold"
            />
            <MetricCard
              icon={<Package className="h-6 w-6" />}
              label="Stock Alerts"
              value={metrics ? metrics.inventoryInsights.lowStockAlerts.length.toString() : "-"}
              color={metrics && metrics.inventoryInsights.lowStockAlerts.length > 0 ? "red" : "gray"}
              isAlert={metrics ? metrics.inventoryInsights.lowStockAlerts.length > 0 : false}
            />
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <Link href="/admin/reports">
              <Card className="hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] transition-all duration-300 cursor-pointer border-white/10 bg-[#151716] group">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="h-10 w-10 text-[#d4af37] mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <h3 className="font-playfair italic text-2xl text-[#f3cf7a] mb-2">View Reports</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-light">Sales & analytics</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/stock">
              <Card className="hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] transition-all duration-300 cursor-pointer border-white/10 bg-[#151716] group">
                <CardContent className="p-6 text-center">
                  <Package className="h-10 w-10 text-[#d4af37] mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <h3 className="font-playfair italic text-2xl text-[#f3cf7a] mb-2">Manage Stock</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-light">Update inventory</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/services">
              <Card className="hover:shadow-[0_4px_20px_rgba(212,175,55,0.15)] transition-all duration-300 cursor-pointer border-white/10 bg-[#151716] group">
                <CardContent className="p-6 text-center">
                  <BarChart3 className="h-10 w-10 text-[#d4af37] mx-auto mb-3 group-hover:scale-110 transition-transform duration-300" />
                  <h3 className="font-playfair italic text-2xl text-[#f3cf7a] mb-2">Services</h3>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-light">Menu, Rooms & Floors</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Stock Alerts */}
          {metrics && metrics.inventoryInsights.lowStockAlerts.length > 0 && (
            <Card className="border-red-900/50 bg-[#1a0f0f] shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500 text-lg font-playfair italic">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Stock Alerts ({metrics.inventoryInsights.lowStockAlerts.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.inventoryInsights.lowStockAlerts.slice(0, 5).map((alert, index) => (
                    <div key={index} className="flex justify-between items-center p-4 bg-[#0f1110] rounded-lg border border-red-900/30">
                      <div>
                        <p className="font-medium text-gray-200">{alert.name}</p>
                        <p className="text-sm text-gray-500 font-light">{alert.current} {alert.unit} remaining</p>
                      </div>
                      <span className="text-[10px] tracking-widest uppercase bg-red-950/80 text-red-400 px-3 py-1 rounded-full font-bold border border-red-900/50">
                        {alert.urgency}
                      </span>
                    </div>
                  ))}
                  {metrics.inventoryInsights.lowStockAlerts.length > 5 && (
                    <Link href="/admin/stock" className="block text-center p-2 text-red-400 hover:text-red-300 hover:underline text-xs tracking-wide uppercase pt-4">
                      View all {metrics.inventoryInsights.lowStockAlerts.length} alerts
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <ConfirmationCard isOpen={confirmationState.isOpen} onClose={closeConfirmation} onConfirm={confirmationState.onConfirm}
          title={confirmationState.options.title} message={confirmationState.options.message}
          type={confirmationState.options.type} confirmText={confirmationState.options.confirmText} cancelText={confirmationState.options.cancelText} />
        <NotificationCard isOpen={notificationState.isOpen} onClose={closeNotification}
          title={notificationState.options.title} message={notificationState.options.message}
          type={notificationState.options.type} autoClose={notificationState.options.autoClose} duration={notificationState.options.duration} />
      </div>
    </ProtectedRoute>
  )
}

function MetricCard({
  icon,
  label,
  value,
  subtext,
  color = "gray",
  isAlert = false
}: {
  icon: React.ReactNode
  label: string
  value: string
  subtext?: string
  color?: "gold" | "red" | "gray" | "green" | "blue" | "purple"
  isAlert?: boolean
}) {
  const colorClasses = {
    gold: "bg-[#1a1712] text-[#d4af37] border-[#d4af37]/20",
    red: "bg-[#1a0f0f] text-red-400 border-red-900/50",
    gray: "bg-[#1a1c1b] text-gray-400 border-white/10",
    green: "bg-[#1a1c1b] text-gray-400 border-white/10",
    blue: "bg-[#1a1c1b] text-gray-400 border-white/10",
    purple: "bg-[#1a1c1b] text-gray-400 border-white/10"
  }

  const selectedColorClass = isAlert ? colorClasses.red : (colorClasses[color as keyof typeof colorClasses] || colorClasses.gray)

  return (
    <Card className={`border bg-[#151716] shadow-xl ${isAlert ? 'border-red-900/50' : 'border-white/10'}`}>
      <CardContent className="p-6">
        <div className={`inline-flex p-3 rounded-lg ${selectedColorClass} mb-4 border`}>
          {icon}
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">{label}</p>
          <p className="text-3xl font-playfair italic text-[#f3cf7a] leading-tight">{value}</p>
          {subtext && <p className="text-xs text-gray-500 font-light pt-1">{subtext}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
