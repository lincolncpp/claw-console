export interface AgentEntry {
  id: string
  name?: string
  isDefault?: boolean
  model?: string
  workspace?: string
  channels?: string[]
  thinkingDefault?: string
  timeoutSeconds?: number
  maxConcurrent?: number
  memorySearchEnabled?: boolean
  fallbacks?: string[]
  compactionMode?: string
  subagentsMaxConcurrent?: number
  subagentsModel?: string
}

export interface AgentsListResponse {
  defaultId: string
  mainKey: string
  scope: string
  agents: AgentEntry[]
}

export interface ModelEntry {
  id: string
  name: string
  provider: string
  contextWindow?: number
  reasoning?: boolean
  input?: string[]
}

export interface ModelsListResponse {
  models: ModelEntry[]
}

export interface ToolEntry {
  name: string
  description?: string
  source?: string
  enabled?: boolean
}

export interface ToolsCatalogResponse {
  tools: ToolEntry[]
}

export interface SkillEntry {
  id: string
  name: string
  status?: string
  version?: string
}

export interface SkillsStatusResponse {
  skills: SkillEntry[]
}

export interface ConfigGetResponse {
  path: string
  exists: boolean
  raw: string
  parsed?: ParsedConfig
  hash?: string
}

export interface ConfigAgentEntry {
  id: string
  name?: string
  workspace?: string
  model?: string
  thinkingDefault?: string
  timeoutSeconds?: number
  maxConcurrent?: number
  memorySearch?: { enabled?: boolean }
}

export interface ConfigBinding {
  agentId: string
  match?: { channel?: string }
}

export interface GlobalConfig {
  toolExecSecurity?: string
  toolAskMode?: string
  cronMaxConcurrentRuns?: number
}

export interface ParsedConfig {
  agents?: {
    defaults?: {
      workspace?: string
      model?: { primary?: string; fallbacks?: string[] }
      thinkingDefault?: string
      timeoutSeconds?: number
      maxConcurrent?: number
      memorySearch?: { enabled?: boolean }
      compaction?: { mode?: string }
      subagents?: { maxConcurrent?: number; model?: string }
    }
    list?: ConfigAgentEntry[]
  }
  bindings?: ConfigBinding[]
  tools?: { exec?: { security?: string; ask?: string } }
  cron?: {
    maxConcurrentRuns?: number
    sessionRetention?: string | false
    runLog?: {
      maxBytes?: string
      keepLines?: number
    }
  }
}
