import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useSystemStore } from "@/stores/system-store"
import { useRpc } from "@/hooks/use-rpc"
import { gatewayWs } from "@/services/gateway-ws"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageHeader } from "@/components/shared/PageHeader"
import { Server, Monitor, Wifi } from "lucide-react"

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
    <div className="space-y-6">
      <PageHeader title="Nodes & Presence" subtitle={subtitle} />

      {entries.length === 0 ? (
        <EmptyState icon={Server} title="No presence data available" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry, i) => {
            const isOnline = entry.reason !== "disconnect"
            return (
              <Card key={i} className={!isOnline ? "opacity-50" : undefined}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${isOnline ? "bg-status-success" : "bg-muted-foreground"}`}
                    />
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{entry.host}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{entry.ip}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {entry.mode && (
                        <Badge variant="outline" className="text-[0.625rem] px-1.5 py-0">
                          {entry.mode}
                        </Badge>
                      )}
                      {entry.platform && (
                        <Badge variant="secondary" className="text-[0.625rem] px-1.5 py-0">
                          {entry.platform}
                        </Badge>
                      )}
                      {entry.version && (
                        <Badge variant="secondary" className="text-[0.625rem] px-1.5 py-0">
                          v{entry.version}
                        </Badge>
                      )}
                      {entry.deviceFamily && (
                        <Badge variant="secondary" className="text-[0.625rem] px-1.5 py-0">
                          {entry.deviceFamily}
                        </Badge>
                      )}
                    </div>
                    {entry.roles && entry.roles.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {entry.roles.map((r) => (
                          <Badge key={r} variant="default" className="text-[0.625rem] px-1.5 py-0">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
