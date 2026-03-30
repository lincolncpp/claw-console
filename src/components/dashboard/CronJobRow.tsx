import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import type { CronJob } from "@/types/cron"
import { gatewayWs } from "@/services/gateway-ws"
import { useCronStore } from "@/stores/cron-store"

function formatSchedule(job: CronJob): string {
  const { schedule } = job
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

function formatTimeAgo(epochMs?: number): string {
  if (!epochMs) return "--"
  const s = Math.floor((Date.now() - epochMs) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ok: "default",
  success: "default",
  running: "secondary",
  error: "destructive",
  failed: "destructive",
  timeout: "destructive",
}

interface CronJobRowProps {
  job: CronJob
  onClick: () => void
}

export function CronJobRow({ job, onClick }: CronJobRowProps) {
  const [, tick] = useState(0)
  const updateJob = useCronStore((s) => s.updateJob)

  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newEnabled = !job.enabled
    updateJob(job.id, { enabled: newEnabled })
    gatewayWs.cronUpdate(job.id, { enabled: newEnabled }).catch(() => {
      updateJob(job.id, { enabled: !newEnabled })
    })
  }

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onClick}>
      <TableCell className="font-medium">{job.name || job.id}</TableCell>
      <TableCell className="text-sm text-muted-foreground font-mono">
        {formatSchedule(job)}
      </TableCell>
      <TableCell>{job.sessionTarget}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2" onClick={handleToggle}>
          <Switch checked={job.enabled} className="pointer-events-none" />
          <span className="text-xs text-muted-foreground">
            {job.enabled ? "Enabled" : "Disabled"}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {job.state?.lastRunStatus ? (
          <Badge
            variant={statusVariants[job.state.lastRunStatus] ?? "outline"}
            className={job.state.lastRunStatus === "ok" ? "bg-emerald-500/15 text-emerald-500 border-transparent" : undefined}
          >
            {job.state.lastRunStatus}
          </Badge>
        ) : (
          <span className="text-sm text-muted-foreground">--</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatTimeAgo(job.state?.lastRunAtMs)}
      </TableCell>
    </TableRow>
  )
}
