import { SystemHealth } from "@/components/dashboard/SystemHealth"
import { RecentCronRuns } from "@/components/dashboard/RecentCronRuns"
import { TokenHistogram, useTokenTotal } from "@/components/dashboard/TokenSparkline"
import { useSystemStore } from "@/stores/system-store"
import { useCronStore } from "@/stores/cron-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTokensCompact } from "@/lib/format"
import { ArrowUpCircle, ExternalLink } from "lucide-react"


function UpdateBanner() {
  const update = useSystemStore((s) => s.updateAvailable)
  if (!update || update.currentVersion === update.latestVersion) return null

  const releaseUrl = `https://github.com/openclaw/openclaw/releases/tag/v${update.latestVersion.replace(/^v/, "")}`

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm space-y-1.5">
      <div className="flex items-center gap-3">
        <ArrowUpCircle className="h-4 w-4 text-primary shrink-0" />
        <span>
          Update available: <strong>{update.latestVersion}</strong>{" "}
          <span className="text-muted-foreground">(current: {update.currentVersion})</span>
        </span>
        <a
          href={releaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline ml-auto shrink-0"
        >
          Release notes <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="text-muted-foreground text-xs pl-7">
        Run <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-foreground">openclaw update</code> to update
      </div>
    </div>
  )
}


export function OverviewPage() {
  const runs = useCronStore((s) => s.runs)
  const hasRuns = Object.values(runs).some((r) => r.length > 0)
  const totalTokens = useTokenTotal()

  return (
    <div className="space-y-6">
      <UpdateBanner />
      <SystemHealth />
      {hasRuns && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Token Usage (7d)</CardTitle>
            <CardDescription>{formatTokensCompact(totalTokens)} total</CardDescription>
          </CardHeader>
          <CardContent>
            <TokenHistogram />
          </CardContent>
        </Card>
      )}
      <RecentCronRuns />
    </div>
  )
}
