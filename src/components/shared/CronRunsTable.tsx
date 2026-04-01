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
import type { CronRun } from "@/types/cron"

interface CronRunsTableProps {
  runs: CronRun[]
  jobNameMap: Record<string, string>
  onRowClick?: (run: CronRun) => void
}

export function CronRunsTable({ runs, jobNameMap, onRowClick }: CronRunsTableProps) {
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
                <SessionKeyButton agentId={run.jobId} sessionKey={run.sessionKey} />
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
