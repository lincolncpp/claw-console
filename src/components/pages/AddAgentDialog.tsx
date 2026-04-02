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
import { TriangleAlert } from "lucide-react"
import { useModels } from "@/hooks/use-agents"
import { useAgentMutations } from "@/hooks/use-agent-mutations"

interface AddAgentDialogProps {
  open: boolean
  onClose: () => void
  existingIds: string[]
  configHash?: string
  onSaved: () => void
}

export function AddAgentDialog({ open, onClose, existingIds, onSaved }: AddAgentDialogProps) {
  const [id, setId] = useState("")
  const [name, setName] = useState("")
  const [workspaceEdited, setWorkspaceEdited] = useState(false)
  const [workspace, setWorkspace] = useState("")
  const [model, setModel] = useState("")
  const [thinking, setThinking] = useState("")
  const [memorySearch, setMemorySearch] = useState("")
  const [subagentModel, setSubagentModel] = useState("")
  const [saving, setSaving] = useState(false)
  const [idError, setIdError] = useState("")

  const { models } = useModels()
  const { addAgent } = useAgentMutations()

  const formatId = (raw: string) =>
    raw
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9_-]/g, "")

  const deriveWorkspace = (agentId: string) => (agentId ? `~/.openclaw/workspace-${agentId}` : "")

  const handleIdChange = (raw: string) => {
    const formatted = formatId(raw)
    setId(formatted)
    if (!workspaceEdited) setWorkspace(deriveWorkspace(formatted))
    if (idError) validateId(formatted)
  }

  const validateId = (value: string) => {
    if (!value.trim()) {
      setIdError("Agent ID is required")
      return false
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      setIdError("Only letters, numbers, hyphens, and underscores")
      return false
    }
    if (existingIds.includes(value)) {
      setIdError("Agent ID already exists")
      return false
    }
    setIdError("")
    return true
  }

  const handleSave = async () => {
    if (!validateId(id)) return
    setSaving(true)
    try {
      const entry: Record<string, unknown> = { id: id.trim() }
      if (name.trim()) entry.name = name.trim()
      if (workspace.trim()) entry.workspace = workspace.trim()
      if (model) entry.model = model
      if (thinking) entry.thinkingDefault = thinking
      if (memorySearch) entry.memorySearch = { enabled: memorySearch === "enabled" }
      if (subagentModel) entry.subagents = { model: subagentModel }

      await addAgent(entry as { id: string })
      onSaved()
      handleClose()
    } catch {
      // error toast handled by hook
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setId("")
    setName("")
    setWorkspace("")
    setWorkspaceEdited(false)
    setModel("")
    setThinking("")
    setMemorySearch("")
    setSubagentModel("")
    setIdError("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>New Agent</DialogTitle>
          <DialogDescription>Register a new agent in the gateway configuration.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">
              Agent ID <span className="text-destructive">*</span>
            </label>
            <Input
              value={id}
              onChange={(e) => handleIdChange((e.target as HTMLInputElement).value)}
              placeholder="e.g. work, deploy-bot"
            />
            {idError && <p className="text-xs text-destructive mt-1">{idError}</p>}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
              placeholder="Display name"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Workspace</label>
            <Input
              value={workspace}
              onChange={(e) => {
                setWorkspace((e.target as HTMLInputElement).value)
                setWorkspaceEdited(true)
              }}
              placeholder="e.g. ~/.openclaw/workspace-work"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"
            >
              <option value="">Use default</option>
              {models.map((m) => (
                <option key={m.id} value={`${m.provider}/${m.id}`}>
                  {m.provider}/{m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Thinking Default</label>
            <select
              value={thinking}
              onChange={(e) => setThinking(e.target.value)}
              className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"
            >
              <option value="">Use default</option>
              <option value="off">off</option>
              <option value="minimal">minimal</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="xhigh">xhigh</option>
              <option value="adaptive">adaptive</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Memory Search</label>
              <select
                value={memorySearch}
                onChange={(e) => setMemorySearch(e.target.value)}
                className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"
              >
                <option value="">Use default</option>
                <option value="enabled">enabled</option>
                <option value="disabled">disabled</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Subagent Model</label>
              <select
                value={subagentModel}
                onChange={(e) => setSubagentModel(e.target.value)}
                className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"
              >
                <option value="">Use default</option>
                {models.map((m) => (
                  <option key={m.id} value={`${m.provider}/${m.id}`}>
                    {m.provider}/{m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <div className="flex items-center gap-1.5 text-xs text-warning mr-auto">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
            <span>Saving restarts the gateway</span>
          </div>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Adding..." : "New Agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
