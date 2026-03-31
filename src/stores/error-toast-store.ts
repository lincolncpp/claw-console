import { create } from "zustand"

interface Toast {
  id: string
  message: string
  level: "error" | "warning" | "info"
  timestamp: number
}

const MAX_VISIBLE = 3
const DEDUP_WINDOW_MS = 5000

interface ErrorToastState {
  toasts: Toast[]
  addToast: (message: string, level?: "error" | "warning" | "info") => void
  dismissToast: (id: string) => void
}

export const useErrorToastStore = create<ErrorToastState>()((set, get) => ({
  toasts: [],

  addToast: (message, level = "error") => {
    const now = Date.now()
    const existing = get().toasts
    const isDuplicate = existing.some(
      (t) => t.message === message && now - t.timestamp < DEDUP_WINDOW_MS,
    )
    if (isDuplicate) return

    const toast: Toast = {
      id: crypto.randomUUID(),
      message,
      level,
      timestamp: now,
    }
    set({ toasts: [...existing.slice(-(MAX_VISIBLE - 1)), toast] })
  },

  dismissToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  },
}))
