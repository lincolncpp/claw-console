import { useMemo, useState } from "react"
import { PageContent } from "@/components/shared/PageContent"
import { PageHeader } from "@/components/shared/PageHeader"
import { HeartbeatTable } from "@/components/heartbeat/HeartbeatTable"
import { GlobalHeartbeatCard } from "@/components/heartbeat/GlobalHeartbeatCard"
import { NewHeartbeatDialog } from "@/components/heartbeat/NewHeartbeatDialog"
import { useHeartbeatAgents, useHeartbeatDefaults } from "@/hooks/use-heartbeat"
import { useConfig } from "@/hooks/use-config"

export function HeartbeatsPage() {
  const { agents, isLoading } = useHeartbeatAgents()
  const { refetch } = useHeartbeatDefaults()
  const { parsed } = useConfig()

  const sessionMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const a of (parsed?.agents?.list ?? []) as { id?: string; heartbeat?: { session?: string } }[]) {
      if (a.id && a.heartbeat?.session) map[a.id] = a.heartbeat.session
    }
    return map
  }, [parsed])
  const [newOpen, setNewOpen] = useState(false)

  const activeCount = agents.filter((a) => (a.heartbeat.everyMs ?? 0) > 0).length

  const handleSaved = () => {
    refetch()
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
            ? `${activeCount} of ${agents.length} agent${agents.length !== 1 ? "s" : ""} with heartbeat active`
            : undefined
        }
      />
      <GlobalHeartbeatCard onConfigChanged={refetch} />
      <HeartbeatTable agents={agents} sessionMap={sessionMap} onNewHeartbeat={() => setNewOpen(true)} />
      <NewHeartbeatDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onSaved={handleSaved}
      />
    </PageContent>
  )
}
