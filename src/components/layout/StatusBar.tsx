import { useSystemStore } from "@/stores/system-store"
import { useGatewayStore } from "@/stores/gateway-store"

function formatUptime(ms: number, connectedAt: number): string {
  // Add elapsed time since we received the snapshot
  const totalMs = ms + (Date.now() - connectedAt)
  const seconds = Math.floor(totalMs / 1000)
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(" ")
}

export function StatusBar() {
  const connectionStatus = useGatewayStore((s) => s.connectionStatus)
  const version = useSystemStore((s) => s.version)
  const uptimeMs = useSystemStore((s) => s.uptimeMs)
  const connectedAt = useSystemStore((s) => s.connectedAt)

  if (connectionStatus !== "connected") return null

  return (
    <footer className="flex items-center gap-6 border-t px-6 py-2 text-xs text-muted-foreground">
      {version && <span>Version: {version}</span>}
      {uptimeMs != null && connectedAt != null && (
        <span>Uptime: {formatUptime(uptimeMs, connectedAt)}</span>
      )}
    </footer>
  )
}
