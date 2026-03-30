import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useCronStore } from "@/stores/cron-store"
import { gatewayWs } from "@/services/gateway-ws"
import { RunHistoryChart } from "./RunHistoryChart"
import { ArrowLeft, Play } from "lucide-react"
import type { CronSchedule } from "@/types/cron"

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ok: "default",
  success: "default",
  running: "secondary",
  error: "destructive",
  failed: "destructive",
  timeout: "destructive",
}

function formatSchedule(schedule: CronSchedule): string {
  switch (schedule.kind) {
    case "cron":
      return schedule.expr + (schedule.tz ? ` (${schedule.tz})` : "")
    case "every": {
      const ms = schedule.everyMs
      if (ms < 60_000) return `Every ${ms / 1000}s`
      if (ms < 3_600_000) return `Every ${ms / 60_000}m`
      if (ms < 86_400_000) return `Every ${ms / 3_600_000}h`
      return `Every ${ms / 86_400_000}d`
    }
    case "at":
      return `Once at ${new Date(schedule.atMs).toLocaleString()}`
    default:
      return "Unknown"
  }
}

export function CronJobDetail() {
  const { jobId } = useParams<{ jobId: string }>()
  const jobs = useCronStore((s) => s.jobs)
  const runs = useCronStore((s) => s.runs)
  const setRuns = useCronStore((s) => s.setRuns)
  const [runningManual, setRunningManual] = useState(false)

  const job = jobs.find((j) => j.id === jobId)
  const jobRuns = jobId ? (runs[jobId] ?? []) : []

  useEffect(() => {
    if (!jobId) return
    gatewayWs
      .cronRuns(jobId)
      .then((r) => setRuns(jobId, r))
      .catch(() => {})
  }, [jobId, setRuns])

  const handleRunNow = async () => {
    if (!jobId) return
    setRunningManual(true)
    try {
      await gatewayWs.cronRun(jobId)
    } catch {
      // ignore
    } finally {
      setRunningManual(false)
    }
  }

  if (!jobId) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No job selected.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          to="/cron"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{job?.name || jobId}</CardTitle>
          {job?.agentId && (
            <p className="text-sm text-muted-foreground">Agent: {job.agentId}</p>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Button size="sm" variant="outline" onClick={handleRunNow} disabled={runningManual}>
              <Play className="h-3 w-3 mr-1" />
              {runningManual ? "Running..." : "Run Now"}
            </Button>
            {job && (
              <Badge variant={job.enabled ? "default" : "outline"}>
                {job.enabled ? "Enabled" : "Disabled"}
              </Badge>
            )}
            {job && (
              <span className="text-xs text-muted-foreground">Target: {job.sessionTarget}</span>
            )}
            {job && (
              <span className="text-xs text-muted-foreground font-mono">
                {formatSchedule(job.schedule)}
              </span>
            )}
          </div>

          {job?.state && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground mb-4">
              {job.state.lastRunAtMs && (
                <span>Last run: {new Date(job.state.lastRunAtMs).toLocaleString()}</span>
              )}
              {job.state.nextRunAtMs && (
                <span>Next run: {new Date(job.state.nextRunAtMs).toLocaleString()}</span>
              )}
              {job.state.lastDurationMs != null && (
                <span>Duration: {(job.state.lastDurationMs / 1000).toFixed(1)}s</span>
              )}
              {job.state.consecutiveErrors != null && job.state.consecutiveErrors > 0 && (
                <span className="text-destructive">
                  Consecutive errors: {job.state.consecutiveErrors}
                </span>
              )}
            </div>
          )}

          <Tabs defaultValue="runs">
            <TabsList>
              <TabsTrigger value="runs">Recent Runs</TabsTrigger>
              <TabsTrigger value="chart">Duration Trend</TabsTrigger>
            </TabsList>
            <TabsContent value="runs">
              {jobRuns.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No run history available.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Run Time</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Delivered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobRuns.map((run, i) => (
                      <TableRow key={`${run.ts}-${i}`}>
                        <TableCell className="text-sm">
                          {new Date(run.runAtMs).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {run.durationMs != null
                            ? `${(run.durationMs / 1000).toFixed(1)}s`
                            : "--"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusVariants[run.status] ?? "outline"}
                            className={run.status === "ok" ? "bg-emerald-500/15 text-emerald-500 border-transparent" : undefined}
                          >
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {run.model ?? "--"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {run.deliveryStatus ?? (run.delivered ? "yes" : "--")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            <TabsContent value="chart">
              <RunHistoryChart runs={jobRuns} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
