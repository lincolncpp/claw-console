import type { CronRun } from "@/types/cron"

export const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ok: "default",
  success: "default",
  running: "secondary",
  error: "destructive",
  failed: "destructive",
  timeout: "destructive",
}

export const toolStatusVariants: Record<string, "default" | "secondary" | "destructive"> = {
  success: "default",
  running: "secondary",
  error: "destructive",
}

type CostClass = "cheap" | "neutral" | "expensive"

export const costBadgeProps: Record<
  CostClass,
  { variant: "default" | "secondary" | "destructive"; className?: string }
> = {
  cheap: {
    variant: "default",
    className: "bg-status-success-muted text-status-success border-transparent",
  },
  neutral: { variant: "secondary" },
  expensive: { variant: "destructive" },
}

export type TokenLevel = "low" | "medium" | "high"

export const tokenLevelBadgeProps: Record<
  TokenLevel,
  { label: string; variant: "default" | "secondary" | "destructive"; className?: string }
> = {
  low: {
    label: "Low",
    variant: "secondary",
    className: "bg-blue-500/15 text-blue-500 border-transparent",
  },
  medium: {
    label: "Medium",
    variant: "secondary",
    className: "bg-yellow-500/15 text-yellow-600 border-transparent",
  },
  high: {
    label: "High 🔥",
    variant: "destructive",
  },
}

export function classifyTokenConsumption(totalTokens: number | undefined): TokenLevel {
  if (totalTokens == null) return "low"
  if (totalTokens < 20_000) return "low"
  if (totalTokens < 80_000) return "medium"
  return "high"
}

export function classifyCost(run: CronRun, allRuns: CronRun[]): CostClass {
  const thisTotal = run.usage?.total_tokens
  if (thisTotal == null) return "neutral"

  const totals = allRuns.map((r) => r.usage?.total_tokens).filter((t): t is number => t != null)

  if (totals.length < 2) return "neutral"

  const avg = totals.reduce((sum, t) => sum + t, 0) / totals.length
  if (avg === 0) return "neutral"

  const ratio = thisTotal / avg
  if (ratio <= 0.5) return "cheap"
  if (ratio >= 2.0) return "expensive"
  return "neutral"
}
