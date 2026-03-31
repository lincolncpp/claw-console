import { CronJobList } from "@/components/dashboard/CronJobList"
import { CronRunsByAgentChart } from "@/components/dashboard/CronRunsByAgentChart"
import { CronSettingsCard } from "@/components/dashboard/CronSettingsCard"
import { PageHeader } from "@/components/shared/PageHeader"
import { useCronStore } from "@/stores/cron-store"

export function CronPage() {
  const jobCount = useCronStore((s) => s.jobs.length)

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[{ label: "Cron Jobs" }]}
        subtitle={jobCount > 0 ? `${jobCount} job${jobCount !== 1 ? "s" : ""} across all agents` : undefined}
      />
      <div className="flex gap-4">
        <CronRunsByAgentChart />
        <CronSettingsCard />
      </div>
      <CronJobList />
    </div>
  )
}
