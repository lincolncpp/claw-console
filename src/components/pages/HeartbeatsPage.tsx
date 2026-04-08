import { PageContent } from "@/components/shared/PageContent"
import { PageHeader } from "@/components/shared/PageHeader"
import { HeartbeatTable } from "@/components/heartbeat/HeartbeatTable"
import { GlobalHeartbeatCard } from "@/components/heartbeat/GlobalHeartbeatCard"
import { useHeartbeatAgents, useHeartbeatDefaults } from "@/hooks/use-heartbeat"

export function HeartbeatsPage() {
  const { agents, isLoading } = useHeartbeatAgents()
  const { refetch } = useHeartbeatDefaults()

  const enabledCount = agents.filter((a) => a.heartbeat.enabled && (a.heartbeat.everyMs ?? 0) > 0).length

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
      <HeartbeatTable agents={agents} />
    </PageContent>
  )
}
