import { useSystemStore } from "@/stores/system-store"
import { useGatewayStore } from "@/stores/gateway-store"

function formatUptime(seconds: number): string {
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
  const uptime = useSystemStore((s) => s.uptime)
  const pid = useSystemStore((s) => s.pid)

  if (connectionStatus !== "connected") return null

  return (
    <footer className="flex items-center gap-6 border-t px-6 py-2 text-xs text-muted-foreground">
      {version && <span>Version: {version}</span>}
      {uptime != null && <span>Uptime: {formatUptime(uptime)}</span>}
      {pid != null && <span>PID: {pid}</span>}
    </footer>
  )
}
