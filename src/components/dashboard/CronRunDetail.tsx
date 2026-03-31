import { useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { StatCard } from "@/components/shared/StatCard"
import { Breadcrumb } from "@/components/shared/Breadcrumb"
import { LoadingBlock } from "@/components/shared/LoadingSpinner"
import { SessionKeyButton } from "@/components/shared/SessionKeyButton"
import { useCronStore } from "@/stores/cron-store"
import { useCronRuns } from "@/hooks/use-cron-runs"
import { classifyCost, costBadgeProps } from "@/lib/status"
import { formatTokens } from "@/lib/format"
import { Clock, Coins, Cpu } from "lucide-react"

export function CronRunDetail() {
  const { jobId, runTs } = useParams<{ jobId: string; runTs: string }>()
  const jobs = useCronStore((s) => s.jobs)
  const { runs: jobRuns, isLoading } = useCronRuns(jobId)

  const job = jobs.find((j) => j.id === jobId)
  const run = jobRuns.find((r) => String(r.ts) === runTs)

  if (!jobId) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No job selected.</p>
  }

  if (isLoading) {
    return <LoadingBlock />
  }

  if (!run) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[
          { label: "Cron Jobs", to: "/cron" },
          { label: job?.name ?? jobId!, to: `/cron/${jobId}` },
          { label: "Run not found" },
        ]} />
        <p className="py-16 text-center text-sm text-muted-foreground">Run not found.</p>
      </div>
    )
  }

  const cost = classifyCost(run, jobRuns)
  const badgeProps = costBadgeProps[cost]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Breadcrumb items={[
          { label: "Cron Jobs", to: "/cron" },
          { label: job?.name ?? jobId!, to: `/cron/${jobId}` },
          { label: `Run at ${new Date(run.runAtMs).toLocaleString()}` },
        ]} />
        <div className="flex items-center gap-2">
          <StatusBadge status={run.status} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Clock} label="Duration">
          <p className="text-sm font-medium">
            {run.durationMs != null ? `${(run.durationMs / 1000).toFixed(1)}s` : "--"}
          </p>
        </StatCard>
        <StatCard icon={Cpu} label="Model">
          <p className="text-sm font-medium">
            {run.model ?? "--"}
            {run.provider && <span className="text-muted-foreground"> ({run.provider})</span>}
          </p>
        </StatCard>
        <StatCard icon={Coins} label="Cost">
          <Badge variant={badgeProps.variant} className={badgeProps.className}>
            {cost}
          </Badge>
        </StatCard>
      </div>

      {/* Token Usage */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Token Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Input Tokens</p>
              <p className="text-sm font-medium font-mono">
                {formatTokens(run.usage?.input_tokens)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Output Tokens</p>
              <p className="text-sm font-medium font-mono">
                {formatTokens(run.usage?.output_tokens)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Tokens</p>
              <p className="text-sm font-medium font-mono">
                {formatTokens(run.usage?.total_tokens)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Run Details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Run Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            {run.action && (
              <div className="flex gap-4">
                <dt className="text-muted-foreground w-32 shrink-0">Action</dt>
                <dd>{run.action}</dd>
              </div>
            )}
            {run.summary && (
              <div className="flex gap-4">
                <dt className="text-muted-foreground w-32 shrink-0">Summary</dt>
                <dd className="whitespace-pre-wrap">{run.summary}</dd>
              </div>
            )}
            {run.sessionKey && (
              <div className="flex gap-4">
                <dt className="text-muted-foreground w-32 shrink-0">Session</dt>
                <dd>
                  <SessionKeyButton agentId={run.jobId} sessionKey={run.sessionKey} />
                </dd>
              </div>
            )}
            {run.sessionId && (
              <div className="flex gap-4">
                <dt className="text-muted-foreground w-32 shrink-0">Session ID</dt>
                <dd className="font-mono text-xs">{run.sessionId}</dd>
              </div>
            )}
            <div className="flex gap-4">
              <dt className="text-muted-foreground w-32 shrink-0">Delivered</dt>
              <dd>{run.deliveryStatus ?? (run.delivered ? "yes" : "--")}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="text-muted-foreground w-32 shrink-0">Run At</dt>
              <dd>{new Date(run.runAtMs).toLocaleString()}</dd>
            </div>
            {run.nextRunAtMs && (
              <div className="flex gap-4">
                <dt className="text-muted-foreground w-32 shrink-0">Next Run At</dt>
                <dd>{new Date(run.nextRunAtMs).toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}
