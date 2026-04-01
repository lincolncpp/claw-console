import { useEffect } from "react"
import { useCronStore } from "@/stores/cron-store"
import { useRpc } from "./use-rpc"
import { useCronRunsRefresh } from "./use-cron-runs-refresh"
import { gatewayWs } from "@/services/gateway-ws"

export function useCronRuns(jobId: string | undefined) {
  const runs = useCronStore((s) => s.runs)
  const setRuns = useCronStore((s) => s.setRuns)

  const { data, isLoading, error, refetch } = useRpc(
    () => (jobId ? gatewayWs.cronRuns(jobId).then(({ runs }) => runs) : Promise.resolve([])),
    [jobId],
    { enabled: !!jobId },
  )

  useCronRunsRefresh(refetch)

  useEffect(() => {
    if (data && jobId) {
      setRuns(jobId, data)
    }
  }, [data, jobId, setRuns])

  const jobRuns = jobId ? (runs[jobId] ?? []) : []

  return {
    runs: jobRuns,
    isLoading,
    error: error?.message ?? null,
    refetch,
  }
}
