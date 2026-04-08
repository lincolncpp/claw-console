import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useHeartbeatDefaults, useGlobalHeartbeatToggle } from "@/hooks/use-heartbeat"
import { HeartbeatDefaultsDialog } from "./HeartbeatDefaultsDialog"

interface GlobalHeartbeatCardProps {
  globalEnabled: boolean
  onConfigChanged?: () => void
}

export function GlobalHeartbeatCard({ globalEnabled, onConfigChanged }: GlobalHeartbeatCardProps) {
  const { defaults, refetch: refetchDefaults } = useHeartbeatDefaults()
  const { toggle } = useGlobalHeartbeatToggle()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [enabled, setEnabled] = useState(globalEnabled)

  const handleToggle = async () => {
    const newEnabled = !enabled
    setEnabled(newEnabled)
    try {
      await toggle(newEnabled)
    } catch {
      setEnabled(enabled)
    }
  }

  const rows = [
    { label: "Interval", value: defaults.every ?? "30m" },
    { label: "Target", value: defaults.target ?? "none" },
    { label: "Model", value: defaults.model ?? "inherited" },
    { label: "Ack Max Chars", value: defaults.ackMaxChars != null ? String(defaults.ackMaxChars) : "300" },
    { label: "Session", value: defaults.session ?? "main" },
  ]

  return (
    <>
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold">Global Heartbeat</p>
              <p className="text-xs text-muted-foreground">
                Master toggle and default settings for all agents
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 cursor-pointer" onClick={handleToggle}>
                <Switch checked={enabled} className="pointer-events-none" />
                <span className="text-xs text-muted-foreground">
                  {enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
              <Button variant="outline" size="xs" onClick={() => setDialogOpen(true)}>
                Edit Defaults
              </Button>
            </div>
          </div>
          <div className="space-y-0 border-t border-border/50 pt-2">
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
      {dialogOpen && (
        <HeartbeatDefaultsDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSaved={() => { refetchDefaults(); onConfigChanged?.() }}
          currentDefaults={defaults}
        />
      )}
    </>
  )
}
