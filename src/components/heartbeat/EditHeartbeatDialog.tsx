import { useState } from "react"
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
import type { HeartbeatConfig } from "@/types/heartbeat"

interface EditHeartbeatDialogProps {
  open: boolean
  onClose: () => void
  config: HeartbeatConfig
  heartbeatEnabled: boolean
  onSave: (patch: Partial<HeartbeatConfig>) => Promise<void>
}

export function EditHeartbeatDialog({
  open,
  onClose,
  config,
  heartbeatEnabled: _heartbeatEnabled,
  onSave,
}: EditHeartbeatDialogProps) {
  const [every, setEvery] = useState(config.every ?? "30m")
  const [target, setTarget] = useState(config.target ?? "none")
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

  const handleSave = async () => {
    setSaving(true)
    try {
      const patch: Partial<HeartbeatConfig> = {
        every,
        target,
        session,
        ackMaxChars: parseInt(ackMaxChars, 10),
        isolatedSession,
        lightContext,
        directPolicy,
        includeReasoning,
        suppressToolErrorWarnings: suppressToolErrors,
      }
      if (model) patch.model = model
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
            <Input
              placeholder="none, last, or channel name"
              value={target}
              onChange={(e) => setTarget((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Model (blank = agent default)</label>
            <Input
              placeholder="e.g. openai/gpt-5.4-mini"
              value={model}
              onChange={(e) => setModel((e.target as HTMLInputElement).value)}
            />
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
            <label className="text-xs text-muted-foreground">Ack Max Chars</label>
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
