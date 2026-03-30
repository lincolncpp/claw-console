export interface SystemInfo {
  cpu: number
  memory: { used: number; total: number }
  disk: { used: number; total: number }
  swap?: { used: number; total: number }
  uptime: number
  pid: number
  version: string
  gateway: string
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
