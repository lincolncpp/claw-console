import { useParams, Link } from "react-router-dom"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRpc } from "@/hooks/use-rpc"
import { useSessionsRefresh } from "@/hooks/use-sessions-refresh"
import { useSystemStore } from "@/stores/system-store"
import { gatewayWs } from "@/services/gateway-ws"
import { useTerminalStore } from "@/stores/terminal-store"
import { ArrowLeft, Bot, Cpu, FolderOpen, Hash, Loader2, Trash2 } from "lucide-react"
import { useState } from "react"
import type { SessionEntry } from "@/types/session"

function formatAge(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

function extractAgentId(key: string): string {
  const parts = key.split(":")
  return parts[1] ?? "unknown"
}

function extractSessionType(key: string): string {
  const parts = key.split(":")
  return parts[2] ?? "session"
}

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const snapshotAgents = useSystemStore((s) => s.agents)

  const { data: agentsData, loading: agentsLoading } = useRpc(
    () => gatewayWs.agentsList(),
    [],
  )
  const {
    data: sessionsData,
    loading: sessionsLoading,
    refetch: sessionsRefetch,
  } = useRpc(() => gatewayWs.sessionsList(), [])

  useSessionsRefresh(sessionsRefetch)

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const agent = agentsData?.agents.find((a) => a.id === agentId)
  const snapshot = snapshotAgents.find((a) => a.agentId === agentId)
  const isDefault =
    agent?.isDefault || (agentsData != null && agent?.id === agentsData.defaultId)

  const allSessions: SessionEntry[] = sessionsData?.sessions ?? []
  const agentSessions = allSessions.filter(
    (s) => extractAgentId(s.key) === agentId,
  )

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await gatewayWs.sessionsDelete(deleteTarget)
      sessionsRefetch()
    } catch {
      // ignore
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  if (agentsLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="space-y-4">
        <Link
          to="/agents"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Agents
        </Link>
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bot className="h-8 w-8 mb-3 opacity-50" />
          <p className="text-sm">
            Agent <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{agentId}</code> not
            found
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/agents"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Agents
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold tracking-tight">
            {agent.name ?? agent.id}
          </h2>
          {isDefault && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0">
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
            <p className="text-sm font-medium font-mono truncate">
              {agent.workspace ?? "--"}
            </p>
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
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
                      <button
                        className="font-mono text-xs text-muted-foreground truncate block max-w-[400px] hover:text-foreground hover:underline cursor-pointer text-left"
                        onClick={() => {
                          useTerminalStore.getState().setSession(agentId!, session.key)
                          useTerminalStore.getState().open()
                        }}
                      >
                        {session.key}
                      </button>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {session.age != null
                        ? formatAge(session.age)
                        : session.updatedAt != null
                          ? formatAge(Date.now() - session.updatedAt)
                          : "--"}
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
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Permanently delete this session? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <p className="font-mono text-xs text-muted-foreground break-all">
              {deleteTarget}
            </p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
