import { useNavigate } from "react-router-dom"
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
import { StatusBadge } from "@/components/shared/StatusBadge"
import { SessionKeyButton } from "@/components/shared/SessionKeyButton"
import { formatTimeAgo, formatTokensCompact } from "@/lib/format"
import { classifyTokenConsumption, tokenLevelBadgeProps } from "@/lib/status"
import { History } from "lucide-react"
import type { CronRun } from "@/types/cron"

interface CronRunHistoryProps {
  jobId: string
  runs: CronRun[]
}

export function CronRunHistory({ jobId, runs }: CronRunHistoryProps) {
  const navigate = useNavigate()

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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Duration</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Model</TableHead>
          <TableHead>Total Tokens</TableHead>
          <TableHead>Session</TableHead>
          <TableHead>Delivered</TableHead>
          <TableHead>Last Run Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runs.map((run, i) => (
          <TableRow
            key={`${run.ts}-${i}`}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => navigate(`/cron/${jobId}/runs/${run.ts}`)}
          >
            <TableCell className="text-sm">
              {run.durationMs != null
                ? run.durationMs >= 60_000
                  ? `${Math.floor(run.durationMs / 60_000)}min ${Math.round((run.durationMs % 60_000) / 1000)}s`
                  : `${Math.round(run.durationMs / 1000)}s`
                : "--"}
            </TableCell>
            <TableCell>
              <StatusBadge status={run.status} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {run.model ?? "--"}
            </TableCell>
            <TableCell>
              {run.usage?.total_tokens != null ? (
                <span className="flex items-center gap-1.5 text-sm">
                  <span className="text-muted-foreground">{formatTokensCompact(run.usage.total_tokens)}</span>
                  {(() => {
                    const level = classifyTokenConsumption(run.usage.total_tokens)
                    const props = tokenLevelBadgeProps[level]
                    return (
                      <Badge variant={props.variant} className={props.className}>
                        {props.label}
                      </Badge>
                    )
                  })()}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">--</span>
              )}
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
        )}
      </CardContent>
    </Card>
  )
}
