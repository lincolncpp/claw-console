import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageLoading } from "@/components/shared/LoadingSpinner"
import { PageContent } from "@/components/shared/PageContent"
import { PageHeader } from "@/components/shared/PageHeader"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { useApprovals } from "@/hooks/use-approvals"
import { useApprovalConfig, type ApprovalConfig } from "@/hooks/use-approval-config"
import { Settings, ShieldCheck, TriangleAlert } from "lucide-react"

function ApprovalSettingsDialog({
  open,
  onClose,
  config,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  config: ApprovalConfig
  onSaved: () => void
}) {
  const { updateApprovalConfig } = useApprovalConfig()

  const [toolSecurity, setToolSecurity] = useState(config.security ?? "")
  const [toolAsk, setToolAsk] = useState(config.askMode ?? "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateApprovalConfig({ security: toolSecurity, ask: toolAsk === "off" ? null : toolAsk })
      onSaved()
      onClose()
    } catch {
      // error toast handled by updateApprovalConfig
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Approval Settings</DialogTitle>
          <DialogDescription>
            Configure tool execution security and approval behavior.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Tool Exec Security</label>
            <select
              value={toolSecurity}
              onChange={(e) => setToolSecurity(e.target.value)}
              className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"
            >
              <option value="deny">deny</option>
              <option value="full">full</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Tool Ask Mode</label>
            <select
              value={toolAsk}
              onChange={(e) => setToolAsk(e.target.value)}
              className="h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"
            >
              <option value="off">off</option>
              <option value="on-miss">on-miss</option>
              <option value="always">always</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <div className="flex items-center gap-1.5 text-xs text-warning mr-auto">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
            <span>Saving restarts the gateway</span>
          </div>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ApprovalsPage() {
  const { approvals, isLoading, error, scopeError } = useApprovals()
  const { approvalConfig, refetch } = useApprovalConfig()
  const [dialogOpen, setDialogOpen] = useState(false)

  if (scopeError) return <EmptyState scope="operator.admin" icon={ShieldCheck} title="" />

  if (error) {
    return (
      <PageContent>
        <PageHeader
          breadcrumbs={[{ label: "Approvals" }]}
          subtitle="Pending tool execution approval requests"
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-status-error">Failed to load approvals: {error.message}</p>
          </CardContent>
        </Card>
      </PageContent>
    )
  }

  if (isLoading) return <PageLoading />

  const settingsRows = [
    { label: "Tool Exec Security", value: approvalConfig.security ?? "—" },
    { label: "Tool Ask Mode", value: approvalConfig.askMode ?? "—" },
  ]

  return (
    <PageContent>
      <PageHeader
        breadcrumbs={[{ label: "Approvals" }]}
        subtitle="Pending tool execution approval requests"
      />

      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">Approval Settings</p>
            <Button variant="outline" size="xs" onClick={() => setDialogOpen(true)}>
              <Settings className="h-3 w-3 mr-1" />
              Edit Settings
            </Button>
          </div>
          <div className="space-y-0">
            {settingsRows.map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0 text-sm"
              >
                <span className="text-muted-foreground text-xs">{row.label}</span>
                <span className="font-mono text-xs tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {dialogOpen && (
        <ApprovalSettingsDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          config={approvalConfig}
          onSaved={refetch}
        />
      )}

      {approvals.length === 0 ? (
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
    </PageContent>
  )
}
