export interface LogLine {
  raw: string
  timestamp?: string
  level?: "debug" | "info" | "warn" | "error"
  subsystem?: string
  message?: string
}

export interface LogsTailResponse {
  file: string
  cursor: number
  size: number
  lines: string[]
}
