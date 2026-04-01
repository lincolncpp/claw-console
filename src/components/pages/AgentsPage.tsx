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
import { Bot, Settings, TriangleAlert } from "lucide-react"
import { formatDuration } from "@/lib/format"
import { formatRpcError } from "@/lib/errors"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAgents } from "@/hooks/use-agents"
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
import type { GlobalConfig } from "@/types/agent"

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
  const [toolSecurity, setToolSecurity] = useState(config.toolExecSecurity ?? "")
  const [toolAsk, setToolAsk] = useState(config.toolAskMode ?? "")
  const [cronConcurrency, setCronConcurrency] = useState(String(config.cronMaxConcurrentRuns ?? ""))
  const [saving, setSaving] = useState(false)
  const addToast = useErrorToastStore((s) => s.addToast)

  const handleSave = async () => {
    setSaving(true)
    try {
      await gatewayWs.configPatch(
        {
          tools: { exec: { security: toolSecurity, ask: toolAsk } },
          cron: { maxConcurrentRuns: parseInt(cronConcurrency, 10) || undefined },
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
          <DialogTitle>Global Configuration</DialogTitle>
          <DialogDescription>
            These settings apply to all agents unless overridden per-agent.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Tool Exec Security</label>
            <select
              value={toolSecurity}
              onChange={(e) => setToolSecurity(e.target.value)}
              className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"
            >
              <option value="deny">deny</option>
              <option value="allowlist">allowlist</option>
              <option value="full">full</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tool Ask Mode</label>
            <select
              value={toolAsk}
              onChange={(e) => setToolAsk(e.target.value)}
              className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"
            >
              <option value="off">off</option>
              <option value="on-miss">on-miss</option>
              <option value="always">always</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Cron Max Concurrent Runs</label>
            <Input
              type="number"
              min="1"
              value={cronConcurrency}
              onChange={(e) => setCronConcurrency((e.target as HTMLInputElement).value)}
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

export function AgentsPage() {
  const [configOpen, setConfigOpen] = useState(false)
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

  const agents =
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
            <p className="py-6 text-center text-sm text-muted-foreground">
              No agents registered.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Thinking</TableHead>
                  <TableHead>Timeout</TableHead>
                  <TableHead>Concurrency</TableHead>
                  <TableHead>Memory</TableHead>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDuration(
                          agent.timeoutSeconds ? agent.timeoutSeconds * 1000 : undefined,
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {agent.maxConcurrent ?? "--"}
                      </TableCell>
                      <TableCell>
                        {agent.memorySearchEnabled != null ? (
                          <Badge
                            variant={agent.memorySearchEnabled ? "default" : "secondary"}
                            className="text-[0.625rem] px-1.5 py-0"
                          >
                            {agent.memorySearchEnabled ? "on" : "off"}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">--</span>
                        )}
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
          {globalConfig && (
            <TableFooter className="gap-3 text-xs">
              <span className="text-muted-foreground">Global:</span>
              {globalConfig.toolExecSecurity && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  Tool Security
                  <Badge variant="outline" className="text-[0.625rem] px-1.5 py-0">
                    {globalConfig.toolExecSecurity}
                  </Badge>
                </span>
              )}
              {globalConfig.toolAskMode && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  Tool Ask
                  <Badge variant="outline" className="text-[0.625rem] px-1.5 py-0">
                    {globalConfig.toolAskMode}
                  </Badge>
                </span>
              )}
              {globalConfig.cronMaxConcurrentRuns != null && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  Cron Concurrency
                  <Badge variant="outline" className="text-[0.625rem] px-1.5 py-0">
                    {globalConfig.cronMaxConcurrentRuns}
                  </Badge>
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfigOpen(true)}
                className="ml-auto"
              >
                <Settings className="h-3 w-3 mr-1" />
                Edit Config
              </Button>
            </TableFooter>
          )}
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
    </PageContent>
  )
}
