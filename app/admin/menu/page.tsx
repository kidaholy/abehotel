"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { MenuManagementSection } from "@/components/admin/menu-management-section"
import { useConfirmation } from "@/hooks/use-confirmation"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useLanguage } from "@/context/language-context"

/**
 * AdminMenuPage - Standalone page for menu management.
 * Now utilizes the shared MenuManagementSection component.
 */
export default function AdminMenuPage() {
  const { 
    confirmationState, 
    confirm, 
    closeConfirmation, 
    notificationState, 
    notify, 
    closeNotification 
  } = useConfirmation()
  const { t } = useLanguage()

  return (
    <ProtectedRoute requiredRoles={["admin"]} requiredPermissions={["services:view"]}>
      <div className="min-h-screen bg-[#0f1110] p-6 selection:bg-[#d4af37] selection:text-[#0f1110]">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />
          
          <MenuManagementSection 
            confirm={confirm} 
            notify={notify} 
            showTitle={true} 
          />
        </div>

        {/* Confirmation and Notification Cards */}
        <ConfirmationCard
          isOpen={confirmationState.isOpen}
          onClose={closeConfirmation}
          onConfirm={confirmationState.onConfirm}
          title={confirmationState.options.title}
          message={confirmationState.options.message}
          type={confirmationState.options.type}
          confirmText={confirmationState.options.confirmText}
          cancelText={confirmationState.options.cancelText}
          icon={confirmationState.options.icon}
        />

        <NotificationCard
          isOpen={notificationState.isOpen}
          onClose={closeNotification}
          title={notificationState.options.title}
          message={notificationState.options.message}
          type={notificationState.options.type}
          autoClose={notificationState.options.autoClose}
          duration={notificationState.options.duration}
        />
      </div>
    </ProtectedRoute>
  )
}
