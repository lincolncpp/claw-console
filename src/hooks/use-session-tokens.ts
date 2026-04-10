import { useEffect, useState } from "react"
import { gatewayWs } from "@/services/gateway-ws"

export function useSessionTokens(sessionKey: string | null): number | undefined {
  const [totalTokens, setTotalTokens] = useState<number | undefined>()

  useEffect(() => {
    if (!sessionKey) return
    let active = true

    const poll = () => {
      gatewayWs
        .sessionsList()
        .then((resp) => {
          if (!active) return
          const session = resp.sessions.find((s) => s.key === sessionKey)
          setTotalTokens(session?.totalTokens)
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

  return sessionKey ? totalTokens : undefined
}
