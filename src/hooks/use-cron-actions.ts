import { useState } from "react"
import { useCronStore } from "@/stores/cron-store"
import { gatewayWs } from "@/services/gateway-ws"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { formatRpcError } from "@/lib/errors"

export function useCronToggle() {
  const updateJob = useCronStore((s) => s.updateJob)
  const addToast = useErrorToastStore((s) => s.addToast)

  const toggle = (jobId: string, currentEnabled: boolean) => {
    const newEnabled = !currentEnabled
    updateJob(jobId, { enabled: newEnabled })
    gatewayWs.cronUpdate(jobId, { enabled: newEnabled }).catch((err) => {
      updateJob(jobId, { enabled: currentEnabled })
      addToast(`Failed to toggle cron job: ${formatRpcError(err)}`)
    })
  }

  return { toggle }
}

export function useCronRunNow() {
  const [running, setRunning] = useState(false)
  const addToast = useErrorToastStore((s) => s.addToast)

  const runNow = async (jobId: string) => {
    setRunning(true)
    try {
      await gatewayWs.cronRun(jobId)
    } catch (err) {
      addToast(`Failed to trigger cron run: ${formatRpcError(err)}`)
    } finally {
      setRunning(false)
    }
  }

  return { runNow, running }
}

export function useCronUpdateInstructions() {
  const [saving, setSaving] = useState(false)
  const updateJob = useCronStore((s) => s.updateJob)
  const addToast = useErrorToastStore((s) => s.addToast)

  const update = async (
    jobId: string,
    currentPayload: Record<string, unknown>,
    message: string,
  ) => {
    setSaving(true)
    const newPayload = { ...currentPayload, message }
    updateJob(jobId, { payload: newPayload })
    try {
      await gatewayWs.cronUpdate(jobId, { payload: newPayload })
    } catch (err) {
      updateJob(jobId, { payload: currentPayload })
      addToast(`Failed to update instructions: ${formatRpcError(err)}`)
    } finally {
      setSaving(false)
    }
  }

  return { update, saving }
}
