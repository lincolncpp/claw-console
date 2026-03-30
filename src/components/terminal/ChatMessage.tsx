import type { ChatMessageData } from "@/types/terminal"

const roleColors: Record<string, string> = {
  user: "text-violet-400",
  assistant: "text-green-400",
  system: "text-zinc-500",
}

const roleLabels: Record<string, string> = {
  user: "you",
  assistant: "assistant",
  system: "system",
}

function renderContent(content: string): string {
  return content
    .replace(/```[\s\S]*?```/g, (m) => {
      const inner = m.slice(3, -3).replace(/^\w*\n/, "")
      return `<pre class="bg-zinc-900 rounded px-2 py-1 my-1 overflow-x-auto"><code>${escapeHtml(inner)}</code></pre>`
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
  return (
    <div className="flex gap-3 items-start px-2 py-0.5 hover:bg-white/[0.02] rounded">
      <span
        className={`shrink-0 w-14 text-right text-[11px] font-mono pt-px ${roleColors[message.role] ?? "text-zinc-500"}`}
      >
        {roleLabels[message.role] ?? message.role}
      </span>
      <div
        className="text-[13px] font-mono text-foreground/90 break-words min-w-0 leading-5"
        dangerouslySetInnerHTML={{ __html: renderContent(message.content) }}
      />
    </div>
  )
}
