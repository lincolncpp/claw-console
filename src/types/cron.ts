export type ScheduleType = "cron" | "every" | "at"

export type CronSchedule =
  | { type: "cron"; expr: string; tz?: string }
  | { type: "every"; everyMs: number }
  | { type: "at"; atMs: number }

export interface CronJob {
  jobId: string
  jobName: string
  description?: string
  enabled: boolean
  sessionTarget: "main" | "isolated"
  schedule: CronSchedule
  payload?: Record<string, unknown>
  wakeMode?: string
  deleteAfterRun?: boolean
  lastRun?: CronRun
}

export interface CronRun {
  runId: string
  jobId: string
  startedAt: number
  finishedAt?: number
  durationMs?: number
  status: "running" | "success" | "failed" | "timeout"
  exitCode?: number
  error?: string
}
