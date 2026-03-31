import { useGatewayStore, type ConnectionStatus } from "@/stores/gateway-store"

const statusColors: Record<ConnectionStatus, string> = {
  connected: "bg-status-success",
  connecting: "bg-status-warning animate-pulse",
  disconnected: "bg-muted-foreground",
  error: "bg-status-error",
}

const statusLabels: Record<ConnectionStatus, string> = {
  connected: "Connected",
  connecting: "Connecting...",
  disconnected: "Disconnected",
  error: "Error",
}

export function Header() {
  const connectionStatus = useGatewayStore((s) => s.connectionStatus)
  const host = useGatewayStore((s) => s.host)

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <h1 className="text-xl font-semibold tracking-tight">OpenClaw Dashboard</h1>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className={`h-2.5 w-2.5 rounded-full ${statusColors[connectionStatus]}`} />
        <span>{statusLabels[connectionStatus]}</span>
        {host && connectionStatus === "connected" && <span className="text-xs">({host})</span>}
      </div>
    </header>
  )
}
