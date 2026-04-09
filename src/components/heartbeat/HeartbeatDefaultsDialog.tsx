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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { useHeartbeatDefaults } from "@/hooks/use-heartbeat"
import { useModels } from "@/hooks/use-agents"
import type { HeartbeatConfig } from "@/types/heartbeat"

const selectClass =
  "h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"

interface HeartbeatDefaultsDialogProps {
  open: boolean
  onClose: () => void
  onSaved?: () => void
  currentDefaults?: HeartbeatConfig
}

export function HeartbeatDefaultsDialog({
  open,
  onClose,
  onSaved,
  currentDefaults,
}: HeartbeatDefaultsDialogProps) {
  const { updateDefaults } = useHeartbeatDefaults()
  const { models } = useModels()

  const d = currentDefaults ?? {}
  const [every, setEvery] = useState(d.every ?? "30m")
  const [target, setTarget] = useState(d.target ?? "none")
  const [model, setModel] = useState(d.model ?? "")
  const [session, setSession] = useState(d.session ?? "main")
  const [ackMaxChars, setAckMaxChars] = useState(String(d.ackMaxChars ?? 300))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const parsedAck = parseInt(ackMaxChars, 10)
    if (!Number.isFinite(parsedAck) || parsedAck < 0) return
    setSaving(true)
    try {
      const patch: Partial<HeartbeatConfig> = {
        every,
        target,
        session,
        ackMaxChars: parsedAck,
      }
      if (model) patch.model = model
      await updateDefaults(patch)
      onSaved?.()
      onClose()
    } catch {
      // error toast handled by updateDefaults
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Heartbeat Defaults</DialogTitle>
          <DialogDescription>
            Update default heartbeat settings for all agents.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
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
            <label className="text-xs text-muted-foreground">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={selectClass}
            >
              <option value="">Inherited</option>
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
