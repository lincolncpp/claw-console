export interface PresenceEntry {
  host: string
  ip: string
  version?: string
  platform?: string
  deviceFamily?: string
  mode?: string
  reason?: string
  roles?: string[]
  ts?: number
  text?: string
}

export interface NodeEntry {
  nodeId: string
  host: string
  ip?: string
  version?: string
  platform?: string
  mode?: string
  connectedAt?: number
}

export interface NodeListResponse {
  ts: number
  nodes: NodeEntry[]
}
