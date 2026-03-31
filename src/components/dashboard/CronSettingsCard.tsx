import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useCronConfig } from "@/hooks/use-cron-config"
import { CronSettingsDialog } from "./CronSettingsDialog"

function formatRetention(value: string | false | undefined): string {
  if (value === false) return "Disabled"
  return value ?? "—"
}

export function CronSettingsCard() {
  const { cronConfig } = useCronConfig()
  const [dialogOpen, setDialogOpen] = useState(false)

  const rows = [
    { label: "Session Retention", value: formatRetention(cronConfig.sessionRetention) },
    { label: "Max Concurrent Runs", value: cronConfig.maxConcurrentRuns != null ? String(cronConfig.maxConcurrentRuns) : "—" },
    { label: "Run Log Max Size", value: cronConfig.runLog?.maxBytes ?? "—" },
    { label: "Run Log Keep Lines", value: cronConfig.runLog?.keepLines != null ? String(cronConfig.runLog.keepLines) : "—" },
  ]

  return (
    <>
      <Card className="flex-1">
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">Cron Settings</p>
            <Button variant="outline" size="xs" onClick={() => setDialogOpen(true)}>
              Edit
            </Button>
          </div>
          <div className="space-y-0">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 text-sm"
              >
                <span className="text-muted-foreground text-xs">{row.label}</span>
                <span className="font-mono text-xs tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <CronSettingsDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  )
}
