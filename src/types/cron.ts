export type ScheduleKind = "cron" | "every" | "at"

export type CronSchedule =
  | { kind: "cron"; expr: string; tz?: string; staggerMs?: number }
  | { kind: "every"; everyMs: number; anchorMs?: number }
  | { kind: "at"; at: string }

export type CronPayloadKind = "agentTurn" | "systemEvent" | "command"

// The gateway requires payload.kind to be explicit: "systemEvent" carries
// `text` (main session), "agentTurn" carries `message` (+ model overrides),
// "command" carries `argv`. Fields are kept flat here so callers can read a
// job's payload without narrowing.
export interface CronJobPayload {
  kind?: CronPayloadKind
  message?: string
  text?: string
  model?: string | null
  thinking?: string
  timeoutSeconds?: number
  argv?: string[]
  [key: string]: unknown
}

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
  // null is the explicit "clear this field" signal in cron.update patches
  channel?: string | null
  to?: string | null
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
  payload?: CronJobPayload
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
