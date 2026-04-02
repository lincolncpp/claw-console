import type { ChatMessageData, ToolCallData } from "@/types/terminal"
import { uuid } from "@/lib/uuid"

function extractToolCalls(content: unknown): ToolCallData[] | undefined {
  if (!Array.isArray(content)) return undefined
  const tools: ToolCallData[] = []
  for (const block of content) {
    if (block && typeof block === "object" && block.type === "toolCall") {
      tools.push({
        id: block.id ?? uuid(),
        name: block.name ?? "unknown",
        args: block.arguments ?? block.args,
        status: "success",
      })
    }
  }
  return tools.length > 0 ? tools : undefined
}

/**
 * Parse a raw chat history response into ChatMessageData[],
 * filtering out toolResult messages.
 * Returns null if the response contains no messages.
 */
export function parseChatHistory(resp: unknown): ChatMessageData[] | null {
  const data = resp as {
    messages?: Array<{ id?: string; role?: string; content?: unknown; timestamp?: number }>
  }
  if (!data.messages?.length) return null

  return data.messages
    .filter((m) => m.role !== "toolResult")
    .map((m) => ({
      id: m.id ?? uuid(),
      role: (m.role as "user" | "assistant" | "system") ?? "system",
      content: m.content as string,
      timestamp: m.timestamp ?? Date.now(),
      toolCalls: extractToolCalls(m.content),
    }))
}

/**
 * Check if server messages have newer content than local messages.
 * Compares both count AND content of the last assistant message,
 * so we detect updates even when completeToolCall() inflated the local count.
 */
export function serverHasNewerMessages(
  serverMsgs: ChatMessageData[],
  localMsgs: ChatMessageData[],
): boolean {
  if (serverMsgs.length > localMsgs.length) return true

  if (serverMsgs.length === 0) return false

  // Same count — check if the server's last assistant message has content
  // that our local version doesn't (e.g. tool-only local msg vs full server response)
  const lastServer = serverMsgs[serverMsgs.length - 1]
  const lastLocal = localMsgs[localMsgs.length - 1]

  if (
    lastServer.role === "assistant" &&
    lastLocal?.role === "assistant" &&
    typeof lastServer.content === "string" &&
    lastServer.content.length > 0 &&
    (!lastLocal.content || lastLocal.content.length === 0)
  ) {
    return true
  }

  return false
}
