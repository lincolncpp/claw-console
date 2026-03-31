import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CronJobList } from "@/components/dashboard/CronJobList"
import { TokenHistogram, useTokenTotal } from "@/components/dashboard/TokenSparkline"
import { formatTokensCompact } from "@/lib/format"
import { useCronStore } from "@/stores/cron-store"

export function CronPage() {
  const runs = useCronStore((s) => s.runs)
  const hasRuns = Object.values(runs).some((r) => r.length > 0)
  const totalTokens = useTokenTotal()

  return (
    <div className="space-y-4">
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
      <CronJobList />
    </div>
  )
}
