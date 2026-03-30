export interface ChannelHealth {
  configured: boolean
  running: boolean
  lastError: string | null
  probe?: {
    ok: boolean
    elapsedMs: number
    bot?: { id: string; username: string }
  }
}

export interface AgentHealth {
  agentId: string
  name?: string
  isDefault: boolean
  sessions: { count: number }
}

export interface HealthPayload {
  ok: boolean
  ts: number
  durationMs: number
  channels: Record<string, ChannelHealth>
  channelOrder: string[]
  channelLabels: Record<string, string>
  agents: AgentHealth[]
  sessions: { count: number }
}

export interface ConnectSnapshot {
  health: HealthPayload
  uptimeMs: number
  updateAvailable?: {
    currentVersion: string
    latestVersion: string
    channel: string
  }
}

export interface ConnectResult {
  type: string
  protocol: number
  server: { version: string; connId: string }
  snapshot: ConnectSnapshot
}

export interface HealthResponse {
  status: "ok" | "degraded" | "error"
  timestamp: string
}

export interface StatusResponse {
  gateway: string
  status: string
  version?: string
}
