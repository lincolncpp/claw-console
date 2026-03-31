import { CronJobList } from "@/components/dashboard/CronJobList"
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
      <CronJobList />
    </div>
  )
}
