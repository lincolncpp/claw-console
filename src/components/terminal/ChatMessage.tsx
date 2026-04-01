import ReactMarkdown from "react-markdown"
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

function extractText(content: unknown): string {
  if (typeof content === "string") return content
  if (!Array.isArray(content)) return String(content ?? "")

  const parts: string[] = []
  for (const block of content as ContentBlock[]) {
    if (typeof block === "string") {
      parts.push(block)
    } else if (block?.type === "text" && block.text) {
      parts.push(block.text)
    } else if (block?.type === "thinking" && block.thinking) {
      parts.push(block.thinking)
    } else if (block?.text) {
      parts.push(block.text)
    } else if (block?.content) {
      parts.push(String(block.content))
    }
  }
  return parts.join("\n")
}

export function ChatMessage({
  message,
  agentName,
}: {
  message: ChatMessageData
  agentName?: string
}) {
  const text = extractText(message.content)

  if (!text && !message.toolCalls?.length) return null

  return (
    <div className="flex gap-3 items-start px-2 py-0.5 hover:bg-white/[0.02] rounded">
      <span
        className={`shrink-0 w-14 text-right text-[0.6875rem] font-mono pt-px ${roleColors[message.role] ?? "text-muted-foreground"}`}
      >
        {message.role === "assistant" && agentName
          ? agentName
          : (roleLabels[message.role] ?? message.role)}
      </span>
      {text ? (
        <div className="text-[0.8125rem] font-mono text-foreground/90 break-words min-w-0 leading-5 [&_pre]:bg-muted [&_pre]:rounded [&_pre]:px-2 [&_pre]:py-1 [&_pre]:my-1 [&_pre]:overflow-x-auto [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_p]:my-0">
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      ) : (
        <div className="text-[0.8125rem] font-mono text-muted-foreground/50 min-w-0 leading-5">
          (tool calls)
        </div>
      )}
    </div>
  )
}
