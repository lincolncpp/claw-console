import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TriangleAlert } from "lucide-react"
import { useCronConfig, type CronConfig } from "@/hooks/use-cron-config"

interface CronSettingsDialogProps {
  open: boolean
  onClose: () => void
}

export function CronSettingsDialog({ open, onClose }: CronSettingsDialogProps) {
  const { cronConfig, updateCronConfig } = useCronConfig()

  const [retention, setRetention] = useState(
    cronConfig.sessionRetention === false ? "" : (cronConfig.sessionRetention ?? ""),
  )
  const [maxConcurrent, setMaxConcurrent] = useState(String(cronConfig.maxConcurrentRuns ?? ""))
  const [maxBytes, setMaxBytes] = useState(cronConfig.runLog?.maxBytes ?? "")
  const [keepLines, setKeepLines] = useState(String(cronConfig.runLog?.keepLines ?? ""))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const patch: Partial<CronConfig> = {}
      if (retention) patch.sessionRetention = retention
      if (maxConcurrent) patch.maxConcurrentRuns = parseInt(maxConcurrent, 10)
      if (maxBytes || keepLines) {
        patch.runLog = {}
        if (maxBytes) patch.runLog.maxBytes = maxBytes
        if (keepLines) patch.runLog.keepLines = parseInt(keepLines, 10)
      }
      await updateCronConfig(patch)
      onClose()
    } catch {
      // error toast handled by updateCronConfig
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cron Settings</DialogTitle>
          <DialogDescription>Update global cron scheduler configuration.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Session Retention</label>
            <Input
              placeholder="e.g. 24h, 1h, 10m"
              value={retention}
              onChange={(e) => setRetention((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Max Concurrent Runs</label>
            <Input
              type="number"
              min="1"
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Run Log Max Size</label>
            <Input
              placeholder="e.g. 2mb, 500kb"
              value={maxBytes}
              onChange={(e) => setMaxBytes((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Run Log Keep Lines</label>
            <Input
              type="number"
              min="1"
              value={keepLines}
              onChange={(e) => setKeepLines((e.target as HTMLInputElement).value)}
            />
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
