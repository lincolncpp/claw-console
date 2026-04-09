import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { HeartbeatRow } from "./HeartbeatRow"
import { TableFooter } from "@/components/shared/TableFooter"
import { useNavigate } from "react-router-dom"
import type { HeartbeatAgentEntry } from "@/types/heartbeat"

interface HeartbeatTableProps {
  agents: HeartbeatAgentEntry[]
  onNewHeartbeat?: () => void
}

export function HeartbeatTable({ agents, onNewHeartbeat }: HeartbeatTableProps) {
  const navigate = useNavigate()

  return (
    <Card>
      <CardContent>
        {agents.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No agents with heartbeat configuration found.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Last Heartbeat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <HeartbeatRow
                  key={agent.agentId}
                  agent={agent}
                  onClick={() => navigate(`/heartbeats/${encodeURIComponent(agent.agentId)}`)}
                />
              ))}
            </TableBody>
          </Table>
        )}
        {onNewHeartbeat && (
          <TableFooter className="justify-end">
            <Button variant="outline" size="sm" onClick={onNewHeartbeat}>
              <Plus className="h-3 w-3 mr-1" />
              New Heartbeat
            </Button>
          </TableFooter>
        )}
      </CardContent>
    </Card>
  )
}
