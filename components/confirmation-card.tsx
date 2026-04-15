"use client"

import { useState, useEffect } from "react"
import { X, AlertTriangle, CheckCircle, Info, Trash2 } from "lucide-react"

interface ConfirmationCardProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  type?: 'warning' | 'danger' | 'info' | 'success'
  confirmText?: string
  cancelText?: string
  icon?: React.ReactNode
}

export function ConfirmationCard({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  icon
}: ConfirmationCardProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleConfirm = () => {
    onConfirm?.()
    if (typeof onClose === 'function') onClose()
  }

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          cardBg: 'bg-[#1a1c1b]',
          iconBg: 'bg-red-500/10',
          iconColor: 'text-red-500',
          confirmBg: 'bg-red-600 hover:bg-red-700',
          confirmText: 'text-white',
          defaultIcon: <Trash2 className="w-6 h-6" />
        }
      case 'warning':
        return {
          cardBg: 'bg-[#1a1c1b]',
          iconBg: 'bg-[#d4af37]/10',
          iconColor: 'text-[#f3cf7a]',
          confirmBg: 'bg-gradient-to-r from-[#d4af37] to-[#f3cf7a]',
          confirmText: 'text-[#0f1110]',
          defaultIcon: <AlertTriangle className="w-6 h-6" />
        }
      case 'success':
        return {
          cardBg: 'bg-[#1a1c1b]',
          iconBg: 'bg-emerald-500/10',
          iconColor: 'text-emerald-500',
          confirmBg: 'bg-emerald-600 hover:bg-emerald-700',
          confirmText: 'text-white',
          defaultIcon: <CheckCircle className="w-6 h-6" />
        }
      case 'info':
      default:
        return {
          cardBg: 'bg-[#1a1c1b]',
          iconBg: 'bg-blue-500/10',
          iconColor: 'text-blue-400',
          confirmBg: 'bg-blue-600 hover:bg-blue-700',
          confirmText: 'text-white',
          defaultIcon: <Info className="w-6 h-6" />
        }
    }
  }

  const styles = getTypeStyles()

  if (!isVisible) return null

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-[#1a1c1b] border border-white/10 rounded-[2.5rem] p-10 shadow-2xl max-w-md w-full transform transition-all duration-300 ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className={`w-16 h-16 rounded-full ${styles.iconBg} flex items-center justify-center ${styles.iconColor} border border-current opacity-80`}>
            {icon || styles.defaultIcon}
          </div>
          <button
            onClick={() => { if (typeof onClose === 'function') onClose() }}
            className="w-10 h-10 bg-[#0f1110] border border-white/5 rounded-xl flex items-center justify-center font-bold text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
 
        {/* Content */}
        <div className="mb-10">
          <h2 className="text-2xl font-playfair italic font-bold text-[#f3cf7a] mb-4">
            {title}
          </h2>
          <p className="text-gray-400 font-bold leading-relaxed whitespace-pre-line text-sm">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => { if (typeof onClose === 'function') onClose() }}
            className="flex-1 bg-[#0f1110] border border-white/5 text-gray-500 font-black py-4 rounded-xl hover:text-white transition-all text-[10px] uppercase tracking-widest"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 ${styles.confirmBg} ${styles.confirmText} font-black py-4 rounded-xl transition-all transform hover:scale-[1.02] active:scale-95 shadow-xl text-[10px] uppercase tracking-widest`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

// Success notification card for showing results
interface NotificationCardProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: 'success' | 'error' | 'info'
  autoClose?: boolean
  duration?: number
}

export function NotificationCard({
  isOpen,
  onClose,
  title,
  message,
  type = 'success',
  autoClose = true,
  duration = 4000
}: NotificationCardProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      if (autoClose) {
        const timer = setTimeout(() => {
          if (typeof onClose === 'function') onClose()
        }, duration)
        return () => clearTimeout(timer)
      }
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen, autoClose, duration, onClose])

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          bg: 'bg-red-500/10 border-red-500/20',
          iconBg: 'bg-red-500/20',
          iconColor: 'text-red-400',
          textColor: 'text-red-100',
          icon: <X className="w-5 h-5" />
        }
      case 'info':
        return {
          bg: 'bg-blue-500/10 border-blue-500/20',
          iconBg: 'bg-blue-500/20',
          iconColor: 'text-blue-400',
          textColor: 'text-blue-100',
          icon: <Info className="w-5 h-5" />
        }
      case 'success':
      default:
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/20',
          iconBg: 'bg-emerald-500/20',
          iconColor: 'text-emerald-400',
          textColor: 'text-emerald-100',
          icon: <CheckCircle className="w-5 h-5" />
        }
    }
  }

  const styles = getTypeStyles()

  if (!isVisible) return null

  return (
    <div className={`fixed top-8 right-8 z-[200] transform transition-all duration-500 ${isOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}>
      <div className={`bg-[#1a1c1b] border border-white/5 rounded-2xl p-6 shadow-2xl max-w-sm relative overflow-hidden backdrop-blur-md`}>
        <div className={`absolute inset-0 opacity-5 ${styles.bg}`}></div>
        <div className="flex items-start gap-4 relative z-10">
          <div className={`w-12 h-12 rounded-xl ${styles.iconBg} flex items-center justify-center ${styles.iconColor} flex-shrink-0 border border-current opacity-80`}>
            {styles.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`font-black uppercase tracking-widest text-[10px] ${styles.textColor} mb-1 opacity-60`}>
              {title}
            </h3>
            <p className={`text-sm font-bold text-white whitespace-pre-line`}>
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-[#0f1110] border border-white/5 rounded-lg flex items-center justify-center text-gray-500 hover:text-white transition-all flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}