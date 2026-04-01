import { useMemo } from "react"
import { useCronStore } from "@/stores/cron-store"

const HOURS = 7 * 24

export function useTokenTotal() {
  const runs = useCronStore((s) => s.runs)
  // eslint-disable-next-line react-hooks/purity -- cutoff for 7-day token window; harmless impurity
  const now = Date.now()
  return useMemo(() => {
    const cutoff = now - HOURS * 3_600_000
    let total = 0
    for (const jobRuns of Object.values(runs)) {
      for (const run of jobRuns) {
        if (run.runAtMs >= cutoff && run.usage?.total_tokens) {
          total += run.usage.total_tokens
        }
      }
    }
    return total
  }, [runs, now])
}
