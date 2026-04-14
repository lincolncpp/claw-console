import { SafeMarkdown } from "@/components/shared/SafeMarkdown"
import type { ChatMessageData } from "@/types/terminal"

const roleColors: Record<string, string> = {
  user: "text-primary",
  assistant: "text-status-success",
  system: "text-muted-foreground",
  toolResult: "text-muted-foreground",
}

const roleLabels: Record<string, string> = {
  user: "you",
  assistant: "assistant",
  system: "system",
  toolResult: "tool",
}

interface ContentBlock {
  type?: string
  text?: string
  thinking?: string
  content?: string
  name?: string
  arguments?: unknown
  id?: string
}

function extractContent(content: unknown): { thinking: string; text: string } {
  if (typeof content === "string") return { thinking: "", text: content }
  if (!Array.isArray(content)) return { thinking: "", text: String(content ?? "") }

  const thinkingParts: string[] = []
  const textParts: string[] = []

  for (const block of content as ContentBlock[]) {
    if (typeof block === "string") {
      textParts.push(block)
    } else if (block?.type === "thinking" && block.thinking) {
      thinkingParts.push(block.thinking)
    } else if (block?.type === "text" && block.text) {
      textParts.push(block.text)
    } else if (block?.text) {
      textParts.push(block.text)
    } else if (block?.content) {
      textParts.push(String(block.content))
    }
  }

  return {
    thinking: thinkingParts.join("\n"),
    text: textParts.join("\n"),
  }
}

export function ChatMessage({
  message,
  agentName,
}: {
  message: ChatMessageData
  agentName?: string
}) {
  const { thinking, text } = extractContent(message.content)

  if (!text && !thinking) return null

  const isError = message.isError === true

  return (
    <div
      className={`flex gap-3 items-start px-2 py-0.5 rounded ${isError ? "bg-status-error/5" : "hover:bg-white/[0.02]"}`}
    >
      <span
        className={`shrink-0 w-20 text-right text-[0.6875rem] font-mono pt-px ${isError ? "text-status-error" : (roleColors[message.role] ?? "text-muted-foreground")}`}
      >
        {isError
          ? "error"
          : message.role === "assistant" && agentName
            ? agentName
            : (roleLabels[message.role] ?? message.role)}
      </span>
      <div
        className={`text-[0.8125rem] font-mono break-words min-w-0 leading-5 [&_pre]:bg-muted [&_pre]:rounded [&_pre]:px-2 [&_pre]:py-1 [&_pre]:my-1 [&_pre]:overflow-x-auto [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_p]:my-0 ${isError ? "text-status-error/90" : "text-foreground/90"}`}
      >
        {thinking && (
          <details className="mb-1">
            <summary className="text-[0.6875rem] text-muted-foreground/60 cursor-pointer select-none hover:text-muted-foreground transition-colors">
              Thinking
            </summary>
            <div className="mt-1 pl-2 border-l border-muted-foreground/20 text-muted-foreground/50 text-[0.75rem]">
              <SafeMarkdown>{thinking}</SafeMarkdown>
            </div>
          </details>
        )}
        {text && <SafeMarkdown>{text}</SafeMarkdown>}
      </div>
    </div>
  )
}
