import { useState } from "react"
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
import { useAgents, useModels } from "@/hooks/use-agents"
import { useCronCreate } from "@/hooks/use-cron-mutations"
import {
  buildCronCreateDelivery,
  buildCronCreatePayload,
  isValidWebhookUrl,
  type CronDeliveryMode,
} from "@/lib/cron-payload"
import { buildCronSessionTarget, type CronSessionTargetMode } from "@/lib/cron-session-target"
import type { CronSchedule } from "@/types/cron"

const selectClass =
  "h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"

interface NewCronJobDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const UNIT_MS: Record<string, number> = {
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
}

export function NewCronJobDialog({ open, onClose, onSaved }: NewCronJobDialogProps) {
  const [agentId, setAgentId] = useState("")
  const [name, setName] = useState("")
  const [scheduleType, setScheduleType] = useState<"every" | "cron">("every")
  const [everyValue, setEveryValue] = useState("10")
  const [everyUnit, setEveryUnit] = useState("m")
  const [cronExpr, setCronExpr] = useState("0 * * * *")
  const [timezone, setTimezone] = useState("")
  const [sessionTargetMode, setSessionTargetMode] =
    useState<Exclude<CronSessionTargetMode, "unsupported">>("isolated")
  const [sessionId, setSessionId] = useState("")
  const [model, setModel] = useState("")
  const [thinking, setThinking] = useState("")
  const [timeout, setTimeout] = useState("")
  const [deliveryMode, setDeliveryMode] = useState<CronDeliveryMode>("none")
  const [deliveryChannel, setDeliveryChannel] = useState("")
  const [deliveryTo, setDeliveryTo] = useState("")
  const [instructions, setInstructions] = useState("")
  const [nameError, setNameError] = useState("")
  const [sessionError, setSessionError] = useState("")
  const [instructionsError, setInstructionsError] = useState("")
  const [deliveryError, setDeliveryError] = useState("")
  const [scheduleError, setScheduleError] = useState("")

  const isMainTarget = sessionTargetMode === "main"

  const { agents } = useAgents()
  const { models } = useModels()
  const { create, saving } = useCronCreate()

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
    } else if (!cronExpr.trim()) {
      setScheduleError("Cron expression is required")
      return
    }
    setScheduleError("")
    if (sessionTargetMode === "session" && !sessionId.trim()) {
      setSessionError("Session ID is required")
      return
    }
    // The gateway only accepts the main session target for the default agent.
    const selectedAgent = agents.find((a) => a.id === agentId)
    if (sessionTargetMode === "main" && selectedAgent && !selectedAgent.isDefault) {
      setSessionError("Main session target is only valid for the default agent")
      return
    }
    setSessionError("")
    if (!instructions.trim()) {
      setInstructionsError("Instructions are required")
      return
    }
    setInstructionsError("")
    if (deliveryMode === "webhook" && !isValidWebhookUrl(deliveryTo)) {
      setDeliveryError("Webhook delivery requires a valid http(s) URL")
      return
    }
    setDeliveryError("")

    try {
      const sessionTarget = buildCronSessionTarget(sessionTargetMode, sessionId)
      const parsedTimeout = parseInt(timeout, 10)
      const job: Record<string, unknown> = {
        agentId: agentId || undefined,
        name: name.trim(),
        schedule: buildSchedule(),
        sessionTarget,
        enabled: true,
        payload: buildCronCreatePayload(sessionTarget, {
          instructions: instructions.trim(),
          model: model || undefined,
          thinking: thinking || undefined,
          timeoutSeconds: Number.isFinite(parsedTimeout) ? parsedTimeout : undefined,
        }),
        delivery: buildCronCreateDelivery(deliveryMode, deliveryChannel, deliveryTo),
      }
      await create(job)
      onSaved()
      handleClose()
    } catch {
      // error toast handled by hook
    }
  }

  const handleClose = () => {
    setAgentId("")
    setName("")
    setScheduleType("every")
    setEveryValue("10")
    setEveryUnit("m")
    setCronExpr("0 * * * *")
    setTimezone("")
    setSessionTargetMode("isolated")
    setSessionId("")
    setModel("")
    setThinking("")
    setTimeout("")
    setDeliveryMode("none")
    setDeliveryChannel("")
    setDeliveryTo("")
    setInstructions("")
    setNameError("")
    setSessionError("")
    setInstructionsError("")
    setDeliveryError("")
    setScheduleError("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Cron Job</DialogTitle>
          <DialogDescription>Schedule a recurring job for an agent.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Agent</label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className={selectClass}
              >
                <option value="">Select agent</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name ?? a.id}
                  </option>
                ))}
              </select>
            </div>
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
                placeholder="e.g. daily-report, health-check"
              />
              {nameError && <p className="text-xs text-destructive mt-1">{nameError}</p>}
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Schedule Type</label>
              <select
                value={scheduleType}
                onChange={(e) => setScheduleType(e.target.value as "every" | "cron")}
                className={selectClass}
              >
                <option value="every">Every (interval)</option>
                <option value="cron">Cron expression</option>
              </select>
            </div>
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
                  const nextMode = e.target.value as Exclude<CronSessionTargetMode, "unsupported">
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
                <option value="main">Main</option>
                <option value="session">Specific session</option>
              </select>
              {sessionTargetMode === "main" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Posts a system event into the default agent's main session.
                </p>
              )}
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
              {sessionError && <p className="text-xs text-destructive mt-1">{sessionError}</p>}
            </div>
            {!isMainTarget && (
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
          <div className="flex flex-col">
            <label className="text-xs text-muted-foreground">
              Instructions <span className="text-destructive">*</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => {
                setInstructions(e.target.value)
                if (instructionsError) setInstructionsError("")
              }}
              placeholder={
                isMainTarget
                  ? "System event text injected on each run"
                  : "What should the agent do on each run?"
              }
              className="flex-1 min-h-[200px] w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
            />
            {instructionsError && (
              <p className="text-xs text-destructive mt-1">{instructionsError}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
