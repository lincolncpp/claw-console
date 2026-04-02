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
  id: string
  label: string
  description?: string
  source?: string
  defaultProfiles?: string[]
}

export interface ToolGroup {
  id: string
  label: string
  source?: string
  tools: ToolEntry[]
}

export interface ToolProfile {
  id: string
  label: string
}

export interface ToolsCatalogResponse {
  agentId?: string
  profiles?: ToolProfile[]
  groups: ToolGroup[]
}

export interface SkillRequirements {
  bins: string[]
  anyBins: string[]
  env: string[]
  config: string[]
  os: string[]
}

export interface SkillInstallOption {
  id: string
  kind: string
  label: string
  bins?: string[]
}

export interface SkillEntry {
  name: string
  description?: string
  source?: string
  bundled?: boolean
  filePath?: string
  baseDir?: string
  skillKey?: string
  emoji?: string
  homepage?: string
  always?: boolean
  disabled?: boolean
  blockedByAllowlist?: boolean
  eligible?: boolean
  primaryEnv?: string
  requirements?: SkillRequirements
  missing?: SkillRequirements
  configChecks?: unknown[]
  install?: SkillInstallOption[]
}

export interface SkillsStatusResponse {
  workspaceDir?: string
  managedSkillsDir?: string
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
  model?: string | { primary?: string; fallbacks?: string[] }
  thinkingDefault?: string
  timeoutSeconds?: number
  maxConcurrent?: number
  memorySearch?: { enabled?: boolean }
  compaction?: { mode?: string }
  subagents?: { maxConcurrent?: number; model?: string }
  tools?: { profile?: string; allow?: string[]; deny?: string[] }
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
  tools?: { exec?: { security?: string; ask?: string }; allow?: string[]; deny?: string[] }
  cron?: {
    maxConcurrentRuns?: number
    sessionRetention?: string | false
    runLog?: {
      maxBytes?: string
      keepLines?: number
    }
  }
}
