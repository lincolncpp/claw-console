import { useEffect } from "react"

const listeners = new Set<() => void>()

export function notifyCronRunsChanged() {
  listeners.forEach((fn) => fn())
}

export function useCronRunsRefresh(callback: () => void) {
  useEffect(() => {
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
    }
  }, [callback])
}
