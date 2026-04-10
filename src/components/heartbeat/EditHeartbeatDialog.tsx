import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { useSystemStore } from "@/stores/system-store"
import { useModels } from "@/hooks/use-agents"
import { useHeartbeatDefaults } from "@/hooks/use-heartbeat"
import type { HeartbeatConfig } from "@/types/heartbeat"

const selectClass =
  "h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"

interface EditHeartbeatDialogProps {
  open: boolean
  onClose: () => void
  config: HeartbeatConfig
  onSave: (patch: Partial<HeartbeatConfig>) => Promise<void>
}

export function EditHeartbeatDialog({
  open,
  onClose,
  config,
  onSave,
}: EditHeartbeatDialogProps) {
  const channels = useSystemStore((s) => s.channels)
  const { models } = useModels()
  const { defaults } = useHeartbeatDefaults()

  const dEvery = defaults.every ?? "30m"
  const dTarget = defaults.target ?? "none"
  const dAck = defaults.ackMaxChars ?? 300
  const dIsolated = defaults.isolatedSession ?? false
  const dLight = defaults.lightContext ?? false
  const dPolicy = defaults.directPolicy ?? "allow"
  const dReasoning = defaults.includeReasoning ?? false
  const dSuppressTools = defaults.suppressToolErrorWarnings ?? false

  const [every, setEvery] = useState(config.every ?? "")
  const [target, setTarget] = useState(config.target ?? "")
  const [to, setTo] = useState(config.to ?? "")
  const [model, setModel] = useState(config.model ?? "")
  const [session, setSession] = useState(config.session ?? "")
  const [ackMaxChars, setAckMaxChars] = useState(config.ackMaxChars != null ? String(config.ackMaxChars) : "")
  const [isolatedSession, setIsolatedSession] = useState(config.isolatedSession ?? dIsolated)
  const [lightContext, setLightContext] = useState(config.lightContext ?? dLight)
  const [directPolicy, setDirectPolicy] = useState(config.directPolicy ?? "")
  const [includeReasoning, setIncludeReasoning] = useState(config.includeReasoning ?? dReasoning)
  const [suppressToolErrors, setSuppressToolErrors] = useState(
    config.suppressToolErrorWarnings ?? dSuppressTools,
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setEvery(config.every ?? "")
    setTarget(config.target ?? "")
    setTo(config.to ?? "")
    setModel(config.model ?? "")
    setSession(config.session ?? "")
    setAckMaxChars(config.ackMaxChars != null ? String(config.ackMaxChars) : "")
    setIsolatedSession(config.isolatedSession ?? dIsolated)
    setLightContext(config.lightContext ?? dLight)
    setDirectPolicy(config.directPolicy ?? "")
    setIncludeReasoning(config.includeReasoning ?? dReasoning)
    setSuppressToolErrors(config.suppressToolErrorWarnings ?? dSuppressTools)
  }, [open, config, dIsolated, dLight, dReasoning, dSuppressTools])

  const handleSave = async () => {
    const parsedAck = ackMaxChars ? parseInt(ackMaxChars, 10) : NaN
    setSaving(true)
    try {
      const patch: Partial<HeartbeatConfig> = {}
      if (every !== (config.every ?? "")) patch.every = every || undefined
      if (target !== (config.target ?? "")) patch.target = target || undefined
      const trimmedTo = to.trim()
      if (trimmedTo !== (config.to ?? "")) patch.to = trimmedTo || undefined
      if (model !== (config.model ?? "")) patch.model = model || undefined
      if (session !== (config.session ?? "")) patch.session = session || undefined
      if (Number.isFinite(parsedAck) && parsedAck >= 0) {
        if (parsedAck !== config.ackMaxChars) patch.ackMaxChars = parsedAck
      } else if (config.ackMaxChars != null && !ackMaxChars) {
        patch.ackMaxChars = undefined
      }
      if (isolatedSession !== (config.isolatedSession ?? dIsolated)) patch.isolatedSession = isolatedSession
      if (lightContext !== (config.lightContext ?? dLight)) patch.lightContext = lightContext
      if (directPolicy !== (config.directPolicy ?? "")) patch.directPolicy = directPolicy || undefined
      if (includeReasoning !== (config.includeReasoning ?? dReasoning)) patch.includeReasoning = includeReasoning
      if (suppressToolErrors !== (config.suppressToolErrorWarnings ?? dSuppressTools)) patch.suppressToolErrorWarnings = suppressToolErrors
      await onSave(patch)
      onClose()
    } catch {
      // error toast handled by caller
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Heartbeat</DialogTitle>
          <DialogDescription>Update heartbeat configuration for this agent.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="text-xs text-muted-foreground">Interval</label>
            <Input
              placeholder={dEvery}
              value={every}
              onChange={(e) => setEvery((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Target</label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={selectClass}
            >
              <option value="">Default ({dTarget})</option>
              <option value="none">None</option>
              <option value="last">Last contact</option>
              {channels.map((ch) => (
                <option key={ch.key} value={ch.key}>
                  {ch.label}
                </option>
              ))}
            </select>
          </div>
          {target && target !== "none" && (
            <div>
              <label className="text-xs text-muted-foreground">To (recipient)</label>
              <Input
                placeholder="e.g. +15555550123 or chatId"
                value={to}
                onChange={(e) => setTo((e.target as HTMLInputElement).value)}
              />
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={selectClass}
            >
              <option value="">Default</option>
              {models.map((m) => (
                <option key={m.id} value={`${m.provider}/${m.id}`}>
                  {m.provider}/{m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Session</label>
            <Input
              placeholder={defaults.session ?? "main"}
              value={session}
              onChange={(e) => setSession((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground inline-flex items-center gap-1">
              Ack Max Chars
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  Replies under this length containing HEARTBEAT_OK are suppressed. Longer replies are delivered as alerts.
                </TooltipContent>
              </Tooltip>
            </label>
            <Input
              type="number"
              min="0"
              placeholder={String(dAck)}
              value={ackMaxChars}
              onChange={(e) => setAckMaxChars((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Direct Policy</label>
            <Input
              placeholder={dPolicy}
              value={directPolicy}
              onChange={(e) => setDirectPolicy((e.target as HTMLInputElement).value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Isolated Session</label>
            <Switch checked={isolatedSession} onCheckedChange={setIsolatedSession} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Light Context</label>
            <Switch checked={lightContext} onCheckedChange={setLightContext} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Include Reasoning</label>
            <Switch checked={includeReasoning} onCheckedChange={setIncludeReasoning} />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-muted-foreground">Suppress Tool Error Warnings</label>
            <Switch checked={suppressToolErrors} onCheckedChange={setSuppressToolErrors} />
          </div>
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
