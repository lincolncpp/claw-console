import { useState } from "react"
import { Link } from "react-router-dom"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eraser, Trash2 } from "lucide-react"
import { formatTimeAgo } from "@/lib/format"
import { TokenBadge } from "@/components/shared/TokenBadge"
import { extractAgentId, extractSessionType } from "@/lib/session-utils"
import { LoadingBlock } from "@/components/shared/LoadingSpinner"
import { TableFooter } from "@/components/shared/TableFooter"
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog"
import { SessionKeyButton } from "@/components/shared/SessionKeyButton"
import type { SessionEntry } from "@/types/session"

interface SessionsTableProps {
  sessions: SessionEntry[]
  agentNameMap: Map<string, string>
  deleteSession: (key: string) => Promise<void>
  isLoading: boolean
  emptyMessage?: string
  maxRows?: number
  hideAgentColumn?: boolean
  cleanup?: (days: number) => Promise<number | void>
  cleaning?: boolean
}

export function SessionsTable({
  sessions,
  agentNameMap,
  deleteSession,
  isLoading,
  emptyMessage = "No sessions found.",
  maxRows = 100,
  hideAgentColumn,
  cleanup,
  cleaning,
}: SessionsTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [cleanupOpen, setCleanupOpen] = useState(false)
  const [cleanupDays, setCleanupDays] = useState("30")

  if (isLoading) return <LoadingBlock />

  if (sessions.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyMessage}</p>
  }

  const handleCleanup = () => {
    const days = parseInt(cleanupDays, 10)
    if (isNaN(days) || days < 1 || !cleanup) return
    cleanup(days)
      .then(() => setCleanupOpen(false))
      .catch(() => {})
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            {!hideAgentColumn && <TableHead>Agent</TableHead>}
            <TableHead>Type</TableHead>
            <TableHead>Total Tokens</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Session Key</TableHead>
            <TableHead className="text-right">Last Active</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.slice(0, maxRows).map((session) => (
            <TableRow key={session.key} className="hover:bg-muted/50">
              {!hideAgentColumn && (
                <TableCell className="text-sm">
                  <Link
                    to={`/agents/${extractAgentId(session.key)}`}
                    className="text-foreground hover:underline"
                  >
                    {agentNameMap.get(extractAgentId(session.key)) ?? extractAgentId(session.key)}
                  </Link>
                </TableCell>
              )}
              <TableCell className="text-sm text-muted-foreground">
                {extractSessionType(session.key)}
              </TableCell>
              <TableCell>
                <TokenBadge tokens={session.totalTokens} />
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {session.model ?? "--"}
              </TableCell>
              <TableCell>
                <SessionKeyButton agentId={extractAgentId(session.key)} sessionKey={session.key} />
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground">
                {formatTimeAgo(session.updatedAt)}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon-xs" onClick={() => setDeleteTarget(session.key)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {cleanup && (
        <TableFooter className="justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCleanupOpen(true)}
            disabled={cleaning}
          >
            <Eraser className="h-3 w-3 mr-1" />
            Cleanup Stale
          </Button>
        </TableFooter>
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteSession(deleteTarget!)}
        targetLabel={deleteTarget ?? ""}
      />

      {cleanup && (
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
      )}
    </>
  )
}
