import { useCallback, useEffect, useRef } from "react"
import { useTerminalStore } from "@/stores/terminal-store"
import { useGatewayStore } from "@/stores/gateway-store"
import { useSystemStore } from "@/stores/system-store"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { gatewayWs } from "@/services/gateway-ws"
import { formatRpcError } from "@/lib/errors"
import { parseChatHistory, serverHasNewerMessages } from "@/lib/chat-history"
import { ChatMessage } from "./ChatMessage"
import { ToolCard } from "./ToolCard"
import { ChatInput } from "./ChatInput"
import { X, GripHorizontal } from "lucide-react"
import type { ChatMessageData } from "@/types/terminal"
import { uuid } from "@/lib/uuid"

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
        const msgs = parseChatHistory(resp)
        if (msgs) useTerminalStore.getState().setMessages(msgs)
      })
      .catch((err) => {
        addToast(`Failed to load chat history: ${formatRpcError(err)}`)
      })
  }, [isOpen, agentId, sessionKey, addToast])

  // Always poll chat history every 1s while panel is open to catch missed WS events.
  useEffect(() => {
    if (!isOpen || !sessionKey) return
    let active = true

    const POLL_INTERVAL = 1000 // 1s — always fetch terminal data

    const poll = () => {
      if (!active) return

      gatewayWs
        .chatHistory(sessionKey)
        .then((resp) => {
          if (!active) return
          const serverMsgs = parseChatHistory(resp)
          if (!serverMsgs) return

          const { runState: currentRs, messages: nowMsgs } = useTerminalStore.getState()
          if (!serverHasNewerMessages(serverMsgs, nowMsgs)) return

          useTerminalStore.getState().setMessages(serverMsgs)
          // Reset streaming UI if we were actively waiting/streaming
          if (currentRs === "waiting" || currentRs === "streaming") {
            useTerminalStore.getState().resetStreaming()
          }
        })
        .catch((err) => {
          console.warn("Chat history poll failed:", err)
        })
    }

    const interval = setInterval(poll, POLL_INTERVAL)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [isOpen, sessionKey])

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
        useTerminalStore.getState().setRunState("error")
        appendMessage({
          id: uuid(),
          role: "system",
          content: `Failed to send message: ${err.message}`,
          timestamp: Date.now(),
          isError: true,
        })
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
