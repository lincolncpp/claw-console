# Terminal Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bottom-docked, resizable terminal panel to the OpenClaw dashboard that provides a chat experience with agents via the gateway WebSocket.

**Architecture:** A `TerminalPanel` component renders below `<main>` in the existing flex layout. It contains a drag handle, header bar, scrollable chat log, and input field. A Zustand store (`terminal-store`) manages panel state, messages, and streaming. New RPC methods on `GatewayWebSocket` handle `chat.send` and session history. Gateway events for chat deltas, tool calls, and message completion are dispatched to the store.

**Tech Stack:** React 19, TypeScript, Zustand, TailwindCSS 4, Lucide icons, existing shadcn UI components (Badge, ScrollArea)

**Spec:** `docs/superpowers/specs/2026-03-30-terminal-panel-design.md`

---

### Task 1: Types — ChatMessageData and ToolCallData

**Files:**
- Create: `src/types/terminal.ts`

- [ ] **Step 1: Create the types file**

```typescript
export interface ChatMessageData {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  timestamp: number
  toolCalls?: ToolCallData[]
}

export interface ToolCallData {
  id: string
  name: string
  args: unknown
  result?: unknown
  status: "running" | "success" | "error"
  durationMs?: number
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run check`
Expected: No errors related to new file

- [ ] **Step 3: Commit**

```bash
git add src/types/terminal.ts
git commit -m "feat(terminal): add ChatMessageData and ToolCallData types"
```

---

### Task 2: Zustand store — terminal-store

**Files:**
- Create: `src/stores/terminal-store.ts`

- [ ] **Step 1: Create the store**

```typescript
import { create } from "zustand"
import type { ChatMessageData, ToolCallData } from "@/types/terminal"

const STORAGE_KEY = "terminal-panel-height"
const DEFAULT_HEIGHT = 240
const MAX_MESSAGES = 500

function loadHeight(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v ? Number(v) : DEFAULT_HEIGHT
  } catch {
    return DEFAULT_HEIGHT
  }
}

export type RunState = "idle" | "streaming" | "error"

interface TerminalState {
  // Panel UI
  isOpen: boolean
  panelHeight: number

  // Session
  agentId: string | null
  sessionKey: string | null

  // Messages
  messages: ChatMessageData[]
  streamingText: string | null
  streamingToolCall: ToolCallData | null

  // Status
  runState: RunState

  // Actions
  open: () => void
  close: () => void
  setPanelHeight: (h: number) => void
  setSession: (agentId: string, sessionKey: string) => void
  appendMessage: (msg: ChatMessageData) => void
  setMessages: (msgs: ChatMessageData[]) => void
  updateStreamingText: (text: string) => void
  updateStreamingToolCall: (tool: ToolCallData) => void
  finalizeStreaming: () => void
  setRunState: (state: RunState) => void
  clearMessages: () => void
}

export const useTerminalStore = create<TerminalState>()((set) => ({
  isOpen: false,
  panelHeight: loadHeight(),

  agentId: null,
  sessionKey: null,

  messages: [],
  streamingText: null,
  streamingToolCall: null,

  runState: "idle",

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  setPanelHeight: (panelHeight) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(panelHeight))
    } catch {
      // ignore
    }
    set({ panelHeight })
  },

  setSession: (agentId, sessionKey) =>
    set({ agentId, sessionKey, messages: [], streamingText: null, streamingToolCall: null, runState: "idle" }),

  appendMessage: (msg) =>
    set((s) => {
      const next = [...s.messages, msg]
      return { messages: next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next }
    }),

  setMessages: (messages) => set({ messages }),

  updateStreamingText: (streamingText) => set({ streamingText, runState: "streaming" }),

  updateStreamingToolCall: (streamingToolCall) => set({ streamingToolCall, runState: "streaming" }),

  finalizeStreaming: () =>
    set((s) => {
      const msgs = [...s.messages]
      if (s.streamingText != null) {
        msgs.push({
          id: crypto.randomUUID(),
          role: "assistant",
          content: s.streamingText,
          timestamp: Date.now(),
        })
      }
      return {
        messages: msgs.length > MAX_MESSAGES ? msgs.slice(-MAX_MESSAGES) : msgs,
        streamingText: null,
        streamingToolCall: null,
        runState: "idle",
      }
    }),

  setRunState: (runState) => set({ runState }),

  clearMessages: () => set({ messages: [], streamingText: null, streamingToolCall: null, runState: "idle" }),
}))
```

- [ ] **Step 2: Verify build passes**

Run: `npm run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/stores/terminal-store.ts
git commit -m "feat(terminal): add Zustand terminal-store for panel state"
```

---

### Task 3: Gateway WS — chatSend and sessionHistory RPCs

**Files:**
- Modify: `src/services/gateway-ws.ts`

- [ ] **Step 1: Add chatSend and sessionHistory methods to GatewayWebSocket class**

Add these methods after the existing `// --- Approvals RPCs ---` section (after line 131):

```typescript
  // --- Chat RPCs ---
  async chatSend(agentId: string, session: string, body: string): Promise<unknown> {
    return this.sendRpc("chat.send", { agentId, session, body })
  }
  async sessionHistory(agentId: string, session: string, limit = 200): Promise<unknown> {
    return this.sendRpc("sessions.history", { agentId, session, limit })
  }
```

- [ ] **Step 2: Add chat event cases to setupEventDispatch**

Add three new handler fields to the `EventDispatchHandlers` interface:

```typescript
export interface EventDispatchHandlers {
  onHealth: (data: HealthPayload) => void
  onConnect: (data: ConnectResult) => void
  onCron: () => void
  onSessionsChanged: () => void
  onPresence: (payload: unknown) => void
  onApprovalRequested: (payload: unknown) => void
  onApprovalResolved: (payload: unknown) => void
  onChatEvent: (event: string, payload: unknown) => void
}
```

Add a default case to the switch in `setupEventDispatch` to forward chat-related events:

```typescript
      default:
        if (event.startsWith("chat.") || event.startsWith("session.")) {
          handlers.onChatEvent(event, payload)
        }
        break
```

- [ ] **Step 3: Verify build passes**

Run: `npm run check`
Expected: Build will fail because App.tsx doesn't pass `onChatEvent` yet — that's expected and will be fixed in Task 7. Verify that `gateway-ws.ts` itself has no type errors by checking the error output only references App.tsx.

- [ ] **Step 4: Commit**

```bash
git add src/services/gateway-ws.ts
git commit -m "feat(terminal): add chatSend, sessionHistory RPCs and chat event dispatch"
```

---

### Task 4: ChatMessage component

**Files:**
- Create: `src/components/terminal/ChatMessage.tsx`

- [ ] **Step 1: Create the component**

```typescript
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
```

- [ ] **Step 2: Verify build passes**

Run: `npm run check`
Expected: PASS (component is standalone, not imported anywhere yet)

- [ ] **Step 3: Commit**

```bash
git add src/components/terminal/ChatMessage.tsx
git commit -m "feat(terminal): add ChatMessage component with inline markdown"
```

---

### Task 5: ToolCard component

**Files:**
- Create: `src/components/terminal/ToolCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, ChevronDown } from "lucide-react"
import type { ToolCallData } from "@/types/terminal"

const statusVariants: Record<string, "default" | "secondary" | "destructive"> = {
  success: "default",
  running: "secondary",
  error: "destructive",
}

export function ToolCard({ tool }: { tool: ToolCallData }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="ml-[68px] my-1 border border-border rounded-md bg-card overflow-hidden" style={{ borderLeft: "2px solid rgb(167 139 250)" }}>
      <button
        type="button"
        className="flex items-center justify-between w-full px-3 py-1.5 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-violet-400" />
          ) : (
            <ChevronRight className="h-3 w-3 text-violet-400" />
          )}
          <span className="text-xs font-mono text-foreground/80">{tool.name}</span>
          <Badge variant={statusVariants[tool.status] ?? "secondary"} className="text-[10px] px-1.5 py-0">
            {tool.status}
          </Badge>
        </div>
        {tool.durationMs != null && (
          <span className="text-[10px] text-muted-foreground">{(tool.durationMs / 1000).toFixed(1)}s</span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-border px-3 py-2 text-xs font-mono space-y-2">
          {tool.args != null && (
            <div>
              <div className="text-muted-foreground text-[10px] mb-1">ARGS</div>
              <pre className="bg-zinc-900 rounded px-2 py-1 overflow-x-auto text-foreground/70 text-[11px]">
                {typeof tool.args === "string" ? tool.args : JSON.stringify(tool.args, null, 2)}
              </pre>
            </div>
          )}
          {tool.result != null && (
            <div>
              <div className="text-muted-foreground text-[10px] mb-1">RESULT</div>
              <pre className="bg-zinc-900 rounded px-2 py-1 overflow-x-auto text-foreground/70 text-[11px]">
                {typeof tool.result === "string" ? tool.result : JSON.stringify(tool.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/terminal/ToolCard.tsx
git commit -m "feat(terminal): add collapsible ToolCard component"
```

---

### Task 6: ChatInput component

**Files:**
- Create: `src/components/terminal/ChatInput.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useState, useRef } from "react"

interface ChatInputProps {
  onSend: (text: string) => void
  disabled: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue("")
  }

  return (
    <div className="flex items-center gap-2 border-t border-border px-3 h-9 bg-transparent">
      <span className="text-violet-400 text-sm font-mono">❯</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            handleSubmit()
          }
        }}
        disabled={disabled}
        placeholder={disabled ? "Disconnected..." : "Type a message... (Enter to send)"}
        className="flex-1 bg-transparent text-[13px] font-mono text-foreground outline-none placeholder:text-muted-foreground/50"
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes**

Run: `npm run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/terminal/ChatInput.tsx
git commit -m "feat(terminal): add ChatInput component"
```

---

### Task 7: TerminalPanel — main shell component with drag resize

**Files:**
- Create: `src/components/terminal/TerminalPanel.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/StatusBar.tsx`

- [ ] **Step 1: Create TerminalPanel**

```typescript
import { useCallback, useEffect, useRef } from "react"
import { useTerminalStore } from "@/stores/terminal-store"
import { useGatewayStore } from "@/stores/gateway-store"
import { gatewayWs } from "@/services/gateway-ws"
import { ChatMessage } from "./ChatMessage"
import { ToolCard } from "./ToolCard"
import { ChatInput } from "./ChatInput"
import { Badge } from "@/components/ui/badge"
import { X, GripHorizontal } from "lucide-react"
import type { ChatMessageData, ToolCallData } from "@/types/terminal"

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

  const statusColor = runState === "streaming" ? "text-amber-400" : runState === "error" ? "text-red-400" : "text-green-400"
  const statusDot = runState === "streaming" ? "bg-amber-400" : runState === "error" ? "bg-red-400" : "bg-green-400"

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
            {agentId ? "No messages yet. Type below to start." : "Select an agent and session to begin."}
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id}>
            <ChatMessage message={msg} />
            {msg.toolCalls?.map((tool) => <ToolCard key={tool.id} tool={tool} />)}
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
```

- [ ] **Step 2: Add TerminalPanel to App.tsx**

In `src/App.tsx`, add the import at the top with the other layout imports:

```typescript
import { TerminalPanel } from "@/components/terminal/TerminalPanel"
```

Insert `<TerminalPanel />` between `</main>` and `<StatusBar />` in the JSX:

```typescript
        <main className="flex-1 overflow-y-auto p-6">
          <PageRouter />
        </main>
        <TerminalPanel />
        <StatusBar />
```

Also add the `onChatEvent` handler to `setupEventDispatch` (pass a no-op for now — Task 8 will wire it up):

```typescript
    setupEventDispatch({
      onHealth: updateFromHealth,
      onConnect: updateFromConnect,
      onCron: () => {
        gatewayWs
          .cronList()
          .then(setJobs)
          .catch(() => {})
      },
      onSessionsChanged: () => {},
      onPresence: () => {},
      onApprovalRequested: () => {},
      onApprovalResolved: () => {},
      onChatEvent: () => {},
    })
```

- [ ] **Step 3: Add Terminal toggle button to StatusBar**

In `src/components/layout/StatusBar.tsx`, add the import:

```typescript
import { useTerminalStore } from "@/stores/terminal-store"
import { Terminal } from "lucide-react"
```

Add the store hook inside the component:

```typescript
  const terminalOpen = useTerminalStore((s) => s.isOpen)
  const openTerminal = useTerminalStore((s) => s.open)
```

Add a toggle button at the end of the footer, before the closing `</footer>` tag. Put it inside a `<div className="ml-auto">` wrapper:

```typescript
      {!terminalOpen && (
        <button
          type="button"
          onClick={openTerminal}
          className="ml-auto flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Terminal className="h-3 w-3" />
          <span>Terminal</span>
        </button>
      )}
```

- [ ] **Step 4: Verify build passes**

Run: `npm run check`
Expected: PASS — all components compile, panel renders (hidden by default, toggle button visible in StatusBar)

- [ ] **Step 5: Commit**

```bash
git add src/components/terminal/TerminalPanel.tsx src/App.tsx src/components/layout/StatusBar.tsx
git commit -m "feat(terminal): add TerminalPanel shell with drag resize, integrate into App layout"
```

---

### Task 8: Wire chat events from gateway to terminal store

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace the no-op onChatEvent with real handler**

In `src/App.tsx`, add the terminal store import:

```typescript
import { useTerminalStore } from "@/stores/terminal-store"
```

No React selectors needed — the event handler accesses the store directly via `useTerminalStore.getState()` since it runs outside the React render cycle.

Replace the `onChatEvent: () => {}` with:

```typescript
      onChatEvent: (event, payload) => {
        const p = payload as Record<string, unknown>
        const evtAgent = (p.agentId as string) ?? null
        const evtSession = (p.session as string) ?? (p.sessionKey as string) ?? null
        const { agentId: tAgent, sessionKey: tSession } = useTerminalStore.getState()

        // Only process events for the active terminal session
        if (evtAgent !== tAgent || evtSession !== tSession) return

        if (event === "chat.delta" || event === "session.delta") {
          const text = (p.text as string) ?? (p.content as string) ?? ""
          const current = useTerminalStore.getState().streamingText
          useTerminalStore.getState().updateStreamingText((current ?? "") + text)
        } else if (event === "chat.tool.start" || event === "session.tool.start") {
          useTerminalStore.getState().updateStreamingToolCall({
            id: (p.toolCallId as string) ?? crypto.randomUUID(),
            name: (p.name as string) ?? (p.tool as string) ?? "unknown",
            args: p.args ?? p.input,
            status: "running",
          })
        } else if (event === "chat.tool.end" || event === "session.tool.end") {
          const current = useTerminalStore.getState().streamingToolCall
          if (current) {
            const lastMsg = useTerminalStore.getState().messages.at(-1)
            const finishedTool = {
              ...current,
              result: p.result ?? p.output,
              status: (p.error ? "error" : "success") as "error" | "success",
              durationMs: p.durationMs as number | undefined,
            }
            // Attach tool to the last assistant message or create a new one
            if (lastMsg && lastMsg.role === "assistant") {
              const updated = { ...lastMsg, toolCalls: [...(lastMsg.toolCalls ?? []), finishedTool] }
              const msgs = [...useTerminalStore.getState().messages]
              msgs[msgs.length - 1] = updated
              useTerminalStore.getState().setMessages(msgs)
            } else {
              useTerminalStore.getState().appendMessage({
                id: crypto.randomUUID(),
                role: "assistant",
                content: "",
                timestamp: Date.now(),
                toolCalls: [finishedTool],
              })
            }
            useTerminalStore.getState().updateStreamingToolCall(null as unknown as import("@/types/terminal").ToolCallData)
          }
        } else if (event === "chat.end" || event === "session.end" || event === "chat.message.end") {
          useTerminalStore.getState().finalizeStreaming()
        } else if (event === "chat.error" || event === "session.error") {
          useTerminalStore.getState().setRunState("error")
          useTerminalStore.getState().appendMessage({
            id: crypto.randomUUID(),
            role: "system",
            content: (p.message as string) ?? (p.error as string) ?? "An error occurred.",
            timestamp: Date.now(),
          })
        }
      },
```

Note: We check multiple event name variants (`chat.*` and `session.*`) because the gateway protocol may use either convention. The handler gracefully ignores events for other sessions.

- [ ] **Step 2: Add the dependency refs to the useEffect**

Update the `useEffect` deps for `setupEventDispatch` — since we're using `useTerminalStore.getState()` directly (not hook selectors), we don't need to add the terminal selectors to the effect deps. However, the existing refs (`updateFromHealth`, etc.) remain.

- [ ] **Step 3: Verify build passes**

Run: `npm run check`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(terminal): wire gateway chat events to terminal store"
```

---

### Task 9: Auto-select default agent and session on connect

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add auto-selection logic with history loading**

After the existing `useEffect` that fetches cron jobs on connection (the one that checks `connectionStatus === "connected"`), add a new effect:

```typescript
  useEffect(() => {
    if (connectionStatus !== "connected") return
    const { agentId } = useTerminalStore.getState()
    if (agentId) return // already have a session selected

    // Auto-select the default agent and a session
    gatewayWs
      .agentsList()
      .then((resp) => {
        const defaultAgent = resp.agents.find((a) => a.isDefault) ?? resp.agents[0]
        if (!defaultAgent) return
        const aid = defaultAgent.id
        // Try to get existing sessions for this agent
        gatewayWs
          .sessionsList()
          .then((sessResp) => {
            const agentSession = sessResp.sessions.find((s) => s.agentId === aid) ?? sessResp.sessions[0]
            const skey = agentSession?.key ?? "main"
            useTerminalStore.getState().setSession(aid, skey)
            // Load session history
            loadSessionHistory(aid, skey)
          })
          .catch(() => {
            useTerminalStore.getState().setSession(aid, "main")
            loadSessionHistory(aid, "main")
          })
      })
      .catch(() => {})
  }, [connectionStatus])
```

- [ ] **Step 2: Add the loadSessionHistory helper**

Add this function inside the `App` component, before the effects:

```typescript
  const loadSessionHistory = useCallback((agentId: string, sessionKey: string) => {
    gatewayWs
      .sessionHistory(agentId, sessionKey)
      .then((resp) => {
        const data = resp as { messages?: Array<{ id?: string; role?: string; content?: string; timestamp?: number; toolCalls?: unknown[] }> }
        if (!data.messages?.length) return
        const msgs: ChatMessageData[] = data.messages.map((m) => ({
          id: m.id ?? crypto.randomUUID(),
          role: (m.role as "user" | "assistant" | "system") ?? "system",
          content: m.content ?? "",
          timestamp: m.timestamp ?? Date.now(),
        }))
        useTerminalStore.getState().setMessages(msgs)
      })
      .catch(() => {
        // History loading is best-effort — gateway may not support this RPC
      })
  }, [])
```

Add the import for `ChatMessageData` at the top of App.tsx:

```typescript
import type { ChatMessageData } from "@/types/terminal"
```

And add `useCallback` to the React imports if not already present.

- [ ] **Step 2: Verify build passes**

Run: `npm run check`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(terminal): auto-select default agent and session on connect"
```

---

### Task 10: Final build verification and manual test

**Files:** None new

- [ ] **Step 1: Full build check**

Run: `npm run check`
Expected: PASS — no format, lint, or type errors

- [ ] **Step 2: Visual smoke test**

Run: `npm run dev`

Verify:
1. StatusBar shows "Terminal" button when panel is closed
2. Clicking "Terminal" opens the bottom panel
3. Panel shows agent/session info in header
4. Drag handle resizes the panel up/down
5. Close button (×) hides the panel
6. Panel height persists across page refreshes (check localStorage)
7. Input field shows placeholder text
8. Typing a message and pressing Enter adds it to the chat log as a "you" message
9. The message is sent via WebSocket (check browser devtools Network > WS)

- [ ] **Step 3: Commit any final fixes**

If any adjustments are needed, make them and commit:

```bash
git add -A
git commit -m "fix(terminal): polish terminal panel after smoke test"
```
