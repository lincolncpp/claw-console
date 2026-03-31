import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Eraser, MessageSquare } from "lucide-react"
import { useState } from "react"
import { extractSessionType } from "@/lib/session-utils"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageHeader } from "@/components/shared/PageHeader"
import { SessionsTable } from "@/components/shared/SessionsTable"
import { useSessions, useSessionDelete, useSessionCleanup } from "@/hooks/use-sessions"
import { useAgents } from "@/hooks/use-agents"

export function SessionsPage() {
  const [filter, setFilter] = useState("")
  const { sessions, isLoading, scopeError, refetch } = useSessions()
  const { deleteSession } = useSessionDelete(refetch)
  const { cleanup, cleaning } = useSessionCleanup(sessions, refetch)
  const { agents } = useAgents()

  const agentNameMap = new Map(agents.map((a) => [a.id, a.name ?? a.id]))

  // Cleanup state
  const [cleanupOpen, setCleanupOpen] = useState(false)
  const [cleanupDays, setCleanupDays] = useState("30")

  if (scopeError) return <EmptyState scope="operator.read" icon={MessageSquare} title="" />

  const nonCron = sessions.filter((s) => extractSessionType(s.key) !== "cron")

  const filtered = filter
    ? nonCron.filter((s) => s.key.toLowerCase().includes(filter.toLowerCase()))
    : nonCron

  const handleCleanup = () => {
    const days = parseInt(cleanupDays, 10)
    if (isNaN(days) || days < 1) return
    cleanup(days)
      .then(() => setCleanupOpen(false))
      .catch(() => {}) // hook already toasts errors
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sessions"
        subtitle={nonCron.length > 0 ? `${nonCron.length} total across all agents` : undefined}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCleanupOpen(true)}
              disabled={cleaning}
            >
              <Eraser className="h-3 w-3 mr-1" />
              Cleanup Stale
            </Button>
            <Input
              placeholder="Filter sessions..."
              value={filter}
              onChange={(e) => setFilter((e.target as HTMLInputElement).value)}
              className="w-64"
            />
          </>
        }
      />

      <Card>
        <CardContent>
          <SessionsTable
            sessions={filtered}
            agentNameMap={agentNameMap}
            deleteSession={deleteSession}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Cleanup confirmation dialog */}
      <Dialog
        open={cleanupOpen}
        onOpenChange={(open) => {
          if (!open) setCleanupOpen(false)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cleanup Stale Sessions</DialogTitle>
            <DialogDescription>
              Remove sessions older than the specified number of days. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Older than</span>
            <Input
              type="number"
              min="1"
              value={cleanupDays}
              onChange={(e) => setCleanupDays((e.target as HTMLInputElement).value)}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCleanupOpen(false)} disabled={cleaning}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleCleanup} disabled={cleaning}>
              {cleaning ? "Cleaning..." : "Cleanup"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
