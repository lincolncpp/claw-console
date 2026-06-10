import { useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { SessionKeyButton } from "@/components/shared/SessionKeyButton"
import { TokenBadge } from "@/components/shared/TokenBadge"
import { formatTimeAgo, formatDuration } from "@/lib/format"
import { agentIdFromSessionKey, cronRunParentSessionKey } from "@/lib/cron-session-target"
import type { CronRun } from "@/types/cron"

interface CronRunsTableProps {
  runs: CronRun[]
  jobNameMap: Record<string, string>
  onRowClick?: (run: CronRun) => void
}

export function CronRunsTable({ runs, jobNameMap, onRowClick }: CronRunsTableProps) {
  // The cron session row holds only the latest run's transcript (the gateway
  // rotates it each run), so only each job's newest run gets a session link.
  const latestRunTsByJob = useMemo(() => {
    const latest: Record<string, number> = {}
    for (const r of runs) {
      if (latest[r.jobId] == null || r.runAtMs > latest[r.jobId]) latest[r.jobId] = r.runAtMs
    }
    return latest
  }, [runs])

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Job</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Total Tokens</TableHead>
          <TableHead>Session</TableHead>
          <TableHead>Delivered</TableHead>
          <TableHead>Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run, i) => (
          <TableRow
            key={`${run.ts}-${i}`}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onRowClick?.(run)}
          >
            <TableCell className="text-sm font-medium">
              {jobNameMap[run.jobId] ?? run.jobId}
            </TableCell>
            <TableCell className="text-sm">{formatDuration(run.durationMs)}</TableCell>
            <TableCell>
              <StatusBadge status={run.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">{run.model ?? "--"}</TableCell>
            <TableCell>
              <TokenBadge tokens={run.usage?.total_tokens} />
            </TableCell>
            <TableCell>
              {run.sessionKey ? (
                run.runAtMs === latestRunTsByJob[run.jobId] ? (
                  <SessionKeyButton
                    agentId={agentIdFromSessionKey(run.sessionKey)}
                    sessionKey={cronRunParentSessionKey(run.sessionKey)}
                  />
                ) : (
                  <span
                    className="font-mono text-xs text-muted-foreground/50 truncate block max-w-[400px]"
                    title="Transcript no longer available — the cron session now holds a newer run"
                  >
                    {run.sessionKey}
                  </span>
                )
              ) : (
                <span className="text-sm text-muted-foreground">--</span>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {run.deliveryStatus ?? (run.delivered ? "yes" : "--")}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatTimeAgo(run.runAtMs)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
