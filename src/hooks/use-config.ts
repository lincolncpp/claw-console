import { useRpc } from "./use-rpc"
import { gatewayWs } from "@/services/gateway-ws"
import type { ParsedConfig } from "@/types/agent"

export function useConfig() {
  const { data, isLoading, error, scopeError, refetch } = useRpc(
    () => gatewayWs.configGet(),
    [],
  )

  return {
    parsed: data?.parsed as ParsedConfig | undefined,
    configHash: data?.hash,
    isLoading,
    error,
    scopeError,
    refetch,
  }
}
