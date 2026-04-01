import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare } from "lucide-react"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageContent } from "@/components/shared/PageContent"
import { PageHeader } from "@/components/shared/PageHeader"
import { SessionsTable } from "@/components/shared/SessionsTable"
import { NewSessionDialog } from "@/components/pages/NewSessionDialog"
import { useSessions, useSessionDelete, useSessionCleanup } from "@/hooks/use-sessions"
import { useAgents } from "@/hooks/use-agents"
import { PageLoading } from "@/components/shared/LoadingSpinner"

export function SessionsPage() {
  const { sessions, isLoading, scopeError, refetch } = useSessions()
  const { deleteSession } = useSessionDelete(refetch)
  const { cleanup, cleaning } = useSessionCleanup(sessions, refetch)
  const { agents, defaultId } = useAgents()
  const [newSessionOpen, setNewSessionOpen] = useState(false)

  const agentNameMap = new Map(agents.map((a) => [a.id, a.name ?? a.id]))

  if (scopeError) return <EmptyState scope="operator.read" icon={MessageSquare} title="" />
  if (isLoading) return <PageLoading />

  return (
    <PageContent>
      <PageHeader
        breadcrumbs={[{ label: "Sessions" }]}
        subtitle={sessions.length > 0 ? `${sessions.length} total across all agents` : undefined}
      />

      <Card>
        <CardContent>
          <SessionsTable
            sessions={sessions}
            agentNameMap={agentNameMap}
            deleteSession={deleteSession}
            isLoading={isLoading}
            cleanup={cleanup}
            cleaning={cleaning}
            onNewSession={() => setNewSessionOpen(true)}
          />
        </CardContent>
      </Card>

      <NewSessionDialog
        open={newSessionOpen}
        onClose={() => setNewSessionOpen(false)}
        agents={agents}
        defaultId={defaultId}
      />
    </PageContent>
  )
}
