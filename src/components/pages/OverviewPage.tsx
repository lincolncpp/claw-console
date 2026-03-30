import { SystemHealth } from "@/components/dashboard/SystemHealth"
import { useSystemStore } from "@/stores/system-store"
import { useCronStore } from "@/stores/cron-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUpCircle, Globe, Timer } from "lucide-react"

function formatAge(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

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
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-medium">{p.host}</span>
                <span className="text-muted-foreground text-xs">{p.ip}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {p.platform && <span>{p.platform}</span>}
                {p.mode && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {p.mode}
                  </Badge>
                )}
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
  const lastUpdated = useSystemStore((s) => s.lastUpdated)
  if (!Array.isArray(jobs)) return null
  const recentJobs = jobs
    .filter((j) => j.state?.lastRunAtMs)
    .sort((a, b) => (b.state?.lastRunAtMs ?? 0) - (a.state?.lastRunAtMs ?? 0))
    .slice(0, 5)

  if (recentJobs.length === 0) return null

  // Use lastUpdated as a stable reference time
  const referenceTime = lastUpdated ?? 0

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
          {recentJobs.map((job) => {
            const state = job.state!
            const time = state.lastRunAtMs ?? 0
            const status = state.lastRunStatus ?? "unknown"
            return (
              <div key={job.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      status === "ok"
                        ? "default"
                        : status === "running"
                          ? "secondary"
                          : "destructive"
                    }
                    className={`text-[10px] px-1.5 py-0 ${status === "ok" ? "bg-emerald-500/15 text-emerald-500 border-transparent" : ""}`}
                  >
                    {status}
                  </Badge>
                  <span className="truncate max-w-[200px]">{job.name || job.id}</span>
                </div>
                {time > 0 && referenceTime > time && (
                  <span className="text-xs text-muted-foreground">
                    {formatAge(referenceTime - time)}
                  </span>
                )}
              </div>
            )
          })}
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
