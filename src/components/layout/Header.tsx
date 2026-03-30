import { useGatewayStore, type ConnectionStatus } from "@/stores/gateway-store"

const statusColors: Record<ConnectionStatus, string> = {
  connected: "bg-emerald-500",
  connecting: "bg-yellow-500 animate-pulse",
  disconnected: "bg-zinc-400",
  error: "bg-red-500",
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
    <header className="flex items-center justify-between border-b px-6 py-4">
      <h1 className="text-xl font-semibold tracking-tight">OpenClaw Dashboard</h1>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className={`h-2.5 w-2.5 rounded-full ${statusColors[connectionStatus]}`} />
        <span>{statusLabels[connectionStatus]}</span>
        {host && connectionStatus === "connected" && <span className="text-xs">({host})</span>}
      </div>
    </header>
  )
}
