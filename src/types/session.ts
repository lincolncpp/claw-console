export interface SessionEntry {
  key: string
  agentId?: string
  updatedAt?: number
  age?: number
  messageCount?: number
  model?: string
  label?: string
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
