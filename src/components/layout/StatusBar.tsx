import { useSystemStore } from "@/stores/system-store"
import { useGatewayStore } from "@/stores/gateway-store"
import { useTerminalStore } from "@/stores/terminal-store"
import { Terminal } from "lucide-react"

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
  const terminalOpen = useTerminalStore((s) => s.isOpen)
  const openTerminal = useTerminalStore((s) => s.open)

  if (connectionStatus !== "connected") return null

  return (
    <footer className="flex items-center gap-6 border-t px-6 py-2 text-xs text-muted-foreground">
      {version && <span>Version: {version}</span>}
      {uptimeMs != null && connectedAt != null && (
        <span>Uptime: {formatUptime(uptimeMs, connectedAt)}</span>
      )}
      {!terminalOpen && (
        <button
          type="button"
          onClick={openTerminal}
          className="ml-auto flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Terminal className="h-3 w-3" />
          <span>Terminal</span>
        </button>
      )}
    </footer>
  )
}
