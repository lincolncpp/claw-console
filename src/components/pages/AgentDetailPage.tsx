import { useParams } from "react-router-dom"
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
import { StatCard } from "@/components/shared/StatCard"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { Bot, Cpu, FolderOpen, Hash, MessageSquare, Settings, TriangleAlert } from "lucide-react"
import { extractAgentId } from "@/lib/session-utils"
import { formatDuration } from "@/lib/format"
import { formatRpcError } from "@/lib/errors"
import { gatewayWs } from "@/services/gateway-ws"
import { Breadcrumb } from "@/components/shared/Breadcrumb"
import { PageContent } from "@/components/shared/PageContent"
import { PageLoading } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { SessionsTable } from "@/components/shared/SessionsTable"
import { useAgents, useModels } from "@/hooks/use-agents"
import { useSessions, useSessionDelete } from "@/hooks/use-sessions"
import { useState } from "react"
import type { AgentEntry } from "@/types/agent"

function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  )
}

function AgentConfigDialog({
  open,
  onClose,
  agent,
  configHash,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  agent: AgentEntry
  configHash?: string
  onSaved: () => void
}) {
  const [model, setModel] = useState(agent.model ?? "")
  const [thinking, setThinking] = useState(agent.thinkingDefault ?? "")
  const [timeout, setTimeout] = useState(String(agent.timeoutSeconds ?? ""))
  const [concurrency, setConcurrency] = useState(String(agent.maxConcurrent ?? ""))
  const [saving, setSaving] = useState(false)
  const addToast = useErrorToastStore((s) => s.addToast)
  const { models } = useModels()

  const handleSave = async () => {
    setSaving(true)
    try {
      const agentPatch: Record<string, unknown> = {}
      if (model) agentPatch.model = model
      if (thinking) agentPatch.thinkingDefault = thinking
      if (timeout) agentPatch.timeoutSeconds = parseInt(timeout, 10)
      if (concurrency) agentPatch.maxConcurrent = parseInt(concurrency, 10)

      await gatewayWs.configPatch(
        {
          agents: {
            defaults: agentPatch,
          },
        },
        configHash,
      )
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Agent Configuration</DialogTitle>
          <DialogDescription>Update configuration for {agent.name ?? agent.id}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"
            >
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
              <option value="off">off</option>
              <option value="minimal">minimal</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="xhigh">xhigh</option>
              <option value="adaptive">adaptive</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Timeout (seconds)</label>
            <Input
              type="number"
              min="1"
              value={timeout}
              onChange={(e) => setTimeout((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Max Concurrent</label>
            <Input
              type="number"
              min="1"
              value={concurrency}
              onChange={(e) => setConcurrency((e.target as HTMLInputElement).value)}
            />
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
  const [configOpen, setConfigOpen] = useState(false)

  const { agents, configHash, isLoading: agentsLoading, refetch } = useAgents()
  const { sessions, isLoading: sessionsLoading, refetch: sessionsRefetch } = useSessions()
  const { deleteSession } = useSessionDelete(sessionsRefetch)

  const agentNameMap = new Map(agents.map((a) => [a.id, a.name ?? a.id]))

  const agent = agents.find((a) => a.id === agentId)

  const agentSessions = sessions.filter((s) => extractAgentId(s.key) === agentId)

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

      {/* Primary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Cpu} label="Model">
          <p className="text-sm font-medium">{agent.model ?? "default"}</p>
        </StatCard>
        <StatCard icon={FolderOpen} label="Workspace">
          <p className="text-sm font-medium font-mono truncate">{agent.workspace ?? "--"}</p>
        </StatCard>
        <StatCard icon={Hash} label="Sessions">
          <p className="text-sm font-medium">{agentSessions.length.toLocaleString()}</p>
        </StatCard>
        <StatCard icon={MessageSquare} label="Channels">
          {agent.channels?.length ? (
            <div className="flex gap-1 flex-wrap">
              {agent.channels.map((ch) => (
                <Badge key={ch} variant="outline" className="text-[0.625rem] px-1.5 py-0">
                  {ch}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">--</p>
          )}
        </StatCard>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Configuration</CardTitle>
            <Button variant="ghost" size="icon-xs" onClick={() => setConfigOpen(true)}>
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 md:grid-cols-2">
            <div>
              <ConfigRow label="Thinking">{agent.thinkingDefault ?? "--"}</ConfigRow>
              <ConfigRow label="Timeout">
                {formatDuration(agent.timeoutSeconds ? agent.timeoutSeconds * 1000 : undefined)}
              </ConfigRow>
              <ConfigRow label="Concurrency">{agent.maxConcurrent ?? "--"}</ConfigRow>
              <ConfigRow label="Memory Search">
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
              </ConfigRow>
            </div>
            <div>
              <ConfigRow label="Compaction">{agent.compactionMode ?? "--"}</ConfigRow>
              <ConfigRow label="Fallback Models">
                {agent.fallbacks?.length ? (
                  <div className="flex gap-1 flex-wrap">
                    {agent.fallbacks.map((f) => (
                      <Badge key={f} variant="outline" className="text-[0.625rem] px-1.5 py-0">
                        {f}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  "--"
                )}
              </ConfigRow>
              <ConfigRow label="Subagent Model">{agent.subagentsModel ?? "--"}</ConfigRow>
              <ConfigRow label="Subagent Concurrency">
                {agent.subagentsMaxConcurrent ?? "--"}
              </ConfigRow>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions */}
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
          />
        </CardContent>
      </Card>

      <AgentConfigDialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        agent={agent}
        configHash={configHash}
        onSaved={refetch}
      />
    </PageContent>
  )
}
