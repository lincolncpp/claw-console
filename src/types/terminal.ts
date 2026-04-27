export interface ChatMessageData {
  id: string
  role: "user" | "assistant" | "system"
  /**
   * String for locally-authored messages (user input, system notices) and for
   * finalized streamed text; an array of content blocks (text, thinking,
   * toolCall, ...) when sourced from the gateway's chat.history payload.
   */
  content: unknown
  timestamp: number
  toolCalls?: ToolCallData[]
  isError?: boolean
}

export interface ToolCallData {
  id: string
  name: string
  args: unknown
  result?: unknown
  status: "running" | "success" | "error"
  durationMs?: number
}
