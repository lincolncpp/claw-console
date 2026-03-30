import { CronJobList } from "@/components/dashboard/CronJobList"
import { CronJobDetail } from "@/components/dashboard/CronJobDetail"

export function CronPage() {
  return (
    <>
      <CronJobList />
      <CronJobDetail />
    </>
  )
}
