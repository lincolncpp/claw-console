import type { ChatMessageData, ToolCallData } from "@/types/terminal"
import { uuid } from "@/lib/uuid"

interface ToolBlock {
  type?: string
  id?: string
  name?: string
  toolName?: string
  toolCallId?: string
  tool_use_id?: string
  arguments?: unknown
  args?: unknown
  content?: unknown
  text?: unknown
  output?: unknown
}

/**
 * Collects tool outputs from toolResult messages, keyed by tool call id, so
 * they can be attached to their originating toolCall cards.
 */
function collectToolResults(
  messages: Array<{ role?: string; content?: unknown }>,
): Map<string, unknown> {
  const results = new Map<string, unknown>()
  for (const m of messages) {
    if (m.role !== "toolResult" || !Array.isArray(m.content)) continue
    for (const block of m.content as ToolBlock[]) {
      if (!block || typeof block !== "object" || block.type !== "toolResult") continue
      const key = block.toolCallId ?? block.tool_use_id ?? block.id
      const output = block.text ?? block.content ?? block.output
      if (key && output != null) results.set(key, output)
    }
  }
  return results
}

function extractToolCalls(
  content: unknown,
  toolResults: Map<string, unknown>,
): ToolCallData[] | undefined {
  if (!Array.isArray(content)) return undefined
  const tools: ToolCallData[] = []
  for (const block of content as ToolBlock[]) {
    if (block && typeof block === "object" && block.type === "toolCall") {
      const id = block.id ?? uuid()
      tools.push({
        id,
        name: block.name ?? "unknown",
        args: block.arguments ?? block.args,
        result: block.id != null ? toolResults.get(block.id) : undefined,
        status: "success",
      })
    }
  }
  return tools.length > 0 ? tools : undefined
}

/**
 * Parse a raw chat history response into ChatMessageData[].
 * toolResult messages are folded into their originating toolCall cards
 * (as `result`) rather than rendered as standalone rows.
 * Returns null if the response contains no messages.
 */
export function parseChatHistory(resp: unknown): ChatMessageData[] | null {
  const data = resp as {
    messages?: Array<{ id?: string; role?: string; content?: unknown; timestamp?: number }>
  }
  if (!data.messages?.length) return null

  const toolResults = collectToolResults(data.messages)

  return data.messages
    .filter((m) => m.role !== "toolResult")
    .map((m) => ({
      id: m.id ?? uuid(),
      role: (m.role as "user" | "assistant" | "system") ?? "system",
      content: m.content,
      timestamp: m.timestamp ?? Date.now(),
      toolCalls: extractToolCalls(m.content, toolResults),
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

  const localContent = lastLocal?.content
  const localEmpty =
    localContent == null ||
    (typeof localContent === "string" && localContent.length === 0) ||
    (Array.isArray(localContent) && localContent.length === 0)

  if (
    lastServer.role === "assistant" &&
    lastLocal?.role === "assistant" &&
    typeof lastServer.content === "string" &&
    lastServer.content.length > 0 &&
    localEmpty
  ) {
    return true
  }

  return false
}
