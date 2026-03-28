"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { BentoNavbar } from "@/components/bento-navbar"
import { MenuManagementSection } from "@/components/admin/menu-management-section"
import { ConfirmationCard, NotificationCard } from "@/components/confirmation-card"
import { useConfirmation } from "@/hooks/use-confirmation"

export default function Vip1MenuPage() {
  const { confirmationState, confirm, closeConfirmation, notificationState, notify, closeNotification } = useConfirmation()

  return (
    <ProtectedRoute requiredRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <BentoNavbar />

          <MenuManagementSection
            confirm={confirm}
            notify={notify}
            showTitle={true}
            title="VIP 1 Menu Management"
            apiBaseUrl="/api/admin/vip1-menu"
            categoryType="vip1-menu"
          />
        </div>
      </div>

      <ConfirmationCard
        isOpen={confirmationState.isOpen}
        onClose={closeConfirmation}
        onConfirm={confirmationState.onConfirm}
        title={confirmationState.options.title}
        message={confirmationState.options.message}
        type={confirmationState.options.type}
      />
      <NotificationCard
        isOpen={notificationState.isOpen}
        onClose={closeNotification}
        title={notificationState.options.title}
        message={notificationState.options.message}
        type={notificationState.options.type}
      />
    </ProtectedRoute>
  )
}
