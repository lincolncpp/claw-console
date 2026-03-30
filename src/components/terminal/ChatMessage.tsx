import type { ChatMessageData } from "@/types/terminal"

const roleColors: Record<string, string> = {
  user: "text-violet-400",
  assistant: "text-green-400",
  system: "text-zinc-500",
  toolResult: "text-zinc-500",
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

/** Extract displayable text from a content field (string or content-block array). */
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
    // Skip toolCall and toolResult blocks — those are rendered as ToolCards
  }
  return parts.join("\n")
}

function renderContent(content: unknown): string {
  const text = extractText(content)
  if (!text) return ""
  return escapeHtml(text)
    .replace(/```([\s\S]*?)```/g, (_m, inner) => {
      const code = inner.replace(/^\w*\n/, "")
      return `<pre class="bg-zinc-900 rounded px-2 py-1 my-1 overflow-x-auto"><code>${code}</code></pre>`
    })
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-800 px-1 rounded text-xs">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>")
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function ChatMessage({ message }: { message: ChatMessageData }) {
  const html = renderContent(message.content)

  // Don't render empty messages (e.g. assistant messages that only had tool calls)
  if (!html && !message.toolCalls?.length) return null

  return (
    <div className="flex gap-3 items-start px-2 py-0.5 hover:bg-white/[0.02] rounded">
      <span
        className={`shrink-0 w-14 text-right text-[11px] font-mono pt-px ${roleColors[message.role] ?? "text-zinc-500"}`}
      >
        {roleLabels[message.role] ?? message.role}
      </span>
      {html ? (
        <div
          className="text-[13px] font-mono text-foreground/90 break-words min-w-0 leading-5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="text-[13px] font-mono text-muted-foreground/50 min-w-0 leading-5">
          (tool calls)
        </div>
      )}
    </div>
  )
}
