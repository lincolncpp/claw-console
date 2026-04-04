import { useCallback } from "react"
import { useConfig } from "./use-config"
import { gatewayWs } from "@/services/gateway-ws"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { formatRpcError } from "@/lib/errors"

export interface ApprovalConfig {
  security?: string
  askMode?: string
}

export function useApprovalConfig() {
  const { parsed, configHash, isLoading, refetch } = useConfig()
  const addToast = useErrorToastStore((s) => s.addToast)

  const approvalConfig: ApprovalConfig = {
    security: parsed?.tools?.exec?.security,
    askMode: parsed?.tools?.exec?.ask,
  }

  const updateApprovalConfig = useCallback(
    async (patch: { security?: string; ask?: string }) => {
      try {
        await gatewayWs.configPatch({ tools: { exec: { ...patch } } }, configHash)
        refetch()
      } catch (err) {
        addToast(`Failed to update approval config: ${formatRpcError(err)}`)
        throw err
      }
    },
    [configHash, refetch, addToast],
  )

  return { approvalConfig, configHash, isLoading, updateApprovalConfig, refetch }
}
