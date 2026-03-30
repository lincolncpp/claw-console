import { useCallback, useEffect, useRef } from "react"
import { useTerminalStore } from "@/stores/terminal-store"
import { useGatewayStore } from "@/stores/gateway-store"
import { gatewayWs } from "@/services/gateway-ws"
import { ChatMessage } from "./ChatMessage"
import { ToolCard } from "./ToolCard"
import { ChatInput } from "./ChatInput"
import { X, GripHorizontal } from "lucide-react"
import type { ChatMessageData } from "@/types/terminal"

const MIN_HEIGHT = 120
const MAX_HEIGHT_RATIO = 0.6

export function TerminalPanel() {
  const isOpen = useTerminalStore((s) => s.isOpen)
  const panelHeight = useTerminalStore((s) => s.panelHeight)
  const messages = useTerminalStore((s) => s.messages)
  const streamingText = useTerminalStore((s) => s.streamingText)
  const streamingToolCall = useTerminalStore((s) => s.streamingToolCall)
  const runState = useTerminalStore((s) => s.runState)
  const agentId = useTerminalStore((s) => s.agentId)
  const sessionKey = useTerminalStore((s) => s.sessionKey)
  const close = useTerminalStore((s) => s.close)
  const setPanelHeight = useTerminalStore((s) => s.setPanelHeight)
  const appendMessage = useTerminalStore((s) => s.appendMessage)

  const connectionStatus = useGatewayStore((s) => s.connectionStatus)
  const connected = connectionStatus === "connected"

  const bottomRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)
  const panelRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (autoScrollRef.current) {
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView())
    }
  }, [messages, streamingText])

  // Drag resize
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const startY = e.clientY
      const startH = panelHeight

      const onMove = (ev: MouseEvent) => {
        const maxH = window.innerHeight * MAX_HEIGHT_RATIO
        const newH = Math.min(maxH, Math.max(MIN_HEIGHT, startH + (startY - ev.clientY)))
        setPanelHeight(newH)
      }
      const onUp = () => {
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
      }
      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    },
    [panelHeight, setPanelHeight],
  )

  // Send message
  const handleSend = useCallback(
    (text: string) => {
      if (!agentId || !sessionKey) return
      const userMsg: ChatMessageData = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      }
      appendMessage(userMsg)
      gatewayWs.chatSend(agentId, sessionKey, text).catch(() => {
        appendMessage({
          id: crypto.randomUUID(),
          role: "system",
          content: "Failed to send message.",
          timestamp: Date.now(),
        })
      })
    },
    [agentId, sessionKey, appendMessage],
  )

  if (!isOpen) return null

  const statusColor =
    runState === "streaming"
      ? "text-amber-400"
      : runState === "error"
        ? "text-red-400"
        : "text-green-400"
  const statusDot =
    runState === "streaming" ? "bg-amber-400" : runState === "error" ? "bg-red-400" : "bg-green-400"

  return (
    <div
      ref={panelRef}
      className="flex flex-col border-t-2 border-zinc-700 bg-[#111]"
      style={{ height: panelHeight }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center h-1.5 cursor-ns-resize hover:bg-zinc-700/50 transition-colors"
        onMouseDown={handleDragStart}
      >
        <GripHorizontal className="h-3 w-3 text-zinc-600" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 h-8 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5 text-xs">
          <span className="font-medium text-foreground">Terminal</span>
          <span className="text-zinc-600">|</span>
          <span className="text-muted-foreground">
            agent: <span className="text-violet-400">{agentId ?? "none"}</span>
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-muted-foreground">
            session: <span className="text-violet-400">{sessionKey ?? "none"}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
          <span className={`text-[10px] ${statusColor}`}>{runState}</span>
          <button
            type="button"
            onClick={close}
            className="text-zinc-500 hover:text-foreground transition-colors ml-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Chat log */}
      <div
        className="flex-1 overflow-y-auto py-2 font-mono text-sm"
        onScroll={() => {
          autoScrollRef.current = false
        }}
      >
        {messages.length === 0 && !streamingText && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            {agentId
              ? "No messages yet. Type below to start."
              : "Select an agent and session to begin."}
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id}>
            <ChatMessage message={msg} />
            {msg.toolCalls?.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        ))}
        {streamingToolCall && <ToolCard tool={streamingToolCall} />}
        {streamingText != null && (
          <div className="flex gap-3 items-start px-2 py-0.5">
            <span className="shrink-0 w-14 text-right text-[11px] font-mono pt-px text-green-400">
              assistant
            </span>
            <span className="text-[13px] font-mono text-foreground/90 break-words min-w-0 leading-5">
              {streamingText}
              <span className="animate-pulse text-violet-400">▋</span>
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={!connected || !agentId || !sessionKey} />
    </div>
  )
}
