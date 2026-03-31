import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { TokenBadge } from "@/components/shared/TokenBadge"
import { formatTimeAgo, formatDuration } from "@/lib/format"
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Total Tokens</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentRuns.map((run, i) => (
              <TableRow
                key={`${run.ts}-${i}`}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/cron/${run.jobId}/runs/${run.ts}`)}
              >
                <TableCell className="text-sm font-medium">
                  {jobNameMap[run.jobId] ?? run.jobId}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDuration(run.durationMs)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={run.status} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {run.model ?? "--"}
                </TableCell>
                <TableCell>
                  <TokenBadge tokens={run.usage?.total_tokens} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatTimeAgo(run.runAtMs)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
