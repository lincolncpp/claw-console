import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { formatTimeAgo } from "@/lib/format"
import { TokenBadge } from "@/components/shared/TokenBadge"
import { extractAgentId, extractSessionType } from "@/lib/session-utils"
import { LoadingBlock } from "@/components/shared/LoadingSpinner"
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
}

export function SessionsTable({
  sessions,
  agentNameMap,
  deleteSession,
  isLoading,
  emptyMessage = "No sessions found.",
  maxRows = 100,
  hideAgentColumn,
}: SessionsTableProps) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  if (isLoading) return <LoadingBlock />

  if (sessions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    )
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
                <TableCell>
                  <Badge variant="outline" className="font-mono text-xs">
                    {agentNameMap.get(extractAgentId(session.key)) ?? extractAgentId(session.key)}
                  </Badge>
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

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteSession(deleteTarget!)}
        targetLabel={deleteTarget ?? ""}
      />
    </>
  )
}
