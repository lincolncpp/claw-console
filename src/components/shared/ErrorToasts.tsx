import { useEffect } from "react"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { X, AlertCircle, AlertTriangle, Info } from "lucide-react"

const AUTO_DISMISS_MS = 8000

const icons = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colors = {
  error: "border-status-error/40 bg-status-error/10 text-status-error",
  warning: "border-status-warning/40 bg-status-warning/10 text-status-warning",
  info: "border-status-info/40 bg-status-info/10 text-status-info",
}

export function ErrorToasts() {
  const toasts = useErrorToastStore((s) => s.toasts)
  const dismissToast = useErrorToastStore((s) => s.dismissToast)

  useEffect(() => {
    if (toasts.length === 0) return
    const oldest = toasts[0]
    const elapsed = Date.now() - oldest.timestamp
    const remaining = Math.max(0, AUTO_DISMISS_MS - elapsed)
    const timer = setTimeout(() => dismissToast(oldest.id), remaining)
    return () => clearTimeout(timer)
  }, [toasts, dismissToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const Icon = icons[toast.level]
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-lg backdrop-blur-sm ${colors[toast.level]}`}
          >
            <Icon className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="flex-1 min-w-0 break-words">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
