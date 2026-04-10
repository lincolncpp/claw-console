import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import { useHeartbeatDefaults } from "@/hooks/use-heartbeat"
import { HeartbeatDefaultsDialog } from "./HeartbeatDefaultsDialog"

interface GlobalHeartbeatCardProps {
  onConfigChanged?: () => void
}

export function GlobalHeartbeatCard({ onConfigChanged }: GlobalHeartbeatCardProps) {
  const { defaults, refetch: refetchDefaults } = useHeartbeatDefaults()
  const [dialogOpen, setDialogOpen] = useState(false)

  const ackTooltip =
    "Replies under this length containing HEARTBEAT_OK are suppressed. Longer replies are delivered as alerts."

  const rows = [
    { label: "Interval", value: defaults.every ?? "30m" },
    { label: "Target", value: defaults.target ?? "none" },
    { label: "Model", value: defaults.model ?? "Use agent model" },
    {
      label: "Ack Max Chars",
      value: defaults.ackMaxChars != null ? String(defaults.ackMaxChars) : "300",
      tooltip: ackTooltip,
    },
    { label: "Session", value: defaults.session ?? "main" },
  ]

  return (
    <>
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold">Heartbeat Defaults</p>
              <p className="text-xs text-muted-foreground">
                Default settings applied to all agents
              </p>
            </div>
            <Button variant="outline" size="xs" onClick={() => setDialogOpen(true)}>
              Edit Defaults
            </Button>
          </div>
          <div className="space-y-0 border-t border-border/50 pt-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 text-sm"
              >
                <span className="text-muted-foreground text-xs inline-flex items-center gap-1">
                  {row.label}
                  {row.tooltip && (
                    <Tooltip>
                      <TooltipTrigger
                        render={<Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />}
                      />
                      <TooltipContent>{row.tooltip}</TooltipContent>
                    </Tooltip>
                  )}
                </span>
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
          onSaved={() => {
            refetchDefaults()
            onConfigChanged?.()
          }}
          currentDefaults={defaults}
        />
      )}
    </>
  )
}
