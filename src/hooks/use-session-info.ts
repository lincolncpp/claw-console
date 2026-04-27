import { useEffect, useState } from "react"
import { gatewayWs } from "@/services/gateway-ws"
import type { SessionEntry } from "@/types/session"

export function useSessionInfo(sessionKey: string | null): SessionEntry | undefined {
  const [session, setSession] = useState<SessionEntry | undefined>()

  useEffect(() => {
    if (!sessionKey) return
    let active = true

    const poll = () => {
      gatewayWs
        .sessionsList()
        .then((resp) => {
          if (!active) return
          setSession(resp.sessions.find((s) => s.key === sessionKey))
        })
        .catch(() => {})
    }

    poll()
    const interval = setInterval(poll, 1000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [sessionKey])

  if (!sessionKey) return undefined
  // Avoid flashing the previous session's data after sessionKey changes
  // but before the next poll completes.
  return session?.key === sessionKey ? session : undefined
}
