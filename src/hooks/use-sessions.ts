import { useState } from "react"
import { useRpc } from "./use-rpc"
import { useSessionsRefresh } from "./use-sessions-refresh"
import { gatewayWs } from "@/services/gateway-ws"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { formatRpcError } from "@/lib/errors"
import type { SessionEntry } from "@/types/session"

export function useSessions() {
  const { data, isLoading, error, scopeError, refetch } = useRpc(() => gatewayWs.sessionsList(), [])

  useSessionsRefresh(refetch)

  const sessions: SessionEntry[] = data?.sessions ?? []
  const count: number = data?.count ?? sessions.length

  return { sessions, count, isLoading, error, scopeError, refetch }
}

export function useSessionDelete(refetch: () => void) {
  const [deleting, setDeleting] = useState(false)
  const addToast = useErrorToastStore((s) => s.addToast)

  const deleteSession = async (key: string) => {
    setDeleting(true)
    try {
      await gatewayWs.sessionsDelete(key)
      refetch()
    } catch (err) {
      addToast(`Failed to delete session: ${formatRpcError(err)}`)
      throw err
    } finally {
      setDeleting(false)
    }
  }

  return { deleteSession, deleting }
}

export function useSessionCleanup(sessions: SessionEntry[], refetch: () => void) {
  const [cleaning, setCleaning] = useState(false)
  const addToast = useErrorToastStore((s) => s.addToast)

  const cleanup = async (maxAgeDays: number) => {
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000
    const stale = sessions.filter((s) => {
      const age = s.age ?? (s.updatedAt != null ? Date.now() - s.updatedAt : null)
      return age != null && age > maxAgeMs
    })
    if (stale.length === 0) return 0

    setCleaning(true)
    try {
      for (const s of stale) {
        await gatewayWs.sessionsDelete(s.key)
      }
      refetch()
      return stale.length
    } catch (err) {
      addToast(`Cleanup failed: ${formatRpcError(err)}`)
      throw err
    } finally {
      setCleaning(false)
    }
  }

  return { cleanup, cleaning }
}
