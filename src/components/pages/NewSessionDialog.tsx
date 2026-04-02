import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTerminalStore } from "@/stores/terminal-store"
import type { AgentEntry } from "@/types/agent"
import { uuid } from "@/lib/uuid"

interface NewSessionDialogProps {
  open: boolean
  onClose: () => void
  agents: AgentEntry[]
  defaultId?: string
}

export function NewSessionDialog({ open, onClose, agents, defaultId }: NewSessionDialogProps) {
  const [agentId, setAgentId] = useState("")
  const [prevOpen, setPrevOpen] = useState(false)

  if (open && !prevOpen) {
    setAgentId(defaultId ?? agents[0]?.id ?? "")
  }
  if (open !== prevOpen) {
    setPrevOpen(open)
  }

  const handleStart = () => {
    if (!agentId) return
    const hash = uuid().slice(0, 8)
    const sessionKey = `agent:${agentId}:chat:${hash}`
    const store = useTerminalStore.getState()
    store.setSession(agentId, sessionKey)
    store.open()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Session</DialogTitle>
          <DialogDescription>Choose an agent to start a new session.</DialogDescription>
        </DialogHeader>
        <div>
          <label className="text-xs text-muted-foreground">Agent</label>
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name ?? a.id}
              </option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={!agentId}>
            Start
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
