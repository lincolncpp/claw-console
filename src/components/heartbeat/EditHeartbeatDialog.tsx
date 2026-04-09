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

  const [every, setEvery] = useState(config.every ?? "30m")
  const [target, setTarget] = useState(config.target ?? "none")
  const [to, setTo] = useState(config.to ?? "")
  const [model, setModel] = useState(config.model ?? "")
  const [session, setSession] = useState(config.session ?? "main")
  const [ackMaxChars, setAckMaxChars] = useState(String(config.ackMaxChars ?? 300))
  const [isolatedSession, setIsolatedSession] = useState(config.isolatedSession ?? false)
  const [lightContext, setLightContext] = useState(config.lightContext ?? false)
  const [directPolicy, setDirectPolicy] = useState(config.directPolicy ?? "allow")
  const [includeReasoning, setIncludeReasoning] = useState(config.includeReasoning ?? false)
  const [suppressToolErrors, setSuppressToolErrors] = useState(
    config.suppressToolErrorWarnings ?? false,
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setEvery(config.every ?? "30m")
    setTarget(config.target ?? "none")
    setTo(config.to ?? "")
    setModel(config.model ?? "")
    setSession(config.session ?? "main")
    setAckMaxChars(String(config.ackMaxChars ?? 300))
    setIsolatedSession(config.isolatedSession ?? false)
    setLightContext(config.lightContext ?? false)
    setDirectPolicy(config.directPolicy ?? "allow")
    setIncludeReasoning(config.includeReasoning ?? false)
    setSuppressToolErrors(config.suppressToolErrorWarnings ?? false)
  }, [open, config])

  const handleSave = async () => {
    const parsedAck = parseInt(ackMaxChars, 10)
    if (!Number.isFinite(parsedAck) || parsedAck < 0) return
    setSaving(true)
    try {
      const patch: Partial<HeartbeatConfig> = {}
      if (every !== (config.every ?? "30m")) patch.every = every
      if (target !== (config.target ?? "none")) patch.target = target
      const trimmedTo = to.trim()
      if (trimmedTo !== (config.to ?? "")) patch.to = trimmedTo || undefined
      if (model !== (config.model ?? "")) patch.model = model || undefined
      if (session !== (config.session ?? "main")) patch.session = session
      if (parsedAck !== (config.ackMaxChars ?? 300)) patch.ackMaxChars = parsedAck
      if (isolatedSession !== (config.isolatedSession ?? false)) patch.isolatedSession = isolatedSession
      if (lightContext !== (config.lightContext ?? false)) patch.lightContext = lightContext
      if (directPolicy !== (config.directPolicy ?? "allow")) patch.directPolicy = directPolicy
      if (includeReasoning !== (config.includeReasoning ?? false)) patch.includeReasoning = includeReasoning
      if (suppressToolErrors !== (config.suppressToolErrorWarnings ?? false)) patch.suppressToolErrorWarnings = suppressToolErrors
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
              placeholder="e.g. 30m, 1h, 0m to disable"
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
              <option value="">Use agent default</option>
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
              placeholder="main"
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
              value={ackMaxChars}
              onChange={(e) => setAckMaxChars((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Direct Policy</label>
            <Input
              placeholder="allow or block"
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
