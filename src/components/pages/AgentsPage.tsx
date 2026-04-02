import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { Bot, Plus, Settings, TriangleAlert } from "lucide-react"
import { formatRpcError } from "@/lib/errors"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAgents, useModels } from "@/hooks/use-agents"
import { useSystemStore } from "@/stores/system-store"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { gatewayWs } from "@/services/gateway-ws"
import { PageLoading } from "@/components/shared/LoadingSpinner"
import { TableFooter } from "@/components/shared/TableFooter"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageContent } from "@/components/shared/PageContent"
import { PageHeader } from "@/components/shared/PageHeader"
import { useSessions } from "@/hooks/use-sessions"
import { extractAgentId } from "@/lib/session-utils"
import type { AgentEntry, GlobalConfig } from "@/types/agent"
import { AddAgentDialog } from "./AddAgentDialog"

function GlobalConfigDialog({
  open,
  onClose,
  config,
  configHash,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  config: GlobalConfig
  configHash?: string
  onSaved: () => void
}) {
  const [cronConcurrency, setCronConcurrency] = useState("")
  const [defaultTimeout, setDefaultTimeout] = useState("")
  const [defaultConcurrency, setDefaultConcurrency] = useState("")
  const [memorySearch, setMemorySearch] = useState("")
  const [compaction, setCompaction] = useState("")
  const [subagentModel, setSubagentModel] = useState("")
  const [subagentConcurrency, setSubagentConcurrency] = useState("")
  const [saving, setSaving] = useState(false)
  const { models } = useModels()
  const addToast = useErrorToastStore((s) => s.addToast)

  useEffect(() => {
    if (!open) return
    setCronConcurrency(String(config.cronMaxConcurrentRuns ?? ""))
    setDefaultTimeout(String(config.defaultTimeoutSeconds ?? ""))
    setDefaultConcurrency(String(config.defaultMaxConcurrent ?? ""))
    setMemorySearch(config.defaultMemorySearch ?? "")
    setCompaction(config.defaultCompaction ?? "")
    setSubagentModel(config.defaultSubagentModel ?? "")
    setSubagentConcurrency(String(config.defaultSubagentConcurrency ?? ""))
  }, [open, config])

  const handleSave = async () => {
    setSaving(true)
    try {
      const agentsDefaults: Record<string, unknown> = {}
      if (defaultTimeout) agentsDefaults.timeoutSeconds = parseInt(defaultTimeout, 10)
      if (defaultConcurrency) agentsDefaults.maxConcurrent = parseInt(defaultConcurrency, 10)
      if (memorySearch) agentsDefaults.memorySearch = { enabled: memorySearch === "enabled" }
      if (compaction) agentsDefaults.compaction = { mode: compaction }
      const sub: Record<string, unknown> = {}
      if (subagentModel) sub.model = subagentModel
      if (subagentConcurrency) sub.maxConcurrent = parseInt(subagentConcurrency, 10)
      if (Object.keys(sub).length > 0) agentsDefaults.subagents = sub

      await gatewayWs.configPatch(
        {
          cron: { maxConcurrentRuns: parseInt(cronConcurrency, 10) || undefined },
          ...(Object.keys(agentsDefaults).length > 0
            ? { agents: { defaults: agentsDefaults } }
            : {}),
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Global Settings</DialogTitle>
          <DialogDescription>These settings apply globally to all agents.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Agent Timeout (seconds)</label>
            <Input
              type="number"
              min="1"
              value={defaultTimeout}
              onChange={(e) => setDefaultTimeout((e.target as HTMLInputElement).value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Agent Concurrency</label>
              <Input
                type="number"
                min="1"
                value={defaultConcurrency}
                onChange={(e) => setDefaultConcurrency((e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Cron Concurrency</label>
              <Input
                type="number"
                min="1"
                value={cronConcurrency}
                onChange={(e) => setCronConcurrency((e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Subagent Concurrency</label>
              <Input
                type="number"
                min="1"
                value={subagentConcurrency}
                onChange={(e) => setSubagentConcurrency((e.target as HTMLInputElement).value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Memory Search</label>
              <select
                value={memorySearch}
                onChange={(e) => setMemorySearch(e.target.value)}
                className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"
              >
                <option value="">Not set</option>
                <option value="enabled">enabled</option>
                <option value="disabled">disabled</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Compaction Mode</label>
              <select
                value={compaction}
                onChange={(e) => setCompaction(e.target.value)}
                className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"
              >
                <option value="">Not set</option>
                <option value="default">default</option>
                <option value="safeguard">safeguard</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Subagent Model</label>
            <select
              value={subagentModel}
              onChange={(e) => setSubagentModel(e.target.value)}
              className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"
            >
              <option value="">Not set</option>
              {models.map((m) => (
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

export function AgentsPage() {
  const [configOpen, setConfigOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const navigate = useNavigate()
  const snapshotAgents = useSystemStore((s) => s.agents)
  const {
    agents: rpcAgents,
    defaultId,
    globalConfig,
    configHash,
    isLoading,
    scopeError,
    refetch,
  } = useAgents()

  const { sessions } = useSessions()
  const sessionCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const s of sessions) {
      const aid = extractAgentId(s.key)
      counts[aid] = (counts[aid] ?? 0) + 1
    }
    return counts
  }, [sessions])

  const agents: AgentEntry[] =
    rpcAgents.length > 0
      ? rpcAgents
      : snapshotAgents.map((a) => ({
          id: a.agentId,
          name: a.name,
          isDefault: a.isDefault,
        }))

  if (scopeError) return <EmptyState scope="operator.read" icon={Bot} title="" />
  if (isLoading) return <PageLoading />

  return (
    <PageContent>
      <PageHeader
        breadcrumbs={[{ label: "Agents" }]}
        subtitle={agents.length > 0 ? `${agents.length} registered` : undefined}
        actions={undefined}
      />

      <Card>
        <CardContent>
          {agents.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No agents registered.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Thinking</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => {
                  return (
                    <TableRow
                      key={agent.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/agents/${agent.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{agent.name ?? agent.id}</span>
                          {(agent.isDefault || agent.id === defaultId) && (
                            <Badge variant="default" className="text-[0.625rem] px-1.5 py-0">
                              default
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {agent.model ?? "--"}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[300px]">
                        {agent.workspace ?? "--"}
                      </TableCell>
                      <TableCell>
                        {agent.channels?.length ? (
                          <div className="flex gap-1">
                            {agent.channels.map((ch) => (
                              <Badge
                                key={ch}
                                variant="outline"
                                className="text-[0.625rem] px-1.5 py-0"
                              >
                                {ch}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {agent.thinkingDefault ?? "--"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {(sessionCounts[agent.id] ?? 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          <TableFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfigOpen(true)}
              disabled={!globalConfig}
            >
              <Settings className="h-3 w-3 mr-1" />
              Edit Global Settings
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
              className="ml-auto"
            >
              <Plus className="h-3 w-3 mr-1" />
              New Agent
            </Button>
          </TableFooter>
        </CardContent>
      </Card>

      {globalConfig && (
        <GlobalConfigDialog
          open={configOpen}
          onClose={() => setConfigOpen(false)}
          config={globalConfig}
          configHash={configHash}
          onSaved={refetch}
        />
      )}

      <AddAgentDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        existingIds={agents.map((a) => a.id)}
        configHash={configHash}
        onSaved={refetch}
      />
    </PageContent>
  )
}
