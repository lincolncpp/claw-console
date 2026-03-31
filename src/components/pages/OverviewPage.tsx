import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { SystemHealth } from "@/components/dashboard/SystemHealth"
import { useSystemStore } from "@/stores/system-store"
import { useCronStore } from "@/stores/cron-store"
import { gatewayWs } from "@/services/gateway-ws"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { formatTimeAgo } from "@/lib/format"
import { ArrowUpCircle, Globe, Timer } from "lucide-react"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { formatRpcError } from "@/lib/errors"
import type { CronRun } from "@/types/cron"

function PresenceCards() {
  const presence = useSystemStore((s) => s.presence)
  const unique = new Map<string, (typeof presence)[0]>()
  for (const p of presence) {
    const key = `${p.host}:${p.ip}`
    if (!unique.has(key) || p.reason !== "disconnect") {
      unique.set(key, p)
    }
  }
  const entries = [...unique.values()].filter((p) => p.reason !== "disconnect")

  if (entries.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          Connected Nodes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {entries.map((p, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-status-success" />
                <span className="font-medium">{p.host}</span>
                <span className="text-muted-foreground text-xs">{p.ip}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {p.platform && <span>{p.platform}</span>}
                {p.mode && <StatusBadge status={p.mode} className="text-[0.625rem] px-1.5 py-0" />}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function UpdateBanner() {
  const update = useSystemStore((s) => s.updateAvailable)
  if (!update || update.currentVersion === update.latestVersion) return null

  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
      <ArrowUpCircle className="h-4 w-4 text-primary shrink-0" />
      <span>
        Update available: <strong>{update.latestVersion}</strong>{" "}
        <span className="text-muted-foreground">(current: {update.currentVersion})</span>
      </span>
    </div>
  )
}

function RecentCronActivity() {
  const jobs = useCronStore((s) => s.jobs)
  const navigate = useNavigate()
  const addToast = useErrorToastStore((s) => s.addToast)
  const [recentRuns, setRecentRuns] = useState<CronRun[]>([])

  const activeJobIds = useMemo(() => {
    if (!Array.isArray(jobs)) return []
    return jobs
      .filter((j) => j.state?.lastRunAtMs)
      .sort((a, b) => (b.state?.lastRunAtMs ?? 0) - (a.state?.lastRunAtMs ?? 0))
      .slice(0, 5)
      .map((j) => j.id)
  }, [jobs])

  const jobNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const j of jobs) map.set(j.id, j.name || j.id)
    return map
  }, [jobs])

  useEffect(() => {
    if (activeJobIds.length === 0) return
    let cancelled = false
    Promise.all(
      activeJobIds.map((id) =>
        gatewayWs.cronRuns(id, 5).catch((err) => {
          addToast(formatRpcError(err), "warning")
          return [] as CronRun[]
        }),
      ),
    ).then((results) => {
      if (cancelled) return
      const merged = results
        .flat()
        .sort((a, b) => b.runAtMs - a.runAtMs)
        .slice(0, 8)
      setRecentRuns(merged)
    })
    return () => {
      cancelled = true
    }
  }, [activeJobIds, addToast])

  const recentRunsList = activeJobIds.length === 0 ? [] : recentRuns

  if (recentRunsList.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          Recent Cron Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {recentRunsList.map((run, i) => (
            <div
              key={`${run.jobId}-${run.ts}-${i}`}
              className="flex items-center justify-between text-sm cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 py-0.5"
              onClick={() => navigate(`/cron/${run.jobId}`)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <StatusBadge status={run.status} className="text-[0.625rem] px-1.5 py-0 shrink-0" />
                <span className="truncate max-w-[200px]">
                  {jobNames.get(run.jobId) ?? run.jobId}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                {run.durationMs != null && <span>{(run.durationMs / 1000).toFixed(1)}s</span>}
                <span>{formatTimeAgo(run.runAtMs)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function OverviewPage() {
  return (
    <div className="space-y-6">
      <UpdateBanner />
      <SystemHealth />
      <div className="grid gap-4 md:grid-cols-2">
        <PresenceCards />
        <RecentCronActivity />
      </div>
    </div>
  )
}
