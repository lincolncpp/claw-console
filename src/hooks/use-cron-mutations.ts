import { useState } from "react"
import { useCronStore } from "@/stores/cron-store"
import { gatewayWs } from "@/services/gateway-ws"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { formatRpcError } from "@/lib/errors"
import type { CronJob } from "@/types/cron"

export function useCronCreate() {
  const [saving, setSaving] = useState(false)
  const setJobs = useCronStore((s) => s.setJobs)
  const addToast = useErrorToastStore((s) => s.addToast)

  const create = async (job: Partial<CronJob>) => {
    setSaving(true)
    try {
      await gatewayWs.cronAdd(job)
      const jobs = await gatewayWs.cronList()
      setJobs(jobs)
    } catch (err) {
      addToast(`Failed to create cron job: ${formatRpcError(err)}`)
      throw err
    } finally {
      setSaving(false)
    }
  }

  return { create, saving }
}

export function useCronDelete() {
  const [deleting, setDeleting] = useState(false)
  const removeJob = useCronStore((s) => s.removeJob)
  const addToast = useErrorToastStore((s) => s.addToast)

  const remove = async (jobId: string) => {
    setDeleting(true)
    try {
      await gatewayWs.cronRemove(jobId)
      removeJob(jobId)
    } catch (err) {
      addToast(`Failed to delete cron job: ${formatRpcError(err)}`)
      throw err
    } finally {
      setDeleting(false)
    }
  }

  return { remove, deleting }
}
