import { useNavigate, useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { Bot, TriangleAlert, X } from "lucide-react"
import { extractAgentId } from "@/lib/session-utils"
import { formatRpcError } from "@/lib/errors"
import { useTerminalStore } from "@/stores/terminal-store"
import { uuid } from "@/lib/uuid"
import { gatewayWs } from "@/services/gateway-ws"
import { Breadcrumb } from "@/components/shared/Breadcrumb"
import { PageContent } from "@/components/shared/PageContent"
import { PageLoading } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { SessionsTable } from "@/components/shared/SessionsTable"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { LoadingBlock } from "@/components/shared/LoadingSpinner"
import { useAgents, useModels, useTools } from "@/hooks/use-agents"
import { useConfig } from "@/hooks/use-config"
import { useAgentMutations } from "@/hooks/use-agent-mutations"
import { useSessions, useSessionDelete } from "@/hooks/use-sessions"
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog"
import { useState, useEffect } from "react"
import type { AgentEntry } from "@/types/agent"

const selectClass =
  "h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"

function AgentConfigDialog({
  open,
  onClose,
  agent,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  agent: AgentEntry
  onSaved: () => void
}) {
  const { parsed, configHash, refetch: refetchConfig } = useConfig()
  const { models } = useModels()
  const addToast = useErrorToastStore((s) => s.addToast)

  const [name, setName] = useState("")
  const [model, setModel] = useState("")
  const [thinking, setThinking] = useState("")
  const [memorySearch, setMemorySearch] = useState("")
  const [subagentModel, setSubagentModel] = useState("")
  const [fallbacks, setFallbacks] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Reset form state from raw per-agent config each time dialog opens
  useEffect(() => {
    if (!open) return
    const entry = parsed?.agents?.list?.find((c) => c.id === agent.id)
    const entryModel =
      typeof entry?.model === "object" && entry?.model !== null
        ? ((entry.model as { primary?: string }).primary ?? "")
        : ((entry?.model as string) ?? "")
    const entryFallbacks =
      typeof entry?.model === "object" && entry?.model !== null
        ? ((entry.model as { fallbacks?: string[] }).fallbacks ?? [])
        : []

    setName(entry?.name ?? "")
    setModel(entryModel)
    setThinking(entry?.thinkingDefault ?? "")
    setMemorySearch(
      entry?.memorySearch?.enabled != null
        ? entry.memorySearch.enabled
          ? "enabled"
          : "disabled"
        : "",
    )
    setSubagentModel(entry?.subagents?.model ?? "")
    setFallbacks(entryFallbacks)
  }, [open, agent.id, parsed])

  const handleSave = async () => {
    setSaving(true)
    try {
      const currentList = parsed?.agents?.list ?? []

      // Spread existing entry to preserve non-editable fields, then
      // explicitly set all editable fields (null clears overrides)
      const existing = currentList.find((c) => c.id === agent.id)
      const entry: Record<string, unknown> = { ...existing, id: agent.id }

      entry.name = name.trim() || null
      entry.model = model
        ? fallbacks.length > 0 ? { primary: model, fallbacks } : model
        : null
      entry.thinkingDefault = thinking || null
      entry.memorySearch = memorySearch ? { enabled: memorySearch === "enabled" } : null
      entry.subagents = subagentModel ? { model: subagentModel } : null

      // Replace existing entry or append new one
      const existingIdx = currentList.findIndex((c) => c.id === agent.id)
      const newList =
        existingIdx >= 0
          ? currentList.map((c, i) => (i === existingIdx ? entry : c))
          : [...currentList, entry]

      await gatewayWs.configPatch({ agents: { list: newList } }, configHash)
      refetchConfig()
      onSaved()
      onClose()
    } catch (err) {
      addToast(`Failed to update config: ${formatRpcError(err)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>Update configuration for {agent.name ?? agent.id}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
              placeholder="Display name"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={selectClass}
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
              className={selectClass}
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
                className={selectClass}
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
                className={selectClass}
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
          <div>
            <label className="text-xs text-muted-foreground">Fallback Models</label>
            {fallbacks.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {fallbacks.map((f, i) => (
                  <Badge key={f} variant="outline" className="text-[0.625rem] px-1.5 py-0 gap-1">
                    {f}
                    <button
                      type="button"
                      onClick={() => setFallbacks(fallbacks.filter((_, j) => j !== i))}
                      className="hover:text-destructive"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value && !fallbacks.includes(e.target.value)) {
                  setFallbacks([...fallbacks, e.target.value])
                }
              }}
              className={selectClass}
            >
              <option value="">Add fallback model...</option>
              {models
                .filter((m) => !fallbacks.includes(`${m.provider}/${m.id}`))
                .map((m) => (
                  <option key={m.id} value={`${m.provider}/${m.id}`}>
                    {m.provider}/{m.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <div className="flex items-center gap-1.5 text-xs text-warning mr-auto">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
            <span>Saving restarts the gateway</span>
          </div>
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

const toolProfiles = ["full", "coding", "messaging", "minimal"] as const

function AgentToolsDialog({
  open,
  onClose,
  agentId,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  agentId: string
  onSaved: () => void
}) {
  const { parsed, configHash, refetch: refetchConfig } = useConfig()
  const { groups } = useTools(agentId)
  const addToast = useErrorToastStore((s) => s.addToast)

  const [profile, setProfile] = useState("")
  const [allow, setAllow] = useState<string[]>([])
  const [deny, setDeny] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const allToolIds = groups.flatMap((g) => [`group:${g.id}`, ...g.tools.map((t) => t.id)])

  useEffect(() => {
    if (!open) return
    const entry = parsed?.agents?.list?.find((c) => c.id === agentId)
    setProfile(entry?.tools?.profile ?? "")
    setAllow(entry?.tools?.allow ?? [])
    setDeny(entry?.tools?.deny ?? [])
  }, [open, agentId, parsed])

  const addItem = (list: string[], setList: (v: string[]) => void, value: string) => {
    if (value && !list.includes(value)) setList([...list, value])
  }
  const removeItem = (list: string[], setList: (v: string[]) => void, index: number) => {
    setList(list.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Per-agent: profile, allow, deny all supported
      // Always send arrays explicitly — omitted keys preserve old values
      const currentList = parsed?.agents?.list ?? []
      const existing = currentList.find((c) => c.id === agentId)
      const entry: Record<string, unknown> = { ...existing, id: agentId }
      // Always send all fields explicitly — omitted keys preserve old values
      entry.tools = {
        profile: profile || null,
        allow: allow,
        deny: deny,
      }

      const existingIdx = currentList.findIndex((c) => c.id === agentId)
      const newList =
        existingIdx >= 0
          ? currentList.map((c, i) => (i === existingIdx ? entry : c))
          : [...currentList, entry]

      await gatewayWs.configPatch({ agents: { list: newList } }, configHash)
      refetchConfig()
      onSaved()
      onClose()
    } catch (err) {
      addToast(`Failed to update tools config: ${formatRpcError(err)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Agent Tools</DialogTitle>
          <DialogDescription>
            Configure tool profile, allow, and deny lists for this agent.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Profile</label>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              className={selectClass}
            >
              <option value="">Use default (full)</option>
              {toolProfiles.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Allow</label>
            {allow.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {allow.map((item, i) => (
                  <Badge key={item} variant="outline" className="text-[0.625rem] px-1.5 py-0 gap-1">
                    {item}
                    <button
                      type="button"
                      onClick={() => removeItem(allow, setAllow, i)}
                      className="inline-flex items-center hover:text-destructive [&>svg]:pointer-events-auto"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <select
              value=""
              onChange={(e) => addItem(allow, setAllow, e.target.value)}
              className={selectClass}
            >
              <option value="">Add tool to allow list...</option>
              {allToolIds
                .filter((t) => !allow.includes(t))
                .map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Deny</label>
            {deny.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {deny.map((item, i) => (
                  <Badge
                    key={item}
                    variant="destructive"
                    className="text-[0.625rem] px-1.5 py-0 gap-1"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeItem(deny, setDeny, i)}
                      className="inline-flex items-center hover:text-destructive-foreground [&>svg]:pointer-events-auto"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <select
              value=""
              onChange={(e) => addItem(deny, setDeny, e.target.value)}
              className={selectClass}
            >
              <option value="">Add tool to deny list...</option>
              {allToolIds
                .filter((t) => !deny.includes(t))
                .map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <div className="flex items-center gap-1.5 text-xs text-warning mr-auto">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
            <span>Saving restarts the gateway</span>
          </div>
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

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const [configOpen, setConfigOpen] = useState(false)
  const [toolsConfigOpen, setToolsConfigOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { agents, defaultId, isLoading: agentsLoading, refetch } = useAgents()
  const { deleteAgent } = useAgentMutations(defaultId)
  const { sessions, isLoading: sessionsLoading, refetch: sessionsRefetch } = useSessions()
  const { deleteSession } = useSessionDelete(sessionsRefetch)
  const {
    groups: rawToolGroups,
    isLoading: toolsLoading,
    refetch: refetchTools,
  } = useTools(agentId)
  const { parsed, refetch: refetchConfig } = useConfig()

  const agentNameMap = new Map(agents.map((a) => [a.id, a.name ?? a.id]))
  const agent = agents.find((a) => a.id === agentId)
  const agentSessions = sessions.filter((s) => extractAgentId(s.key) === agentId)

  const agentToolsConfig = parsed?.agents?.list?.find((c) => c.id === agentId)?.tools
  const agentProfile = agentToolsConfig?.profile ?? "full"
  const allowSet = new Set(agentToolsConfig?.allow ?? [])
  const denySet = new Set(agentToolsConfig?.deny ?? [])
  const toolGroups = rawToolGroups
    .map((g) => {
      if (denySet.has(`group:${g.id}`)) return { ...g, tools: [] }
      const groupAllowed = allowSet.has(`group:${g.id}`)
      return {
        ...g,
        tools: g.tools.filter((t) => {
          if (denySet.has(t.id)) return false
          if (allowSet.has(t.id) || groupAllowed) return true
          if (agentProfile === "full") return true
          return t.defaultProfiles?.includes(agentProfile) ?? false
        }),
      }
    })
    .filter((g) => g.tools.length > 0)

  if (agentsLoading) return <PageLoading />

  if (!agent) {
    return (
      <PageContent>
        <Breadcrumb items={[{ label: "Agents", to: "/agents" }, { label: agentId ?? "Unknown" }]} />
        <EmptyState icon={Bot} title={`Agent ${agentId} not found`} />
      </PageContent>
    )
  }

  return (
    <PageContent>
      <Breadcrumb items={[{ label: "Agents", to: "/agents" }, { label: agent.name ?? agent.id }]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{agent.name ?? agent.id}</CardTitle>
              {agent.name && <p className="text-sm text-muted-foreground">ID: {agent.id}</p>}
            </div>
            <div className="flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={() => setConfigOpen(true)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={agent.isDefault || agent.id === defaultId}
                title={
                  agent.isDefault || agent.id === defaultId
                    ? "Cannot delete the default agent"
                    : "Delete agent"
                }
              >
                Delete
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">Model</dt>
              <dd>{agent.model ?? "default"}</dd>

              <dt className="text-muted-foreground">Workspace</dt>
              <dd className="font-mono break-all">{agent.workspace ?? "--"}</dd>

              <dt className="text-muted-foreground">Channels</dt>
              <dd>
                {agent.channels?.length ? (
                  <div className="flex gap-1 flex-wrap">
                    {agent.channels.map((ch) => (
                      <Badge key={ch} variant="outline" className="text-[0.625rem] px-1.5 py-0">
                        {ch}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">--</span>
                )}
              </dd>

              <dt className="text-muted-foreground">Thinking</dt>
              <dd>{agent.thinkingDefault ?? "--"}</dd>

              <dt className="text-muted-foreground">Memory Search</dt>
              <dd>
                {agent.memorySearchEnabled != null ? (
                  <Badge
                    variant={agent.memorySearchEnabled ? "default" : "secondary"}
                    className="text-[0.625rem] px-1.5 py-0"
                  >
                    {agent.memorySearchEnabled ? "on" : "off"}
                  </Badge>
                ) : (
                  "--"
                )}
              </dd>

              <dt className="text-muted-foreground">Subagent Model</dt>
              <dd>{agent.subagentsModel ?? "--"}</dd>

              <dt className="text-muted-foreground">Fallbacks</dt>
              <dd>
                {agent.fallbacks?.length ? (
                  <div className="flex gap-1 flex-wrap">
                    {agent.fallbacks.map((f) => (
                      <Badge key={f} variant="outline" className="text-[0.625rem] px-1.5 py-0">
                        {f}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">--</span>
                )}
              </dd>

              <dt className="text-muted-foreground">Sessions</dt>
              <dd>{agentSessions.length.toLocaleString()}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-0">
            <CardTitle className="text-sm font-medium">Tools</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setToolsConfigOpen(true)}>
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            {toolsLoading ? (
              <LoadingBlock />
            ) : toolGroups.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No tools found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Group</TableHead>
                    <TableHead>Tools</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {toolGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell className="font-medium text-sm whitespace-nowrap align-top">
                        {group.label}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-normal">
                        {group.tools.map((t) => t.label).join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium">Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionsTable
            sessions={agentSessions}
            agentNameMap={agentNameMap}
            deleteSession={deleteSession}
            isLoading={sessionsLoading}
            emptyMessage="No sessions for this agent"
            hideAgentColumn
            onNewSession={() => {
              const hash = uuid().slice(0, 8)
              const sessionKey = `agent:${agent.id}:chat:${hash}`
              const store = useTerminalStore.getState()
              store.setSession(agent.id, sessionKey)
              store.open()
            }}
          />
        </CardContent>
      </Card>

      <AgentConfigDialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        agent={agent}
        onSaved={() => {
          refetch()
          refetchConfig()
        }}
      />

      <AgentToolsDialog
        open={toolsConfigOpen}
        onClose={() => setToolsConfigOpen(false)}
        agentId={agent.id}
        onSaved={() => {
          refetch()
          refetchTools()
          refetchConfig()
        }}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={async () => {
          await deleteAgent(agent.id)
          navigate("/agents")
        }}
        targetLabel={agent.name ?? agent.id}
        title="Delete Agent"
        description="Permanently remove this agent and its channel bindings? Existing sessions will remain."
      />
    </PageContent>
  )
}
