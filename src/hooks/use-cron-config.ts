import { useCallback } from "react"
import { useConfig } from "./use-config"
import { gatewayWs } from "@/services/gateway-ws"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { formatRpcError } from "@/lib/errors"

export interface CronConfig {
  maxConcurrentRuns?: number
  sessionRetention?: string | false
  runLog?: {
    maxBytes?: string
    keepLines?: number
  }
}

export function useCronConfig() {
  const { parsed, configHash, isLoading, refetch } = useConfig()
  const addToast = useErrorToastStore((s) => s.addToast)

  const cronConfig: CronConfig = parsed?.cron ?? {}

  const updateCronConfig = useCallback(
    async (patch: Partial<CronConfig>) => {
      try {
        await gatewayWs.configPatch({ cron: { ...patch } }, configHash)
        refetch()
      } catch (err) {
        addToast(`Failed to update cron config: ${formatRpcError(err)}`)
        throw err
      }
    },
    [configHash, refetch, addToast],
  )

  return { cronConfig, configHash, isLoading, updateCronConfig, refetch }
}
