import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSessions } from "@/hooks/use-sessions"
import { useApprovals } from "@/hooks/use-approvals"
import { useLogs } from "@/hooks/use-logs"
import { useCronStore } from "@/stores/cron-store"
import { formatTokensCompact } from "@/lib/format"
import { MessageSquare, ShieldCheck, Timer, AlertTriangle, Info } from "lucide-react"

export function SystemHealth() {
  const { sessions } = useSessions()
  const { approvals } = useApprovals()
  const { lines } = useLogs()
  const jobs = useCronStore((s) => s.jobs)

  const totalSessions = sessions.length
  const totalTokens = sessions.reduce((sum, s) => sum + (s.totalTokens ?? 0), 0)
  const totalMessages = sessions.reduce((sum, s) => sum + (s.messageCount ?? 0), 0)

  const pendingApprovals = approvals.filter(
    (a) => (a as Record<string, unknown>).status === "pending",
  ).length

  const jobsWithErrors = jobs.filter((j) => (j.state?.consecutiveErrors ?? 0) > 0).length
  const enabledJobs = jobs.filter((j) => j.enabled).length

  const errorLines = lines.filter((l) => l.level === "error" || l.level === "warn")
  const recentErrors = errorLines.length

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            Active Sessions
            <Tooltip>
              <TooltipTrigger render={<Info className="h-3.5 w-3.5 text-muted-foreground" />} />
              <TooltipContent>Open agent sessions with total token and message counts</TooltipContent>
            </Tooltip>
          </CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalSessions}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatTokensCompact(totalTokens)} tokens &middot; {totalMessages.toLocaleString()} messages
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            Pending Approvals
            <Tooltip>
              <TooltipTrigger render={<Info className="h-3.5 w-3.5 text-muted-foreground" />} />
              <TooltipContent>Tool executions waiting for your approval</TooltipContent>
            </Tooltip>
          </CardTitle>
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {pendingApprovals > 0 && (
              <div className="h-2.5 w-2.5 rounded-full bg-status-warning animate-pulse" />
            )}
            <span className="text-2xl font-bold">{pendingApprovals}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {approvals.length} total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            Cron Health
            <Tooltip>
              <TooltipTrigger render={<Info className="h-3.5 w-3.5 text-muted-foreground" />} />
              <TooltipContent>Enabled vs total scheduled jobs and error status</TooltipContent>
            </Tooltip>
          </CardTitle>
          <Timer className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {jobsWithErrors > 0 && (
              <div className="h-2.5 w-2.5 rounded-full bg-status-error" />
            )}
            <span className="text-2xl font-bold">
              {enabledJobs}/{jobs.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {jobsWithErrors > 0
              ? `${jobsWithErrors} with errors`
              : "All healthy"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            Recent Errors
            <Tooltip>
              <TooltipTrigger render={<Info className="h-3.5 w-3.5 text-muted-foreground" />} />
              <TooltipContent>Errors and warnings from the gateway log stream</TooltipContent>
            </Tooltip>
          </CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {recentErrors > 0 && (
              <div className="h-2.5 w-2.5 rounded-full bg-status-error" />
            )}
            <span className="text-2xl font-bold">{recentErrors}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            errors &amp; warnings in log
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
