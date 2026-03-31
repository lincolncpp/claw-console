import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CronJobList } from "@/components/dashboard/CronJobList"
import { TokenHistogram } from "@/components/dashboard/TokenSparkline"
import { useCronStore } from "@/stores/cron-store"

export function CronPage() {
  const runs = useCronStore((s) => s.runs)
  const hasRuns = Object.values(runs).some((r) => r.length > 0)

  return (
    <div className="space-y-4">
      {hasRuns && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Token Usage (30d)</CardTitle>
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
