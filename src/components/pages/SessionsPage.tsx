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
import { useRpc } from "@/hooks/use-rpc"
import { gatewayWs } from "@/services/gateway-ws"
import { MessageSquare, Loader2 } from "lucide-react"
import { useState } from "react"
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
  const { data, loading, scopeError } = useRpc(() => gatewayWs.sessionsList(), [])

  if (scopeError) return <ScopeMessage />

  const sessions: SessionEntry[] = data?.sessions ?? []
  const filtered = filter
    ? sessions.filter((s) => s.key.toLowerCase().includes(filter.toLowerCase()))
    : sessions

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
        <Input
          placeholder="Filter sessions..."
          value={filter}
          onChange={(e) => setFilter((e.target as HTMLInputElement).value)}
          className="w-64"
        />
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
                      <span className="font-mono text-xs text-muted-foreground truncate block max-w-[400px]">
                        {session.key}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {session.age != null ? formatAge(session.age) : "--"}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No sessions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
