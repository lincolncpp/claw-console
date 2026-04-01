import { useCallback, useEffect, useRef } from "react"
import { useTerminalStore } from "@/stores/terminal-store"
import { useGatewayStore } from "@/stores/gateway-store"
import { useSystemStore } from "@/stores/system-store"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { gatewayWs } from "@/services/gateway-ws"
import { formatRpcError } from "@/lib/errors"
import { ChatMessage } from "./ChatMessage"
import { ToolCard } from "./ToolCard"
import { ChatInput } from "./ChatInput"
import { X, GripHorizontal } from "lucide-react"
import type { ChatMessageData, ToolCallData } from "@/types/terminal"
import { uuid } from "@/lib/uuid"

const MIN_HEIGHT = 120
const MAX_HEIGHT_RATIO = 0.6

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
  const addToast = useErrorToastStore((s) => s.addToast)

  const agentLabel = useSystemStore(
    (s) => s.agents.find((a) => a.agentId === agentId)?.name ?? agentId ?? "agent",
  )

  const connectionStatus = useGatewayStore((s) => s.connectionStatus)
  const connected = connectionStatus === "connected"

  const bottomRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScrollRef.current) {
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView())
    }
  }, [messages, streamingText, runState])

  useEffect(() => {
    if (!isOpen || !agentId || !sessionKey) return
    gatewayWs
      .chatHistory(sessionKey)
      .then((resp) => {
        const data = resp as {
          messages?: Array<{ id?: string; role?: string; content?: unknown; timestamp?: number }>
        }
        if (!data.messages?.length) return
        const { setMessages } = useTerminalStore.getState()
        setMessages(
          data.messages
            .filter((m) => m.role !== "toolResult")
            .map((m) => ({
              id: m.id ?? uuid(),
              role: (m.role as "user" | "assistant" | "system") ?? "system",
              content: m.content as string,
              timestamp: m.timestamp ?? Date.now(),
              toolCalls: extractToolCalls(m.content),
            })),
        )
      })
      .catch((err) => {
        addToast(`Failed to load chat history: ${formatRpcError(err)}`)
      })
  }, [isOpen, agentId, sessionKey, addToast])

  // Poll chat history as fallback when WS events stall (covers both "waiting" and "streaming")
  useEffect(() => {
    if ((runState !== "waiting" && runState !== "streaming") || !sessionKey) return
    let active = true

    const WAITING_INITIAL_DELAY = 1500
    const WAITING_INTERVAL = 3000
    const STREAMING_STALE_THRESHOLD = 8000
    const STREAMING_POLL_INTERVAL = 5000

    const poll = () => {
      if (!active) return
      const { runState: rs, messages: currentMsgs, lastEventAt } = useTerminalStore.getState()

      if (rs === "streaming") {
        if (Date.now() - lastEventAt < STREAMING_STALE_THRESHOLD) return
      } else if (rs !== "waiting") {
        return
      }

      gatewayWs
        .chatHistory(sessionKey)
        .then((resp) => {
          if (!active) return
          const data = resp as {
            messages?: Array<{ id?: string; role?: string; content?: unknown; timestamp?: number }>
          }
          if (!data.messages?.length) return

          const { runState: currentRs, messages: nowMsgs } = useTerminalStore.getState()
          if (currentRs !== "waiting" && currentRs !== "streaming") return

          const serverMsgs = data.messages.filter((m) => m.role !== "toolResult")
          if (serverMsgs.length <= nowMsgs.length) return

          useTerminalStore.getState().setMessages(
            serverMsgs.map((m) => ({
              id: m.id ?? uuid(),
              role: (m.role as "user" | "assistant" | "system") ?? "system",
              content: m.content as string,
              timestamp: m.timestamp ?? Date.now(),
              toolCalls: extractToolCalls(m.content),
            })),
          )
          if (currentRs === "streaming") {
            useTerminalStore.getState().resetStreaming()
          } else {
            useTerminalStore.getState().setRunState("idle")
          }
        })
        .catch((err) => {
          console.warn("Chat history poll failed:", err)
        })
    }

    const initialDelay = runState === "waiting" ? WAITING_INITIAL_DELAY : STREAMING_STALE_THRESHOLD
    const pollInterval = runState === "waiting" ? WAITING_INTERVAL : STREAMING_POLL_INTERVAL

    const initial = setTimeout(poll, initialDelay)
    const interval = setInterval(poll, pollInterval)

    return () => {
      active = false
      clearTimeout(initial)
      clearInterval(interval)
    }
  }, [runState, sessionKey])

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

  const handleSend = useCallback(
    (text: string) => {
      if (!agentId || !sessionKey) return
      const userMsg: ChatMessageData = {
        id: uuid(),
        role: "user",
        content: text,
        timestamp: Date.now(),
      }
      appendMessage(userMsg)
      useTerminalStore.getState().setRunState("waiting")
      gatewayWs.chatSend(sessionKey, text).catch((err: Error) => {
        const { runState: currentState } = useTerminalStore.getState()
        if (currentState === "waiting" || currentState === "error") {
          useTerminalStore.getState().setRunState("error")
          appendMessage({
            id: uuid(),
            role: "system",
            content: `Failed to send message: ${err.message}`,
            timestamp: Date.now(),
          })
        } else {
          console.warn("chatSend RPC failed after streaming started:", err.message)
        }
      })
    },
    [agentId, sessionKey, appendMessage],
  )

  if (!isOpen) return null

  const statusColor =
    runState === "streaming" || runState === "waiting"
      ? "text-status-warning"
      : runState === "error"
        ? "text-status-error"
        : "text-status-success"
  const statusDot =
    runState === "streaming" || runState === "waiting"
      ? "bg-status-warning"
      : runState === "error"
        ? "bg-status-error"
        : "bg-status-success"
  const statusLabel = runState === "waiting" ? "thinking" : runState

  return (
    <div
      ref={panelRef}
      className="flex flex-col border-t-2 border-border bg-terminal-bg"
      style={{ height: panelHeight }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center h-1.5 cursor-ns-resize hover:bg-muted/50 transition-colors"
        onMouseDown={handleDragStart}
      >
        <GripHorizontal className="h-3 w-3 text-muted-foreground/40" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-3 h-8 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5 text-xs">
          <span className="font-medium text-foreground">Terminal</span>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-muted-foreground">
            agent: <span className="text-primary">{agentId ?? "none"}</span>
          </span>
          <span className="text-muted-foreground/40">|</span>
          <span className="text-muted-foreground">
            session: <span className="text-primary">{sessionKey ?? "none"}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
          <span className={`text-[0.625rem] ${statusColor}`}>{statusLabel}</span>
          <button
            type="button"
            onClick={close}
            className="text-muted-foreground/50 hover:text-foreground transition-colors ml-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Chat log */}
      <div
        className="flex-1 min-h-0 overflow-y-auto py-2 font-mono text-sm"
        onScroll={(e) => {
          const el = e.currentTarget
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30
          autoScrollRef.current = atBottom
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
            <ChatMessage message={msg} agentName={agentLabel} />
            {msg.toolCalls?.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        ))}
        {streamingToolCall && <ToolCard tool={streamingToolCall} />}
        {streamingText != null && (
          <div className="flex gap-3 items-start px-2 py-0.5">
            <span className="shrink-0 w-20 text-right text-[0.6875rem] font-mono pt-px truncate text-status-success">
              {agentLabel}
            </span>
            <span className="text-[0.8125rem] font-mono text-foreground/90 break-words min-w-0 leading-5">
              {streamingText}
              <span className="animate-pulse text-primary">▋</span>
            </span>
          </div>
        )}
        {runState === "waiting" && streamingText == null && (
          <div className="flex gap-3 items-start px-2 py-0.5">
            <span className="shrink-0 w-20 text-right text-[0.6875rem] font-mono pt-px truncate text-status-success">
              {agentLabel}
            </span>
            <span className="text-[0.8125rem] font-mono text-muted-foreground/60 flex items-center gap-1.5">
              <span className="inline-flex gap-1">
                <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                <span className="w-1 h-1 rounded-full bg-current animate-pulse [animation-delay:200ms]" />
                <span className="w-1 h-1 rounded-full bg-current animate-pulse [animation-delay:400ms]" />
              </span>
              <span className="text-[0.75rem]">Thinking…</span>
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={
          !connected ||
          !agentId ||
          !sessionKey ||
          runState === "waiting" ||
          runState === "streaming"
        }
        placeholder={
          runState === "waiting"
            ? "Agent is thinking…"
            : runState === "streaming"
              ? "Agent is responding…"
              : undefined
        }
      />
    </div>
  )
}
