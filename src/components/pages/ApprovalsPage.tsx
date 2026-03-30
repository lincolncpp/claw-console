import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRpc } from "@/hooks/use-rpc"
import { gatewayWs } from "@/services/gateway-ws"
import { ShieldCheck, Loader2 } from "lucide-react"

function ScopeMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <ShieldCheck className="h-8 w-8 mb-3 opacity-50" />
      <p className="text-sm">
        Requires <code className="bg-muted px-1.5 py-0.5 rounded text-xs">operator.admin</code>{" "}
        scope
      </p>
      <p className="text-xs mt-1 opacity-70">
        Update your gateway token configuration to enable this section.
      </p>
    </div>
  )
}

export function ApprovalsPage() {
  const { data, loading, scopeError } = useRpc(() => gatewayWs.execApprovalsGet(), [])

  if (scopeError) return <ScopeMessage />

  // The approvals response shape varies — handle both formats
  const approvals = Array.isArray(data)
    ? data
    : data && typeof data === "object" && "approvals" in (data as Record<string, unknown>)
      ? (data as Record<string, unknown[]>).approvals
      : []

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Approvals</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pending tool execution approval requests
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : approvals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldCheck className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">No pending approvals</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval: Record<string, unknown>, i: number) => (
            <Card key={(approval.id as string) ?? i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Badge
                    variant={
                      approval.status === "pending"
                        ? "secondary"
                        : approval.status === "approved"
                          ? "default"
                          : "destructive"
                    }
                    className="text-[10px]"
                  >
                    {String(approval.status ?? "pending")}
                  </Badge>
                  <span className="truncate">
                    {String(
                      approval.tool ??
                        approval.action ??
                        approval.description ??
                        "Approval Request",
                    )}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground space-y-1">
                  {approval.description != null && (
                    <p className="truncate">{String(approval.description)}</p>
                  )}
                  {approval.sessionKey != null && (
                    <p className="font-mono truncate">{String(approval.sessionKey)}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
