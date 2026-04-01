import { useState } from "react"
import { CronJobList } from "@/components/dashboard/CronJobList"
import { CronRunsByAgentChart } from "@/components/dashboard/CronRunsByAgentChart"
import { CronSettingsCard } from "@/components/dashboard/CronSettingsCard"
import { NewCronJobDialog } from "@/components/pages/NewCronJobDialog"
import { PageContent } from "@/components/shared/PageContent"
import { PageHeader } from "@/components/shared/PageHeader"
import { useCronStore } from "@/stores/cron-store"
import { gatewayWs } from "@/services/gateway-ws"

export function CronPage() {
  const jobCount = useCronStore((s) => s.jobs.length)
  const setJobs = useCronStore((s) => s.setJobs)
  const [newJobOpen, setNewJobOpen] = useState(false)

  const refetchJobs = () => {
    gatewayWs
      .cronList()
      .then(setJobs)
      .catch((err) => {
        console.warn("Failed to refetch cron jobs:", err)
      })
  }

  return (
    <PageContent>
      <PageHeader
        breadcrumbs={[{ label: "Cron Jobs" }]}
        subtitle={
          jobCount > 0 ? `${jobCount} job${jobCount !== 1 ? "s" : ""} across all agents` : undefined
        }
      />
      <div className="flex gap-4">
        <CronRunsByAgentChart />
        <CronSettingsCard />
      </div>
      <CronJobList onNewCronJob={() => setNewJobOpen(true)} />

      <NewCronJobDialog
        open={newJobOpen}
        onClose={() => setNewJobOpen(false)}
        onSaved={refetchJobs}
      />
    </PageContent>
  )
}
