import { useCallback, useEffect, useRef, useState } from "react"
import { useGatewayStore } from "@/stores/gateway-store"

interface RpcResult<T> {
  data: T | null
  loading: boolean
  error: string | null
  scopeError: boolean
  refetch: () => void
}

export function useRpc<T>(fetcher: () => Promise<T>, deps: unknown[] = []): RpcResult<T> {
  const connectionStatus = useGatewayStore((s) => s.connectionStatus)
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scopeError, setScopeError] = useState(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const doFetch = useCallback(() => {
    if (connectionStatus !== "connected") return
    setLoading(true)
    setError(null)
    setScopeError(false)
    fetcher()
      .then((result) => {
        if (!mountedRef.current) return
        setData(result)
        setLoading(false)
      })
      .catch((err: Error) => {
        if (!mountedRef.current) return
        const msg = err.message ?? ""
        const isScope = msg.includes("missing scope")
        setScopeError(isScope)
        setError(isScope ? null : msg)
        setLoading(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus, ...deps])

  useEffect(() => {
    doFetch()
  }, [doFetch])

  return { data, loading, error, scopeError, refetch: doFetch }
}
