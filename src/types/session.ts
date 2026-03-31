export interface SessionEntry {
  key: string
  agentId?: string
  updatedAt?: number
  age?: number
  messageCount?: number
  model?: string
  label?: string
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  contextTokens?: number
}

export interface SessionsListResponse {
  ts: number
  count: number
  path?: string
  defaults?: {
    modelProvider?: string
    model?: string
    contextTokens?: number
  }
  sessions: SessionEntry[]
}

export interface SessionDeleteResponse {
  ok: boolean
  key: string
}

export interface SessionsCleanupResponse {
  ok: boolean
  removed: number
}
