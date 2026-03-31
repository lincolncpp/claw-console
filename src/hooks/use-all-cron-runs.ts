import { useEffect, useMemo, useRef } from "react"
import { useCronStore } from "@/stores/cron-store"
import { useGatewayStore } from "@/stores/gateway-store"
import { gatewayWs } from "@/services/gateway-ws"

const AVG_RUN_COUNT = 10

/**
 * Fetches cron runs for all jobs at the app level.
 * Call this once in App.tsx so data is ready before the user visits /cron.
 */
export function useFetchAllCronRuns() {
  const jobs = useCronStore((s) => s.jobs)
  const setRuns = useCronStore((s) => s.setRuns)
  const setRunTotals = useCronStore((s) => s.setRunTotals)
  const connectionStatus = useGatewayStore((s) => s.connectionStatus)
  const fetchedRef = useRef<Set<string>>(new Set())
  const fetchingRef = useRef(false)

  useEffect(() => {
    if (connectionStatus !== "connected" || jobs.length === 0) return
    if (fetchingRef.current) return

    const toFetch = jobs.filter((j) => !fetchedRef.current.has(j.id))
    if (toFetch.length === 0) return

    let cancelled = false
    fetchingRef.current = true

    async function fetchSequential() {
      for (const job of toFetch) {
        if (cancelled || !gatewayWs.isConnected) break
        try {
          const { runs, total } = await gatewayWs.cronRuns(job.id)
          fetchedRef.current.add(job.id)
          setRuns(job.id, runs)
          setRunTotals(job.id, total)
        } catch {
          // Will retry on next connection
          break
        }
      }
      fetchingRef.current = false
    }

    fetchSequential()
    return () => { cancelled = true }
  }, [connectionStatus, jobs, setRuns, setRunTotals])
}

/**
 * Reads cron runs from the store and computes avg tokens per run (last 10 runs) per job and per agent.
 */
export function useCronTokens() {
  const jobs = useCronStore((s) => s.jobs)
  const runs = useCronStore((s) => s.runs)

  const agentByJob = useMemo(() => {
    const map: Record<string, string> = {}
    for (const job of jobs) {
      map[job.id] = job.agentId ?? "unknown"
    }
    return map
  }, [jobs])

  const avgByJob = useMemo(() => {
    const map: Record<string, number | undefined> = {}
    for (const [jobId, jobRuns] of Object.entries(runs)) {
      const recent = jobRuns
        .filter((r) => r.usage?.total_tokens != null)
        .sort((a, b) => b.runAtMs - a.runAtMs)
        .slice(0, AVG_RUN_COUNT)
      if (recent.length === 0) {
        map[jobId] = undefined
        continue
      }
      const sum = recent.reduce((s, r) => s + r.usage!.total_tokens!, 0)
      map[jobId] = Math.round(sum / recent.length)
    }
    return map
  }, [runs])

  const avgByAgent = useMemo(() => {
    const agentTotals: Record<string, { sum: number; count: number }> = {}
    for (const [jobId, jobRuns] of Object.entries(runs)) {
      const agent = agentByJob[jobId] ?? "unknown"
      const recent = jobRuns
        .filter((r) => r.usage?.total_tokens != null)
        .sort((a, b) => b.runAtMs - a.runAtMs)
        .slice(0, AVG_RUN_COUNT)
      if (!agentTotals[agent]) agentTotals[agent] = { sum: 0, count: 0 }
      for (const r of recent) {
        agentTotals[agent].sum += r.usage!.total_tokens!
        agentTotals[agent].count++
      }
    }
    const map: Record<string, number | undefined> = {}
    for (const [agent, { sum, count }] of Object.entries(agentTotals)) {
      map[agent] = count > 0 ? Math.round(sum / count) : undefined
    }
    return map
  }, [runs, agentByJob])

  return { avgByJob, avgByAgent }
}
