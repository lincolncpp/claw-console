import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { useRpc } from "@/hooks/use-rpc"
import { useSessionsRefresh } from "@/hooks/use-sessions-refresh"
import { gatewayWs } from "@/services/gateway-ws"
import { MessageSquare, Loader2, Trash2, Eraser } from "lucide-react"
import { useState } from "react"
import { useTerminalStore } from "@/stores/terminal-store"
import type { SessionEntry } from "@/types/session"

function formatAge(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

function extractAgentId(key: string): string {
  const parts = key.split(":")
  return parts[1] ?? "unknown"
}

function extractSessionType(key: string): string {
  const parts = key.split(":")
  return parts[2] ?? "session"
}

function ScopeMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <MessageSquare className="h-8 w-8 mb-3 opacity-50" />
      <p className="text-sm">
        Requires <code className="bg-muted px-1.5 py-0.5 rounded text-xs">operator.read</code> scope
      </p>
      <p className="text-xs mt-1 opacity-70">
        Update your gateway token configuration to enable this section.
      </p>
    </div>
  )
}

export function SessionsPage() {
  const [filter, setFilter] = useState("")
  const { data, loading, scopeError, refetch } = useRpc(() => gatewayWs.sessionsList(), [])

  useSessionsRefresh(refetch)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Cleanup state
  const [cleanupOpen, setCleanupOpen] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [cleanupDays, setCleanupDays] = useState("30")

  if (scopeError) return <ScopeMessage />

  const sessions: SessionEntry[] = data?.sessions ?? []
  const filtered = filter
    ? sessions.filter((s) => s.key.toLowerCase().includes(filter.toLowerCase()))
    : sessions

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await gatewayWs.sessionsDelete(deleteTarget)
      refetch()
    } catch {
      // ignore
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const handleCleanup = async () => {
    const days = parseInt(cleanupDays, 10)
    if (isNaN(days) || days < 1) return
    const maxAgeMs = days * 24 * 60 * 60 * 1000
    const stale = sessions.filter((s) => {
      const age = s.age ?? (s.updatedAt != null ? Date.now() - s.updatedAt : null)
      return age != null && age > maxAgeMs
    })
    if (stale.length === 0) {
      setCleanupOpen(false)
      return
    }
    setCleaning(true)
    try {
      for (const s of stale) {
        await gatewayWs.sessionsDelete(s.key)
      }
      refetch()
    } catch {
      // ignore
    } finally {
      setCleaning(false)
      setCleanupOpen(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Sessions</h2>
          {data && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {data.count} total across all agents
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="sr-only">Session List</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Session Key</TableHead>
                  <TableHead className="text-right">Age</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map((session) => (
                  <TableRow key={session.key}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {extractAgentId(session.key)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {extractSessionType(session.key)}
                    </TableCell>
                    <TableCell>
                      <button
                        className="font-mono text-xs text-muted-foreground truncate block max-w-[400px] hover:text-foreground hover:underline cursor-pointer text-left"
                        onClick={() => {
                          useTerminalStore
                            .getState()
                            .setSession(extractAgentId(session.key), session.key)
                          useTerminalStore.getState().open()
                        }}
                      >
                        {session.key}
                      </button>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {session.age != null
                        ? formatAge(session.age)
                        : session.updatedAt != null
                          ? formatAge(Date.now() - session.updatedAt)
                          : "--"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeleteTarget(session.key)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No sessions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Permanently delete this session? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <p className="font-mono text-xs text-muted-foreground break-all">{deleteTarget}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
