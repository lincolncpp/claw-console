import { TableCell, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { formatTimeAgo } from "@/lib/format"
import type { HeartbeatAgentEntry } from "@/types/heartbeat"

interface HeartbeatRowProps {
  agent: HeartbeatAgentEntry
  lastHeartbeatTs?: number | null
  onToggle: (agentId: string, currentEnabled: boolean) => void
  onClick: () => void
}

export function HeartbeatRow({ agent, lastHeartbeatTs, onToggle, onClick }: HeartbeatRowProps) {
  const { heartbeat } = agent
  const isActive = heartbeat.enabled && (heartbeat.everyMs ?? 0) > 0
  const disabled = !isActive

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle(agent.agentId, isActive)
  }

  return (
    <TableRow
      className={`cursor-pointer hover:bg-muted/50 ${disabled ? "opacity-50" : ""}`}
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
        <div className="flex items-center gap-2" onClick={handleToggle}>
          <Switch checked={isActive} className="pointer-events-none" />
          <span className="text-xs text-muted-foreground">
            {isActive ? "On" : "Off"}
          </span>
        </div>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {disabled ? "--" : heartbeat.every}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {disabled ? "--" : heartbeat.target}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {disabled ? "--" : "agent default"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {disabled ? "--" : "main"}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {lastHeartbeatTs ? formatTimeAgo(lastHeartbeatTs) : "--"}
      </TableCell>
    </TableRow>
  )
}
