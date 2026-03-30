import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSystemStore } from "@/stores/system-store"
import { Cpu, HardDrive, MemoryStick } from "lucide-react"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-2 w-full rounded-full bg-secondary ${className}`}>
      <div
        className="h-full rounded-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function SystemHealth() {
  const { cpu, memoryUsed, memoryTotal, diskUsed, diskTotal } = useSystemStore()

  const memoryPercent = memoryUsed != null && memoryTotal ? (memoryUsed / memoryTotal) * 100 : 0
  const diskPercent = diskUsed != null && diskTotal ? (diskUsed / diskTotal) * 100 : 0

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">CPU</CardTitle>
          <Cpu className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {cpu != null ? `${cpu.toFixed(1)}%` : "--"}
          </div>
          <ProgressBar value={cpu ?? 0} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Memory</CardTitle>
          <MemoryStick className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {memoryUsed != null ? `${memoryPercent.toFixed(1)}%` : "--"}
          </div>
          {memoryUsed != null && memoryTotal != null && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatBytes(memoryUsed)} / {formatBytes(memoryTotal)}
            </p>
          )}
          <ProgressBar value={memoryPercent} className="mt-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Disk</CardTitle>
          <HardDrive className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {diskUsed != null ? `${diskPercent.toFixed(1)}%` : "--"}
          </div>
          {diskUsed != null && diskTotal != null && (
            <p className="text-xs text-muted-foreground mt-1">
              {formatBytes(diskUsed)} / {formatBytes(diskTotal)}
            </p>
          )}
          <ProgressBar value={diskPercent} className="mt-2" />
        </CardContent>
      </Card>
    </div>
  )
}
