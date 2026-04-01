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
  const [sessionTarget, setSessionTarget] = useState<"isolated" | "main">("isolated")
  const [model, setModel] = useState("")
  const [thinking, setThinking] = useState("")
  const [timeout, setTimeout] = useState("")
  const [deliveryMode, setDeliveryMode] = useState("none")
  const [deliveryChannel, setDeliveryChannel] = useState("")
  const [deliveryTo, setDeliveryTo] = useState("")
  const [instructions, setInstructions] = useState("")
  const [nameError, setNameError] = useState("")

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

    try {
      const job: Record<string, unknown> = {
        agentId: agentId || undefined,
        name: name.trim(),
        schedule: buildSchedule(),
        sessionTarget,
        enabled: true,
      }
      const payload: Record<string, unknown> = {}
      if (instructions.trim()) payload.message = instructions.trim()
      if (model) payload.model = model
      if (thinking) payload.thinking = thinking
      if (timeout) payload.timeoutSeconds = parseInt(timeout, 10)
      if (Object.keys(payload).length > 0) job.payload = payload
      const delivery: Record<string, string> = { mode: deliveryMode }
      if (deliveryMode !== "none" && deliveryChannel.trim())
        delivery.channel = deliveryChannel.trim()
      if (deliveryMode !== "none" && deliveryTo.trim()) delivery.to = deliveryTo.trim()
      job.delivery = delivery
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
    setSessionTarget("isolated")
    setModel("")
    setThinking("")
    setTimeout("")
    setDeliveryMode("none")
    setDeliveryChannel("")
    setDeliveryTo("")
    setInstructions("")
    setNameError("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Cron Job</DialogTitle>
          <DialogDescription>Schedule a recurring job for an agent.</DialogDescription>
        </DialogHeader>
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
                  onChange={(e) => setEveryValue((e.target as HTMLInputElement).value)}
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
                onChange={(e) => setCronExpr((e.target as HTMLInputElement).value)}
                placeholder="0 * * * *"
              />
            )}
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
              value={sessionTarget}
              onChange={(e) => setSessionTarget(e.target.value as "isolated" | "main")}
              className={selectClass}
            >
              <option value="isolated">Isolated</option>
              <option value="main">Main</option>
            </select>
          </div>
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
          <div>
            <label className="text-xs text-muted-foreground">Delivery Mode</label>
            <select
              value={deliveryMode}
              onChange={(e) => setDeliveryMode(e.target.value)}
              className={selectClass}
            >
              <option value="none">None</option>
              <option value="announce">Announce (channel)</option>
              <option value="webhook">Webhook</option>
              <option value="direct">Direct</option>
            </select>
          </div>
          {deliveryMode !== "none" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Channel</label>
                <Input
                  value={deliveryChannel}
                  onChange={(e) => setDeliveryChannel((e.target as HTMLInputElement).value)}
                  placeholder={deliveryMode === "webhook" ? "n/a" : "e.g. slack"}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">
                  {deliveryMode === "webhook" ? "URL" : "To"}
                </label>
                <Input
                  value={deliveryTo}
                  onChange={(e) => setDeliveryTo((e.target as HTMLInputElement).value)}
                  placeholder={deliveryMode === "webhook" ? "https://..." : "e.g. channel:C123"}
                />
              </div>
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Instructions</label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="What should the agent do on each run?"
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 resize-none"
            />
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
