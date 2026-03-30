import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
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
import { Button } from "@/components/ui/button"
import { useCronStore } from "@/stores/cron-store"
import { gatewayWs } from "@/services/gateway-ws"
import { RunHistoryChart } from "./RunHistoryChart"
import { Play } from "lucide-react"

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  success: "default",
  running: "secondary",
  failed: "destructive",
  timeout: "destructive",
}

export function CronJobDetail() {
  const selectedJobId = useCronStore((s) => s.selectedJobId)
  const jobs = useCronStore((s) => s.jobs)
  const runs = useCronStore((s) => s.runs)
  const selectJob = useCronStore((s) => s.selectJob)
  const setRuns = useCronStore((s) => s.setRuns)
  const [runningManual, setRunningManual] = useState(false)

  const job = jobs.find((j) => j.jobId === selectedJobId)
  const jobRuns = selectedJobId ? (runs[selectedJobId] ?? []) : []

  useEffect(() => {
    if (!selectedJobId) return
    gatewayWs
      .cronRuns(selectedJobId)
      .then((r) => {
        setRuns(selectedJobId, r)
      })
      .catch(() => {})
  }, [selectedJobId, setRuns])

  const handleRunNow = async () => {
    if (!selectedJobId) return
    setRunningManual(true)
    try {
      await gatewayWs.cronRun(selectedJobId)
    } catch {
      // ignore
    } finally {
      setRunningManual(false)
    }
  }

  return (
    <Dialog open={!!selectedJobId} onOpenChange={(open) => !open && selectJob(null)}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{job?.jobName || selectedJobId}</DialogTitle>
          <DialogDescription>{job?.description || "No description"}</DialogDescription>
        </DialogHeader>

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
        </div>

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
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobRuns.map((run) => (
                    <TableRow key={run.runId}>
                      <TableCell className="text-sm">
                        {new Date(run.startedAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {run.durationMs != null ? `${(run.durationMs / 1000).toFixed(2)}s` : "--"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariants[run.status] ?? "outline"}>
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {run.error || "--"}
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
      </DialogContent>
    </Dialog>
  )
}
