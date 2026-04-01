import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CronRunsTable } from "@/components/shared/CronRunsTable"
import { useCronStore } from "@/stores/cron-store"
import { Activity } from "lucide-react"

export function RecentCronRuns() {
  const runs = useCronStore((s) => s.runs)
  const jobs = useCronStore((s) => s.jobs)
  const navigate = useNavigate()

  const jobNameMap = useMemo(
    () => Object.fromEntries(jobs.map((j) => [j.id, j.name || j.id])),
    [jobs],
  )

  const recentRuns = useMemo(() => {
    return Object.values(runs)
      .flat()
      .sort((a, b) => b.runAtMs - a.runAtMs)
      .slice(0, 10)
  }, [runs])

  if (recentRuns.length === 0) return null

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Recent Runs</CardTitle>
        </div>
        <span className="text-xs text-muted-foreground">
          Last {recentRuns.length} across all jobs
        </span>
      </CardHeader>
      <CardContent>
        <CronRunsTable
          runs={recentRuns}
          jobNameMap={jobNameMap}
          onRowClick={(run) => navigate(`/cron/${run.jobId}/runs/${run.ts}`)}
        />
      </CardContent>
    </Card>
  )
}
