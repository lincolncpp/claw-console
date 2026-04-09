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
import { useSystemStore } from "@/stores/system-store"
import { useModels } from "@/hooks/use-agents"
import { useConfig } from "@/hooks/use-config"
import { gatewayWs } from "@/services/gateway-ws"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { formatRpcError } from "@/lib/errors"
import type { HeartbeatConfig } from "@/types/heartbeat"

const selectClass =
  "h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"

interface NewHeartbeatDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function NewHeartbeatDialog({ open, onClose, onSaved }: NewHeartbeatDialogProps) {
  const [agentId, setAgentId] = useState("")
  const [every, setEvery] = useState("")
  const [target, setTarget] = useState("")
  const [to, setTo] = useState("")
  const [model, setModel] = useState("")
  const [session, setSession] = useState("")
  const [ackMaxChars, setAckMaxChars] = useState("")
  const [agentError, setAgentError] = useState("")
  const [saving, setSaving] = useState(false)

  const agents = useSystemStore((s) => s.agents)
  const channels = useSystemStore((s) => s.channels)
  const { models } = useModels()
  const { configHash } = useConfig()
  const addToast = useErrorToastStore((s) => s.addToast)

  const availableAgents = agents.filter((a) => !a.heartbeat?.enabled)

  const handleSave = async () => {
    if (!agentId) {
      setAgentError("Select an agent")
      return
    }
    setAgentError("")
    setSaving(true)
    try {
      const parsedAck = parseInt(ackMaxChars, 10)
      const patch: Partial<HeartbeatConfig> = {}
      if (every.trim()) patch.every = every.trim()
      if (target && target !== "none") patch.target = target
      if (to.trim()) patch.to = to.trim()
      if (model) patch.model = model
      if (session.trim()) patch.session = session.trim()
      if (Number.isFinite(parsedAck) && parsedAck >= 0) patch.ackMaxChars = parsedAck
      await gatewayWs.configPatch(
        { agents: { list: [{ id: agentId, heartbeat: { ...patch } }] } },
        configHash,
      )
      await gatewayWs.health().then(useSystemStore.getState().updateFromHealth).catch(() => {})
      onSaved()
      handleClose()
    } catch (err) {
      addToast(`Failed to add heartbeat: ${formatRpcError(err)}`)
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setAgentId("")
    setEvery("")
    setTarget("")
    setTo("")
    setModel("")
    setSession("")
    setAckMaxChars("")
    setAgentError("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Heartbeat</DialogTitle>
          <DialogDescription>Add heartbeat configuration to an agent.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">
              Agent <span className="text-destructive">*</span>
            </label>
            <select
              value={agentId}
              onChange={(e) => {
                setAgentId(e.target.value)
                if (agentError) setAgentError("")
              }}
              className={selectClass}
            >
              <option value="">Select agent</option>
              {availableAgents.map((a) => (
                <option key={a.agentId} value={a.agentId}>
                  {a.name ?? a.agentId}
                </option>
              ))}
            </select>
            {agentError && <p className="text-xs text-destructive mt-1">{agentError}</p>}
          </div>
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
              <option value="">None (default)</option>
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
