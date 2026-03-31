import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { formatSchedule, formatTimeAgo, formatTokensCompact } from "@/lib/format"
import { classifyTokenConsumption, tokenLevelBadgeProps } from "@/lib/status"
import { useCronToggle } from "@/hooks/use-cron-actions"
import type { CronJob } from "@/types/cron"

interface CronJobRowProps {
  job: CronJob
  recentStatuses: string[]
  avgTokens?: number
  onClick: () => void
}

function dotColor(status: string) {
  if (status === "ok" || status === "success") return "bg-emerald-500"
  if (status === "error" || status === "failed" || status === "timeout") return "bg-red-500"
  return "bg-muted-foreground/40"
}

export function CronJobRow({ job, recentStatuses, avgTokens, onClick }: CronJobRowProps) {
  const [, tick] = useState(0)
  const { toggle } = useCronToggle()

  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggle(job.id, job.enabled)
  }

  return (
    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={onClick}>
      <TableCell className="font-medium">{job.name || job.id}</TableCell>
      <TableCell className="text-sm text-muted-foreground font-mono">
        {formatSchedule(job.schedule)}
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
        {job.state?.runningAtMs ? (
          <Badge variant="secondary" className="animate-pulse">
            running
          </Badge>
        ) : job.state?.lastRunStatus ? (
          <StatusBadge status={job.state.lastRunStatus} />
        ) : (
          <span className="text-sm text-muted-foreground">--</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatTimeAgo(job.state?.lastRunAtMs)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {recentStatuses.map((s, i) => (
            <span
              key={i}
              className={`rounded-full ${dotColor(s)} ${i === recentStatuses.length - 1 ? "h-2.5 w-2.5" : "h-2 w-2"}`}
            />
          ))}
        </div>
      </TableCell>
      <TableCell className="text-right">
        {avgTokens != null ? (() => {
          const level = classifyTokenConsumption(avgTokens)
          const props = tokenLevelBadgeProps[level]
          return (
            <span className="flex items-center justify-end gap-1.5 text-sm">
              <span className="text-muted-foreground">{formatTokensCompact(avgTokens)}</span>
              <Badge variant={props.variant} className={props.className}>{props.label}</Badge>
            </span>
          )
        })() : <span className="text-sm text-muted-foreground">--</span>}
      </TableCell>
    </TableRow>
  )
}
