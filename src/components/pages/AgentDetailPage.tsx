import { useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatCard } from "@/components/shared/StatCard"
import { useSystemStore } from "@/stores/system-store"
import {
  Bot,
  Cpu,
  FolderOpen,
  Hash,
  MessageSquare,
  Brain,
  Clock,
  Layers,
  Search,
  Shrink,
  GitBranch,
} from "lucide-react"
import { extractAgentId } from "@/lib/session-utils"
import { formatDuration } from "@/lib/format"
import { BackLink } from "@/components/shared/BackLink"
import { LoadingBlock } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { SessionsTable } from "@/components/shared/SessionsTable"
import { useAgents } from "@/hooks/use-agents"
import { useSessions, useSessionDelete } from "@/hooks/use-sessions"

function ConfigRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  )
}

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const snapshotAgents = useSystemStore((s) => s.agents)

  const { agents, defaultId, isLoading: agentsLoading } = useAgents()
  const { sessions, isLoading: sessionsLoading, refetch: sessionsRefetch } = useSessions()
  const { deleteSession } = useSessionDelete(sessionsRefetch)

  const agentNameMap = new Map(agents.map((a) => [a.id, a.name ?? a.id]))

  const agent = agents.find((a) => a.id === agentId)
  const snapshot = snapshotAgents.find((a) => a.agentId === agentId)
  const isDefault = agent?.isDefault || (agents.length > 0 && agent?.id === defaultId)

  const agentSessions = sessions.filter((s) => extractAgentId(s.key) === agentId)

  if (agentsLoading) {
    return <LoadingBlock className="py-24" />
  }

  if (!agent) {
    return (
      <div className="space-y-4">
        <BackLink to="/agents" label="Agents" />
        <EmptyState icon={Bot} title={`Agent ${agentId} not found`} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <BackLink to="/agents" label="Agents" />
        <div className="flex items-center gap-3 mt-3">
          <h2 className="text-lg font-semibold tracking-tight">{agent.name ?? agent.id}</h2>
          {isDefault && (
            <Badge variant="default" className="text-[0.625rem] px-1.5 py-0">
              default
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground font-mono mt-1">{agent.id}</p>
      </div>

      {/* Primary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Cpu} label="Model">
          <p className="text-sm font-medium">{agent.model ?? "default"}</p>
        </StatCard>
        <StatCard icon={FolderOpen} label="Workspace">
          <p className="text-sm font-medium font-mono truncate">{agent.workspace ?? "--"}</p>
        </StatCard>
        <StatCard icon={Hash} label="Sessions">
          <p className="text-sm font-medium">{snapshot?.sessions.count ?? agentSessions.length}</p>
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
          <CardTitle className="text-sm font-medium">Configuration</CardTitle>
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
    </div>
  )
}
