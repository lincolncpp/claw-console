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
import { MessageSquare, Trash2, Eraser } from "lucide-react"
import { useState } from "react"
import { formatTimeAgo, formatTokensCompact } from "@/lib/format"
import { classifyTokenConsumption, tokenLevelBadgeProps } from "@/lib/status"
import { extractAgentId, extractSessionType } from "@/lib/session-utils"
import { ScopeMessage } from "@/components/shared/ScopeMessage"
import { LoadingBlock } from "@/components/shared/LoadingSpinner"
import { PageHeader } from "@/components/shared/PageHeader"
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog"
import { SessionKeyButton } from "@/components/shared/SessionKeyButton"
import { useSessions, useSessionDelete, useSessionCleanup } from "@/hooks/use-sessions"

export function SessionsPage() {
  const [filter, setFilter] = useState("")
  const { sessions, count, isLoading, scopeError, refetch } = useSessions()
  const { deleteSession } = useSessionDelete(refetch)
  const { cleanup, cleaning } = useSessionCleanup(sessions, refetch)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // Cleanup state
  const [cleanupOpen, setCleanupOpen] = useState(false)
  const [cleanupDays, setCleanupDays] = useState("30")

  if (scopeError) return <ScopeMessage scope="operator.read" icon={MessageSquare} />

  const filtered = filter
    ? sessions.filter((s) => s.key.toLowerCase().includes(filter.toLowerCase()))
    : sessions

  const handleCleanup = async () => {
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
        subtitle={count > 0 ? `${count} total across all agents` : undefined}
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-medium">Session List</CardTitle>
          </div>
          <span className="text-xs text-muted-foreground">
            {filtered.length} session{filtered.length !== 1 ? "s" : ""}
          </span>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <LoadingBlock />
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No sessions found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Total Tokens</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Session Key</TableHead>
                  <TableHead className="text-right">Last Active</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 100).map((session) => (
                  <TableRow key={session.key} className="hover:bg-muted/50">
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {extractAgentId(session.key)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {extractSessionType(session.key)}
                    </TableCell>
                    <TableCell>
                      {session.totalTokens != null ? (
                        <span className="flex items-center gap-1.5 text-sm">
                          <span className="text-muted-foreground">{formatTokensCompact(session.totalTokens)}</span>
                          {(() => {
                            const level = classifyTokenConsumption(session.totalTokens)
                            const props = tokenLevelBadgeProps[level]
                            return (
                              <Badge variant={props.variant} className={props.className}>
                                {props.label}
                              </Badge>
                            )
                          })()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {session.model ?? "--"}
                    </TableCell>
                    <TableCell>
                      <SessionKeyButton
                        agentId={extractAgentId(session.key)}
                        sessionKey={session.key}
                      />
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatTimeAgo(session.updatedAt)}
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
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteSession(deleteTarget!)}
        targetLabel={deleteTarget ?? ""}
      />

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
