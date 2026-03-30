export interface ChatMessageData {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: number
  toolCalls?: ToolCallData[]
}

export interface ToolCallData {
  id: string
  name: string
  args: unknown
  result?: unknown
  status: "running" | "success" | "error"
  durationMs?: number
}
