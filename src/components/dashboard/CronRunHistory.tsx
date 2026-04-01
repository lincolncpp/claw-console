import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CronRunsTable } from "@/components/shared/CronRunsTable"
import { useCronStore } from "@/stores/cron-store"
import { History } from "lucide-react"
import type { CronRun } from "@/types/cron"

interface CronRunHistoryProps {
  jobId: string
  runs: CronRun[]
}

export function CronRunHistory({ jobId, runs }: CronRunHistoryProps) {
  const navigate = useNavigate()
  const jobs = useCronStore((s) => s.jobs)

  const jobNameMap = useMemo(
    () => Object.fromEntries(jobs.map((j) => [j.id, j.name || j.id])),
    [jobs],
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Run History</CardTitle>
        </div>
        <span className="text-xs text-muted-foreground">
          {runs.length} run{runs.length !== 1 ? "s" : ""}
        </span>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No run history available.
          </p>
        ) : (
          <CronRunsTable
            runs={runs}
            jobNameMap={jobNameMap}
            onRowClick={(run) => navigate(`/cron/${jobId}/runs/${run.ts}`)}
          />
        )}
      </CardContent>
    </Card>
  )
}
