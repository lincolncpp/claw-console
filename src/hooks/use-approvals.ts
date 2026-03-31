import { useRpc } from "./use-rpc"
import { gatewayWs } from "@/services/gateway-ws"

export function useApprovals() {
  const { data, isLoading, error, scopeError, refetch } = useRpc(
    () => gatewayWs.execApprovalsGet(),
    [],
  )

  const approvals: Record<string, unknown>[] = Array.isArray(data)
    ? data
    : data && typeof data === "object" && "approvals" in (data as Record<string, unknown>)
      ? (data as Record<string, unknown[]>).approvals
      : []

  return { approvals, isLoading, error, scopeError, refetch }
}
