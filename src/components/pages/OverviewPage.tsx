import { SystemHealth } from "@/components/dashboard/SystemHealth"
import { RecentCronRuns } from "@/components/dashboard/RecentCronRuns"
import { TokenHistogram, useTokenTotal } from "@/components/dashboard/TokenSparkline"
import { useSystemStore } from "@/stores/system-store"
import { useCronStore } from "@/stores/cron-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTokensCompact } from "@/lib/format"
import { ArrowUpCircle } from "lucide-react"


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
