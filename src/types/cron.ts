export type ScheduleKind = "cron" | "every" | "at"

export type CronSchedule =
  | { kind: "cron"; expr: string; tz?: string }
  | { kind: "every"; everyMs: number; anchorMs?: number }
  | { kind: "at"; atMs: number }

export interface CronJobState {
  lastRunAtMs?: number
  lastRunStatus?: string
  lastStatus?: string
  lastDurationMs?: number
  lastDeliveryStatus?: string
  consecutiveErrors?: number
  lastDelivered?: boolean
  nextRunAtMs?: number
  runningAtMs?: number
}

export interface CronJobDelivery {
  mode?: string
  channel?: string
  to?: string
}

export interface CronJob {
  id: string
  agentId?: string
  name: string
  enabled: boolean
  createdAtMs?: number
  updatedAtMs?: number
  sessionTarget: string
  schedule: CronSchedule
  wakeMode?: string
  payload?: Record<string, unknown>
  delivery?: CronJobDelivery
  state?: CronJobState
}

export interface CronRunUsage {
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
}

export interface CronRun {
  ts: number
  jobId: string
  action?: string
  status: string
  summary?: string
  runAtMs: number
  durationMs?: number
  nextRunAtMs?: number
  model?: string
  provider?: string
  usage?: CronRunUsage
  delivered?: boolean
  deliveryStatus?: string
  sessionId?: string
  sessionKey?: string
}

export interface CronRunsResponse {
  entries: CronRun[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
  nextOffset?: number
}
