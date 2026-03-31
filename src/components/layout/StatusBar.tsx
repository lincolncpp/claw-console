import { useSystemStore } from "@/stores/system-store"
import { useGatewayStore } from "@/stores/gateway-store"
import { useTerminalStore } from "@/stores/terminal-store"
import { formatUptime } from "@/lib/format"
import { Terminal } from "lucide-react"

export function StatusBar() {
  const connectionStatus = useGatewayStore((s) => s.connectionStatus)
  const version = useSystemStore((s) => s.version)
  const uptimeMs = useSystemStore((s) => s.uptimeMs)
  const connectedAt = useSystemStore((s) => s.connectedAt)
  const terminalOpen = useTerminalStore((s) => s.isOpen)
  const openTerminal = useTerminalStore((s) => s.open)

  if (connectionStatus !== "connected") return null

  return (
    <footer className="flex h-12 items-center gap-6 border-t px-6 text-xs text-muted-foreground">
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
