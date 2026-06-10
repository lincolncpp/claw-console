import { useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/shared/StatCard"
import { Breadcrumb } from "@/components/shared/Breadcrumb"
import { PageLoading } from "@/components/shared/LoadingSpinner"
import { SessionKeyButton } from "@/components/shared/SessionKeyButton"
import { useCronStore } from "@/stores/cron-store"
import { useCronRuns } from "@/hooks/use-cron-runs"
import { classifyTokenConsumption, tokenLevelBadgeProps } from "@/lib/status"
import { formatDuration, formatTokens } from "@/lib/format"
import { agentIdFromSessionKey, cronRunParentSessionKey } from "@/lib/cron-session-target"
import { Clock, Coins, Cpu } from "lucide-react"

export function CronRunDetail() {
  const { jobId, runTs } = useParams<{ jobId: string; runTs: string }>()
  const jobs = useCronStore((s) => s.jobs)
  const { runs: jobRuns, isLoading } = useCronRuns(jobId)

  const job = jobs.find((j) => j.id === jobId)
  const run = jobRuns.find((r) => String(r.ts) === runTs)
  // Only the job's newest run is viewable: the cron session row rotates to
  // the latest run's transcript and older run sessions are unreachable.
  const isLatestRun =
    run != null && jobRuns.every((r) => r.runAtMs == null || r.runAtMs <= run.runAtMs)

  if (!jobId) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No job selected.</p>
  }

  if (isLoading) return <PageLoading />

  if (!run) {
    return (
      <div className="space-y-4">
        <Breadcrumb
          items={[
            { label: "Cron Jobs", to: "/cron" },
            { label: job?.name ?? jobId!, to: `/cron/${jobId}` },
            { label: "Run not found" },
          ]}
        />
        <p className="py-16 text-center text-sm text-muted-foreground">Run not found.</p>
      </div>
    )
  }

  const tokenLevel = classifyTokenConsumption(run.usage?.total_tokens)
  const badgeProps = tokenLevelBadgeProps[tokenLevel]

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Cron Jobs", to: "/cron" },
          { label: job?.name ?? jobId!, to: `/cron/${jobId}` },
          { label: `Run at ${new Date(run.runAtMs).toLocaleString()}` },
        ]}
      />

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard icon={Clock} label="Duration">
          <p className="text-sm font-medium">{formatDuration(run.durationMs)}</p>
        </StatCard>
        <StatCard icon={Cpu} label="Model">
          <p className="text-sm font-medium">
            {run.model ?? "--"}
            {run.provider && <span className="text-muted-foreground"> ({run.provider})</span>}
          </p>
        </StatCard>
        <StatCard icon={Coins} label="Total Tokens">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium font-mono">{formatTokens(run.usage?.total_tokens)}</p>
            <Badge variant={badgeProps.variant} className={badgeProps.className}>
              {badgeProps.label}
            </Badge>
          </div>
        </StatCard>
      </div>

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
                  {isLatestRun ? (
                    <SessionKeyButton
                      agentId={agentIdFromSessionKey(run.sessionKey)}
                      sessionKey={cronRunParentSessionKey(run.sessionKey)}
                    />
                  ) : (
                    <span
                      className="font-mono text-xs text-muted-foreground"
                      title="Transcript no longer available — the cron session now holds a newer run"
                    >
                      {run.sessionKey}
                    </span>
                  )}
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
