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
import { Input } from "@/components/ui/input"
import { Bot } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAgents } from "@/hooks/use-agents"
import { useSystemStore } from "@/stores/system-store"
import { LoadingBlock } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageHeader } from "@/components/shared/PageHeader"

export function AgentsPage() {
  const [filter, setFilter] = useState("")
  const navigate = useNavigate()
  const snapshotAgents = useSystemStore((s) => s.agents)
  const { agents: rpcAgents, defaultId, isLoading, scopeError } = useAgents()

  const agents =
    rpcAgents.length > 0
      ? rpcAgents
      : snapshotAgents.map((a) => ({
          id: a.agentId,
          name: a.name,
          isDefault: a.isDefault,
        }))

  const filtered = filter
    ? agents.filter(
        (a) =>
          (a.name ?? "").toLowerCase().includes(filter.toLowerCase()) ||
          a.id.toLowerCase().includes(filter.toLowerCase()),
      )
    : agents

  if (scopeError) return <EmptyState scope="operator.read" icon={Bot} title="" />

  return (
    <div className="space-y-4">
      <PageHeader
        title="Agents"
        subtitle={agents.length > 0 ? `${agents.length} registered` : undefined}
        actions={
          <Input
            placeholder="Filter agents..."
            value={filter}
            onChange={(e) => setFilter((e.target as HTMLInputElement).value)}
            className="w-64"
          />
        }
      />

      <Card>
        <CardContent>
          {isLoading ? (
            <LoadingBlock />
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {filter ? "No agents match your filter." : "No agents registered."}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((agent) => {
                  const snapshot = snapshotAgents.find((a) => a.agentId === agent.id)
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
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {agent.id}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {snapshot ? snapshot.sessions.count.toLocaleString() : "--"}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
