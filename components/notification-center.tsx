"use client"

import { useNotifications } from "@/context/notification-context"
import { Check, CheckCircle2, Info, XCircle, AlertTriangle, Trash2 } from "lucide-react"

export function NotificationCenter() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications()
  const unreadOnly = notifications.filter(n => !n.read)

  if (unreadOnly.length === 0) {
    return (
      <div className="p-8 text-center bg-[#0f1110]">
        <Info className="h-8 w-8 text-gray-500 mx-auto mb-2 opacity-20" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">No New Notifications</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col max-h-[400px] w-80">
      <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#0f1110]">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[#f3cf7a]">Notifications</h3>
        <button 
          onClick={markAllAsRead}
          className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
        >
          Mark all as read
        </button>
      </div>
      <div className="overflow-y-auto custom-scrollbar">
        {unreadOnly.map((notif) => (
          <div
            key={notif.id}
            className={`p-4 border-b border-white/5 transition-all hover:bg-white/5 relative group ${notif.read ? 'opacity-40' : 'opacity-100'}`}
          >
            <div className="flex gap-3">
              <div className={`mt-0.5 ${getIconColor(notif.type)}`}>
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[11px] font-bold leading-relaxed ${notif.read ? 'text-gray-500 line-through' : 'text-white'}`}>
                  {notif.message}
                </p>
                <p className="text-[9px] text-gray-600 font-bold mt-1 uppercase tracking-tighter">
                  {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {!notif.read && (
                <button
                  onClick={() => markAsRead(notif.id)}
                  className="p-1 hover:bg-[#d4af37]/20 rounded-md text-[#d4af37] opacity-0 group-hover:opacity-100 transition-all"
                  title="Mark as read"
                >
                  <Check size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function getIcon(type: string) {
  switch (type) {
    case "success": return <CheckCircle2 size={16} />
    case "error": return <XCircle size={16} />
    case "warning": return <AlertTriangle size={16} />
    default: return <Info size={16} />
  }
}

function getIconColor(type: string) {
  switch (type) {
    case "success": return "text-emerald-500"
    case "error": return "text-red-500"
    case "warning": return "text-amber-500"
    default: return "text-blue-500"
  }
}
