export interface AgentEntry {
  id: string
  name?: string
  isDefault?: boolean
  model?: string
  workspace?: string
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
