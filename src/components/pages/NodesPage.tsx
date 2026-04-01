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
import { useSystemStore } from "@/stores/system-store"
import { useRpc } from "@/hooks/use-rpc"
import { gatewayWs } from "@/services/gateway-ws"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageContent } from "@/components/shared/PageContent"
import { PageHeader } from "@/components/shared/PageHeader"
import { Server } from "lucide-react"

export function NodesPage() {
  const presence = useSystemStore((s) => s.presence)
  const { data: nodeData } = useRpc(() => gatewayWs.nodeList(), [])

  // Deduplicate presence entries by host+ip, prefer non-disconnect
  const unique = new Map<string, (typeof presence)[0]>()
  for (const p of presence) {
    const key = `${p.host}:${p.ip}`
    const existing = unique.get(key)
    if (
      !existing ||
      (p.reason !== "disconnect" &&
        (existing.reason === "disconnect" || (p.ts ?? 0) > (existing.ts ?? 0)))
    ) {
      unique.set(key, p)
    }
  }
  const entries = [...unique.values()]

  const connected = entries.filter((p) => p.reason !== "disconnect")
  const disconnected = entries.filter((p) => p.reason === "disconnect")

  const subtitle = (
    <>
      {connected.length} online &middot; {disconnected.length} offline
      {nodeData?.nodes && nodeData.nodes.length > 0 && ` · ${nodeData.nodes.length} registered`}
    </>
  )

  return (
    <PageContent>
      <PageHeader
        breadcrumbs={[{ label: "Nodes" }]}
        subtitle={subtitle}
        actions={undefined}
      />

      <Card>
        <CardContent>
          {entries.length === 0 ? (
            <EmptyState icon={Server} title="No presence data available" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Host</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Roles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, i) => {
                  const isOnline = entry.reason !== "disconnect"
                  return (
                    <TableRow key={i} className={!isOnline ? "opacity-50" : undefined}>
                      <TableCell className="font-medium text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 shrink-0 rounded-full ${isOnline ? "bg-status-success" : "bg-muted-foreground"}`}
                          />
                          {entry.host}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {entry.ip}
                      </TableCell>
                      <TableCell>
                        {entry.mode ? (
                          <Badge variant="outline" className="text-[0.625rem] px-1.5 py-0">
                            {entry.mode}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.platform ?? "--"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.version ? `v${entry.version}` : "--"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {entry.deviceFamily ?? "--"}
                      </TableCell>
                      <TableCell>
                        {entry.roles && entry.roles.length > 0 ? (
                          <div className="flex gap-1">
                            {entry.roles.map((r) => (
                              <Badge key={r} variant="default" className="text-[0.625rem] px-1.5 py-0">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">--</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageContent>
  )
}
