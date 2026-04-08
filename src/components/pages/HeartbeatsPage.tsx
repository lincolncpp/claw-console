import { PageContent } from "@/components/shared/PageContent"
import { PageHeader } from "@/components/shared/PageHeader"
import { HeartbeatTable } from "@/components/heartbeat/HeartbeatTable"
import { GlobalHeartbeatCard } from "@/components/heartbeat/GlobalHeartbeatCard"
import { useHeartbeatAgents, useHeartbeatDefaults } from "@/hooks/use-heartbeat"
import { gatewayWs } from "@/services/gateway-ws"
import { useSystemStore } from "@/stores/system-store"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { formatRpcError } from "@/lib/errors"

export function HeartbeatsPage() {
  const { agents, isLoading } = useHeartbeatAgents()
  const { defaults, configHash, refetch } = useHeartbeatDefaults()
  const addToast = useErrorToastStore((s) => s.addToast)

  const enabledCount = agents.filter((a) => a.heartbeat.enabled && (a.heartbeat.everyMs ?? 0) > 0).length

  const handleToggle = async (agentId: string, currentEnabled: boolean) => {
    try {
      const newEvery = currentEnabled ? "0m" : (defaults.every ?? "30m")
      await gatewayWs.configPatch(
        { agents: { list: [{ id: agentId, heartbeat: { every: newEvery } }] } },
        configHash,
      )
      refetch()
      gatewayWs.health().then(useSystemStore.getState().updateFromHealth).catch(() => {})
    } catch (err) {
      addToast(`Failed to toggle heartbeat: ${formatRpcError(err)}`)
    }
  }

  if (isLoading) {
    return (
      <PageContent>
        <PageHeader breadcrumbs={[{ label: "Heartbeats" }]} />
        <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
      </PageContent>
    )
  }

  return (
    <PageContent>
      <PageHeader
        breadcrumbs={[{ label: "Heartbeats" }]}
        subtitle={
          agents.length > 0
            ? `${enabledCount} of ${agents.length} agent${agents.length !== 1 ? "s" : ""} with heartbeat enabled`
            : undefined
        }
      />
      <GlobalHeartbeatCard globalEnabled={enabledCount > 0} onConfigChanged={refetch} />
      <HeartbeatTable agents={agents} onToggle={handleToggle} />
    </PageContent>
  )
}
