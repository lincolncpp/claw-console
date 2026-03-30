import { useEffect } from "react"

const listeners = new Set<() => void>()

export function notifySessionsChanged() {
  listeners.forEach((fn) => fn())
}

export function useSessionsRefresh(refetch: () => void) {
  useEffect(() => {
    listeners.add(refetch)
    return () => {
      listeners.delete(refetch)
    }
  }, [refetch])
}
