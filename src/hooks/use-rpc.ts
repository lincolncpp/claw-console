import { useCallback, useEffect, useRef, useState } from "react"
import { useGatewayStore } from "@/stores/gateway-store"
import { isScopeError } from "@/lib/errors"

interface RpcOptions {
  enabled?: boolean
}

interface RpcResult<T> {
  data: T | null
  /** True on first load when no data exists yet */
  isLoading: boolean
  /** True during any fetch (including refetch with stale data) */
  isFetching: boolean
  /** @deprecated Use isLoading — kept for backward compatibility */
  loading: boolean
  error: Error | null
  scopeError: boolean
  refetch: () => void
}

export function useRpc<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
  options?: RpcOptions,
): RpcResult<T> {
  const connectionStatus = useGatewayStore((s) => s.connectionStatus)
  const [data, setData] = useState<T | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [scopeError, setScopeError] = useState(false)
  const mountedRef = useRef(true)
  const hasFetchedRef = useRef(false)

  const enabled = options?.enabled ?? true

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const doFetch = useCallback(() => {
    if (connectionStatus !== "connected" || !enabled) return
    setIsFetching(true)
    setError(null)
    setScopeError(false)
    fetcher()
      .then((result) => {
        if (!mountedRef.current) return
        setData(result)
        hasFetchedRef.current = true
        setIsFetching(false)
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return
        const error = err instanceof Error ? err : new Error(String(err))
        if (isScopeError(error)) {
          setScopeError(true)
        } else {
          setError(error)
        }
        setIsFetching(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus, enabled, ...deps])

  useEffect(() => {
    doFetch()
  }, [doFetch])

  const isLoading = isFetching && !hasFetchedRef.current

  return { data, isLoading, isFetching, loading: isLoading, error, scopeError, refetch: doFetch }
}
