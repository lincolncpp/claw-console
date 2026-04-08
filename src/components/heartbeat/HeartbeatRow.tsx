import { TableCell, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatTimeAgo } from "@/lib/format"
import type { HeartbeatAgentEntry } from "@/types/heartbeat"

interface HeartbeatRowProps {
  agent: HeartbeatAgentEntry
  lastHeartbeatTs?: number | null
  onClick: () => void
}

export function HeartbeatRow({ agent, lastHeartbeatTs, onClick }: HeartbeatRowProps) {
  const { heartbeat } = agent
  const isActive = heartbeat.enabled && (heartbeat.everyMs ?? 0) > 0

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={onClick}
    >
      <TableCell className="font-medium">
        {agent.name || agent.agentId}
        {agent.isDefault && (
          <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
            default
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
          {isActive ? "Active" : "Inactive"}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {heartbeat.every === "disabled" || heartbeat.every === "0m" ? "--" : heartbeat.every}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {heartbeat.target}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        agent default
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        main
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {lastHeartbeatTs ? formatTimeAgo(lastHeartbeatTs) : "--"}
      </TableCell>
    </TableRow>
  )
}
