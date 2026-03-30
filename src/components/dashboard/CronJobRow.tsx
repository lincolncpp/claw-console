import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import type { CronJob } from "@/types/cron"

function formatSchedule(job: CronJob): string {
  const { schedule } = job
  switch (schedule.type) {
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

function formatTime(epochMs?: number): string {
  if (!epochMs) return "--"
  return new Date(epochMs).toLocaleString()
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  success: "default",
  running: "secondary",
  failed: "destructive",
  timeout: "destructive",
}

interface CronJobRowProps {
  job: CronJob
  onClick: () => void
}

export function CronJobRow({ job, onClick }: CronJobRowProps) {
  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onClick}>
      <TableCell className="font-medium">{job.jobName || job.jobId}</TableCell>
      <TableCell className="text-sm text-muted-foreground font-mono">
        {formatSchedule(job)}
      </TableCell>
      <TableCell>{job.sessionTarget}</TableCell>
      <TableCell>
        <Badge variant={job.enabled ? "default" : "outline"}>
          {job.enabled ? "Enabled" : "Disabled"}
        </Badge>
      </TableCell>
      <TableCell>
        {job.lastRun ? (
          <Badge variant={statusVariants[job.lastRun.status] ?? "outline"}>
            {job.lastRun.status}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">--</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatTime(job.lastRun?.finishedAt ?? job.lastRun?.startedAt)}
      </TableCell>
    </TableRow>
  )
}
