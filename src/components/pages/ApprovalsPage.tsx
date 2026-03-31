import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScopeMessage } from "@/components/shared/ScopeMessage"
import { LoadingBlock } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { useApprovals } from "@/hooks/use-approvals"
import { ShieldCheck } from "lucide-react"

export function ApprovalsPage() {
  const { approvals, isLoading, error, scopeError } = useApprovals()

  if (scopeError) return <ScopeMessage scope="operator.admin" icon={ShieldCheck} />

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title="Approvals" subtitle="Pending tool execution approval requests" />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-status-error">Failed to load approvals: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Approvals" subtitle="Pending tool execution approval requests" />

      {isLoading ? (
        <LoadingBlock />
      ) : approvals.length === 0 ? (
        <Card>
          <CardContent className="py-0">
            <EmptyState icon={ShieldCheck} title="No pending approvals" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval: Record<string, unknown>, i: number) => (
            <Card key={(approval.id as string) ?? i}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <StatusBadge
                    status={String(approval.status ?? "pending")}
                    className="text-[0.625rem]"
                  />
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
