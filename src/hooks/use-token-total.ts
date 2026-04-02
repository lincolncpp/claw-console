import { useMemo } from "react"
import { useCronStore } from "@/stores/cron-store"
import type { SessionEntry } from "@/types/session"

const HOURS = 7 * 24

export function useTokenTotal(tokenSessions?: SessionEntry[]) {
  const runs = useCronStore((s) => s.runs)
  return useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- Date.now() inside memo is fine; recomputes only when runs change
    const cutoff = Date.now() - HOURS * 3_600_000
    let total = 0
    for (const jobRuns of Object.values(runs)) {
      for (const run of jobRuns) {
        if (run.runAtMs >= cutoff && run.usage?.total_tokens) {
          total += run.usage.total_tokens
        }
      }
    }
    if (tokenSessions) {
      for (const session of tokenSessions) {
        if (session.updatedAt && session.updatedAt >= cutoff && session.totalTokens) {
          total += session.totalTokens
        }
      }
    }
    return total
  }, [runs, tokenSessions])
}
