import type { CronSchedule } from "@/types/cron"

export function formatAge(ms: number, options?: { suffix?: boolean }): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return options?.suffix ? `${s}s ago` : `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return options?.suffix ? `${m}m ago` : `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return options?.suffix ? `${h}h ago` : `${h}h`
  const d = Math.floor(h / 24)
  return options?.suffix ? `${d}d ago` : `${d}d`
}

export function formatTimeAgo(epochMs: number | undefined): string {
  if (!epochMs) return "--"
  const s = Math.floor((Date.now() - epochMs) / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function formatSchedule(schedule: CronSchedule): string {
  switch (schedule.kind) {
    case "cron":
      return schedule.expr + (schedule.tz ? ` (${schedule.tz})` : "")
    case "every": {
      const ms = schedule.everyMs
      if (ms < 60_000) return `Every ${ms / 1000}s`
      if (ms < 3_600_000) return `Every ${ms / 60_000}m`
      if (ms < 86_400_000) return `Every ${ms / 3_600_000}h`
      return `Every ${ms / 86_400_000}d`
    }
    case "at":
      return `Once at ${new Date(schedule.atMs).toLocaleString()}`
    default:
      return "Unknown"
  }
}

export function formatUptime(ms: number, connectedAt: number): string {
  const totalMs = ms + (Date.now() - connectedAt)
  const seconds = Math.floor(totalMs / 1000)
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(" ")
}

export function formatTokens(n?: number): string {
  if (n == null) return "--"
  return n.toLocaleString()
}

export function formatTokensCompact(n?: number): string {
  if (n == null) return "--"
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`
  return String(n)
}
