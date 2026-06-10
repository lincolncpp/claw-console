import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useModels } from "@/hooks/use-agents"
import { gatewayWs } from "@/services/gateway-ws"
import { useCronStore } from "@/stores/cron-store"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { formatRpcError } from "@/lib/errors"
import {
  buildCronPatchDelivery,
  buildCronPatchPayload,
  isValidWebhookUrl,
  normalizeDeliveryMode,
  type CronDeliveryMode,
} from "@/lib/cron-payload"
import {
  buildCronSessionTarget,
  parseCronSessionTarget,
  type CronSessionTargetMode,
} from "@/lib/cron-session-target"
import { formatSchedule } from "@/lib/format"
import type { CronJob, CronSchedule } from "@/types/cron"

const selectClass =
  "h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"

const UNIT_MS: Record<string, number> = {
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
}

function parseEveryMs(ms: number): { value: string; unit: string } {
  if (ms >= 86_400_000 && ms % 86_400_000 === 0)
    return { value: String(ms / 86_400_000), unit: "d" }
  if (ms >= 3_600_000 && ms % 3_600_000 === 0) return { value: String(ms / 3_600_000), unit: "h" }
  return { value: String(ms / 60_000), unit: "m" }
}

interface EditCronJobDialogProps {
  open: boolean
  onClose: () => void
  job: CronJob
}

export function EditCronJobDialog({ open, onClose, job }: EditCronJobDialogProps) {
  const [name, setName] = useState("")
  // "at" is shown read-only; the dialog has no one-shot editor, so the
  // existing schedule is preserved on save instead of being rebuilt.
  const [scheduleType, setScheduleType] = useState<"every" | "cron" | "at">("every")
  const [everyValue, setEveryValue] = useState("10")
  const [everyUnit, setEveryUnit] = useState("m")
  const [cronExpr, setCronExpr] = useState("0 * * * *")
  const [timezone, setTimezone] = useState("")
  const [sessionTargetMode, setSessionTargetMode] = useState<CronSessionTargetMode>("isolated")
  const [sessionId, setSessionId] = useState("")
  const [unsupportedSessionTarget, setUnsupportedSessionTarget] = useState("")
  const [model, setModel] = useState("")
  const [thinking, setThinking] = useState("")
  const [timeout, setTimeout] = useState("")
  const [deliveryMode, setDeliveryMode] = useState<CronDeliveryMode>("none")
  const [deliveryChannel, setDeliveryChannel] = useState("")
  const [deliveryTo, setDeliveryTo] = useState("")
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState("")
  const [sessionError, setSessionError] = useState("")
  const [deliveryError, setDeliveryError] = useState("")
  const [scheduleError, setScheduleError] = useState("")

  const isMainTarget = sessionTargetMode === "main"
  // Model/thinking/timeout only apply to agentTurn payloads; command jobs keep
  // their payload untouched and main-session jobs use systemEvent payloads.
  const isCommandJob = job.payload?.kind === "command"

  const { models } = useModels()
  const updateJob = useCronStore((s) => s.updateJob)
  const addToast = useErrorToastStore((s) => s.addToast)

  useEffect(() => {
    if (!open) return
    const parsedSessionTarget = parseCronSessionTarget(job.sessionTarget)
    setName(job.name)
    setSessionTargetMode(parsedSessionTarget.mode)
    setSessionId(parsedSessionTarget.sessionId)
    setUnsupportedSessionTarget(
      parsedSessionTarget.mode === "unsupported" ? parsedSessionTarget.raw : "",
    )
    setModel(job.payload?.model ?? "")
    setThinking(job.payload?.thinking ?? "")
    setTimeout(job.payload?.timeoutSeconds != null ? String(job.payload.timeoutSeconds) : "")
    setDeliveryMode(normalizeDeliveryMode(job.delivery?.mode))
    setDeliveryChannel(job.delivery?.channel ?? "")
    setDeliveryTo(job.delivery?.to ?? "")
    setNameError("")
    setSessionError("")
    setDeliveryError("")
    setScheduleError("")

    if (job.schedule.kind === "every") {
      setScheduleType("every")
      const parsed = parseEveryMs(job.schedule.everyMs)
      setEveryValue(parsed.value)
      setEveryUnit(parsed.unit)
      setCronExpr("0 * * * *")
      setTimezone("")
    } else if (job.schedule.kind === "cron") {
      setScheduleType("cron")
      setCronExpr(job.schedule.expr)
      setTimezone(job.schedule.tz ?? "")
      setEveryValue("10")
      setEveryUnit("m")
    } else {
      setScheduleType("at")
      setCronExpr("0 * * * *")
      setTimezone("")
      setEveryValue("10")
      setEveryUnit("m")
    }
  }, [open, job])

  const buildSchedule = (): CronSchedule => {
    if (scheduleType === "every") {
      return { kind: "every", everyMs: Number(everyValue) * UNIT_MS[everyUnit] }
    }
    const schedule: CronSchedule = { kind: "cron", expr: cronExpr.trim() }
    if (timezone.trim()) (schedule as { tz?: string }).tz = timezone.trim()
    return schedule
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError("Name is required")
      return
    }
    setNameError("")
    if (scheduleType === "every") {
      const interval = Number(everyValue)
      if (!Number.isInteger(interval) || interval < 1) {
        setScheduleError("Interval must be a whole number of at least 1")
        return
      }
    } else if (scheduleType === "cron" && !cronExpr.trim()) {
      setScheduleError("Cron expression is required")
      return
    }
    setScheduleError("")
    const nextSessionTarget =
      sessionTargetMode === "unsupported"
        ? unsupportedSessionTarget
        : buildCronSessionTarget(sessionTargetMode, sessionId)
    if (sessionTargetMode === "session" && !sessionId.trim()) {
      setSessionError("Session ID is required")
      return
    }
    setSessionError("")
    if (deliveryMode === "webhook" && !isValidWebhookUrl(deliveryTo)) {
      setDeliveryError("Webhook delivery requires a valid http(s) URL")
      return
    }
    setDeliveryError("")
    setSaving(true)

    const parsedTimeout = parseInt(timeout, 10)
    const patch: Partial<CronJob> = {
      name: name.trim(),
      sessionTarget: nextSessionTarget,
      delivery: buildCronPatchDelivery(deliveryMode, deliveryChannel, deliveryTo),
    }
    // One-shot ("at") schedules have no editor here; omitting schedule from
    // the patch preserves them instead of rewriting to an interval.
    if (scheduleType !== "at") {
      patch.schedule = buildSchedule()
    }
    if (!isCommandJob) {
      patch.payload = buildCronPatchPayload(nextSessionTarget, job.payload, {
        model: model || undefined,
        thinking: thinking || undefined,
        timeoutSeconds: Number.isFinite(parsedTimeout) ? parsedTimeout : undefined,
      })
    }

    try {
      // The response carries the fully merged job; the local patch is sparse
      // (payload/delivery patches use null clears) and would clobber fields
      // under the store's shallow merge.
      const updated = await gatewayWs.cronUpdate(job.id, patch)
      updateJob(job.id, updated)
      onClose()
    } catch (err) {
      addToast(`Failed to update cron job: ${formatRpcError(err)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Cron Job</DialogTitle>
          <DialogDescription>Update settings for {job.name || job.id}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => {
                setName((e.target as HTMLInputElement).value)
                if (nameError) setNameError("")
              }}
            />
            {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Schedule Type</label>
            <select
              value={scheduleType}
              onChange={(e) => {
                setScheduleType(e.target.value as "every" | "cron" | "at")
                setScheduleError("")
              }}
              className={selectClass}
            >
              <option value="every">Every (interval)</option>
              <option value="cron">Cron expression</option>
              {job.schedule.kind === "at" && <option value="at">One-shot (keep as is)</option>}
            </select>
          </div>
          {scheduleType === "at" ? (
            <p className="text-xs text-muted-foreground font-mono">
              Preserving existing schedule: {formatSchedule(job.schedule)}
            </p>
          ) : (
            <div>
              <label className="text-xs text-muted-foreground">
                {scheduleType === "every" ? "Interval" : "Cron Expression"}
              </label>
              {scheduleType === "every" ? (
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={everyValue}
                    onChange={(e) => {
                      setEveryValue((e.target as HTMLInputElement).value)
                      if (scheduleError) setScheduleError("")
                    }}
                  />
                  <select
                    value={everyUnit}
                    onChange={(e) => setEveryUnit(e.target.value)}
                    className={selectClass}
                  >
                    <option value="m">minutes</option>
                    <option value="h">hours</option>
                    <option value="d">days</option>
                  </select>
                </div>
              ) : (
                <Input
                  value={cronExpr}
                  onChange={(e) => {
                    setCronExpr((e.target as HTMLInputElement).value)
                    if (scheduleError) setScheduleError("")
                  }}
                  placeholder="0 * * * *"
                />
              )}
              {scheduleError && <p className="text-xs text-destructive mt-1">{scheduleError}</p>}
            </div>
          )}
          {scheduleType === "cron" && (
            <div>
              <label className="text-xs text-muted-foreground">Timezone</label>
              <Input
                value={timezone}
                onChange={(e) => setTimezone((e.target as HTMLInputElement).value)}
                placeholder="e.g. America/New_York"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Session Target</label>
            <select
              value={sessionTargetMode}
              onChange={(e) => {
                const nextMode = e.target.value as CronSessionTargetMode
                setSessionTargetMode(nextMode)
                setSessionError("")
                // Main-session jobs cannot announce to channels; only
                // webhook or no delivery is accepted by the gateway.
                if (nextMode === "main" && deliveryMode === "announce") {
                  setDeliveryMode("none")
                }
              }}
              className={selectClass}
            >
              <option value="isolated">Isolated</option>
              {/* Main requires a systemEvent payload, which command jobs can never have. */}
              {!isCommandJob && <option value="main">Main</option>}
              <option value="session">Specific session</option>
              {sessionTargetMode === "unsupported" && (
                <option value="unsupported">Unsupported (preserve existing)</option>
              )}
            </select>
            {sessionTargetMode === "session" && (
              <div className="mt-2 space-y-1">
                <Input
                  value={sessionId}
                  onChange={(e) => {
                    setSessionId((e.target as HTMLInputElement).value)
                    if (sessionError) setSessionError("")
                  }}
                  placeholder="daily-brief"
                />
                <p className="text-xs text-muted-foreground">
                  Saved as <span className="font-mono">session:{sessionId || "..."}</span>
                </p>
              </div>
            )}
            {sessionTargetMode === "unsupported" && (
              <p className="mt-2 text-xs text-muted-foreground font-mono break-all">
                Preserving existing target: {unsupportedSessionTarget}
              </p>
            )}
            {sessionError && <p className="text-xs text-destructive mt-1">{sessionError}</p>}
          </div>
          {!isMainTarget && !isCommandJob && (
            <>
              <div>
                <label className="text-xs text-muted-foreground">Model</label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Use agent default</option>
                  {models.map((m) => (
                    <option key={m.id} value={`${m.provider}/${m.id}`}>
                      {m.provider}/{m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Thinking</label>
                <select
                  value={thinking}
                  onChange={(e) => setThinking(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Use default</option>
                  <option value="off">off</option>
                  <option value="minimal">minimal</option>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="xhigh">xhigh</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Timeout (seconds)</label>
                <Input
                  type="number"
                  min="1"
                  value={timeout}
                  onChange={(e) => setTimeout((e.target as HTMLInputElement).value)}
                  placeholder="e.g. 120"
                />
              </div>
            </>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Delivery Mode</label>
            <select
              value={deliveryMode}
              onChange={(e) => {
                setDeliveryMode(e.target.value as CronDeliveryMode)
                setDeliveryError("")
              }}
              className={selectClass}
            >
              <option value="none">None</option>
              {!isMainTarget && <option value="announce">Announce (channel)</option>}
              <option value="webhook">Webhook</option>
            </select>
          </div>
          {deliveryMode === "announce" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Channel</label>
                <Input
                  value={deliveryChannel}
                  onChange={(e) => setDeliveryChannel((e.target as HTMLInputElement).value)}
                  placeholder="e.g. slack"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">To</label>
                <Input
                  value={deliveryTo}
                  onChange={(e) => setDeliveryTo((e.target as HTMLInputElement).value)}
                  placeholder="e.g. channel:C123"
                />
              </div>
            </div>
          )}
          {deliveryMode === "webhook" && (
            <div>
              <label className="text-xs text-muted-foreground">URL</label>
              <Input
                value={deliveryTo}
                onChange={(e) => {
                  setDeliveryTo((e.target as HTMLInputElement).value)
                  if (deliveryError) setDeliveryError("")
                }}
                placeholder="https://..."
              />
            </div>
          )}
          {deliveryError && <p className="text-xs text-destructive mt-1">{deliveryError}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
