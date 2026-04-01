import { useCallback } from "react"
import { useConfig } from "./use-config"
import { gatewayWs } from "@/services/gateway-ws"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { formatRpcError } from "@/lib/errors"
import type { ConfigAgentEntry } from "@/types/agent"

export function useAgentMutations(defaultId?: string) {
  const { parsed, configHash, refetch } = useConfig()
  const addToast = useErrorToastStore((s) => s.addToast)

  const addAgent = useCallback(
    async (entry: ConfigAgentEntry) => {
      const currentList = parsed?.agents?.list ?? []
      const newList = [...currentList, entry]
      try {
        await gatewayWs.configPatch({ agents: { list: newList } }, configHash)
        refetch()
      } catch (err) {
        addToast(`Failed to add agent: ${formatRpcError(err)}`)
        throw err
      }
    },
    [parsed, configHash, refetch, addToast],
  )

  const deleteAgent = useCallback(
    async (agentId: string) => {
      if (defaultId && agentId === defaultId) {
        addToast("Cannot delete the default agent")
        return
      }
      try {
        await gatewayWs.agentsDelete(agentId)
        refetch()
      } catch (err) {
        addToast(`Failed to delete agent: ${formatRpcError(err)}`)
        throw err
      }
    },
    [refetch, addToast, defaultId],
  )

  return { addAgent, deleteAgent }
}
