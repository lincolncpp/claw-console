export interface AgentHeartbeatStatus {
  enabled: boolean
  every: string
  everyMs: number | null
  prompt: string
  target: string
  model?: string
  ackMaxChars: number
}

export interface HeartbeatAgentEntry {
  agentId: string
  name?: string
  isDefault: boolean
  heartbeat: AgentHeartbeatStatus
}

export interface HeartbeatConfig {
  every?: string
  model?: string
  target?: string
  prompt?: string
  session?: string
  to?: string
  directPolicy?: string
  lightContext?: boolean
  isolatedSession?: boolean
  includeReasoning?: boolean
  includeSystemPromptSection?: boolean
  ackMaxChars?: number
  suppressToolErrorWarnings?: boolean
}
