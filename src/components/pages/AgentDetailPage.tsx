import { useState } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { useSystemStore } from "@/stores/system-store"
import { Bot, Cpu, FolderOpen, Hash, Trash2 } from "lucide-react"
import { formatAge } from "@/lib/format"
import { extractAgentId, extractSessionType } from "@/lib/session-utils"
import { BackLink } from "@/components/shared/BackLink"
import { LoadingBlock } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog"
import { SessionKeyButton } from "@/components/shared/SessionKeyButton"
import { useAgents } from "@/hooks/use-agents"
import { useSessions, useSessionDelete } from "@/hooks/use-sessions"

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const snapshotAgents = useSystemStore((s) => s.agents)

  const { agents, defaultId, isLoading: agentsLoading } = useAgents()
  const { sessions, isLoading: sessionsLoading, refetch: sessionsRefetch } = useSessions()
  const { deleteSession } = useSessionDelete(sessionsRefetch)

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5" />
              Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{agent.model ?? "default"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5" />
              Workspace
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium font-mono truncate">{agent.workspace ?? "--"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5" />
              Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {snapshot?.sessions.count ?? agentSessions.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium">Sessions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sessionsLoading ? (
            <LoadingBlock />
          ) : agentSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No sessions for this agent
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Session Key</TableHead>
                  <TableHead className="text-right">Age</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentSessions.map((session) => (
                  <TableRow key={session.key}>
                    <TableCell className="text-xs text-muted-foreground">
                      {extractSessionType(session.key)}
                    </TableCell>
                    <TableCell>
                      <SessionKeyButton agentId={agentId!} sessionKey={session.key} />
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {session.age != null ? formatAge(session.age) : "--"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeleteTarget(session.key)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteSession(deleteTarget!)}
        targetLabel={deleteTarget ?? ""}
      />
    </div>
  )
}
