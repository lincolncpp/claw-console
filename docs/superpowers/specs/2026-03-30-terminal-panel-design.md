# Terminal Panel Design

**Date:** 2026-03-30
**Status:** Approved

## Overview

Add a bottom-docked, resizable terminal panel to the OpenClaw dashboard that provides a full chat experience with agents — similar to `openclaw tui` but embedded in the web UI. The panel is accessible from any page, like VS Code's integrated terminal.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Layout | Bottom panel (VS Code-style) | Accessible from any page without losing context |
| Styling | Hybrid | Monospace for chat text; dashboard-style Card components for tool calls |
| Scope | Essential (v1) | Chat input, streaming messages, tool cards, agent/session display. No slash commands or pickers in v1 |
| Resize | Drag handle + close button | Drag top border to resize, X to close, button to reopen |

## Components

### TerminalPanel
The outer shell. Renders the drag handle, header bar, chat log, and input area. Manages open/closed state and persisted height.

- **Drag handle:** 4px strip at the top with a centered grip indicator. Mousedown starts resize, mousemove updates height, mouseup commits. Height persisted to `localStorage`.
- **Header bar:** Shows "Terminal" label, current agent (purple), current session (purple), connection status indicator (green dot + "idle"/"streaming"/"error"), and close button (×).
- **Default height:** 240px. Min: 120px. Max: 60% of viewport.
- **Closed state:** Panel is fully hidden. A "Terminal" button in the StatusBar reopens it.

### ChatLog
Scrollable container for chat messages. Auto-scrolls to bottom on new messages unless the user has scrolled up (same pattern as the existing LogsPage).

- Renders a list of `ChatMessage` and `ToolCard` components in order.
- On panel open / session change, loads history from the gateway.
- Max buffer: 500 messages (oldest pruned).

### ChatMessage
A single chat message with role label and content.

- **Roles:** `you` (purple #a78bfa), `assistant` (green #4ade80), `system` (gray #888)
- **Text:** Monospace font (`font-family: 'Geist Mono', monospace`; fall back to the Geist Variable already in use)
- **Markdown:** Assistant messages rendered with basic inline markdown (bold, italic, code, code blocks). Use a lightweight approach: regex-based replacements for inline formatting, and `<pre><code>` blocks for fenced code. No external markdown library needed for v1.
- **Streaming:** When the assistant is actively streaming, the last message shows a blinking cursor (▋) appended to the partial text.

### ToolCard
Dashboard-styled collapsible card for tool calls.

- **Collapsed (default):** Shows tool name, status badge (success/error/running), and duration. Left border accent in purple.
- **Expanded:** Shows args (JSON, syntax highlighted or preformatted) and result (same).
- **Click to toggle** collapse/expand.
- **Live updates:** While the tool is running, the card shows a "running" badge and streams partial results into the expanded view.

### ChatInput
Single-line text input at the bottom of the panel.

- Prompt character `❯` in purple.
- Enter sends the message via `chat.send` RPC.
- Disabled while not connected to the gateway.
- Input is cleared after send.
- While assistant is streaming, Enter does nothing (or could abort — v2 consideration).

## State Management

### terminal-store (Zustand)

```typescript
interface TerminalState {
  // Panel UI
  isOpen: boolean
  panelHeight: number // persisted to localStorage

  // Session
  agentId: string | null
  sessionKey: string | null

  // Messages
  messages: ChatMessageData[]
  streamingText: string | null // partial text while streaming
  streamingToolCall: ToolCallData | null // partial tool call while streaming

  // Status
  runState: 'idle' | 'streaming' | 'error'

  // Actions
  open: () => void
  close: () => void
  setPanelHeight: (h: number) => void
  setSession: (agentId: string, sessionKey: string) => void
  appendMessage: (msg: ChatMessageData) => void
  updateStreamingText: (text: string) => void
  finalizeStreaming: () => void
  sendMessage: (text: string) => void
}
```

### Data Types

```typescript
interface ChatMessageData {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

interface ToolCallData {
  id: string
  name: string
  args: unknown
  result?: unknown
  status: 'running' | 'success' | 'error'
  durationMs?: number
}
```

## Gateway Integration

### New RPC Methods on GatewayWebSocket

1. **`chatSend(agentId, sessionKey, text)`** — sends a user message via `chat.send` RPC. Params: `{ agentId, session: sessionKey, body: text }`.

2. **`sessionHistory(agentId, sessionKey, limit?)`** — loads recent messages for a session. Likely `sessions.history` or similar RPC. Returns an array of message objects.

### New Events to Handle

The gateway streams assistant responses as events on the WebSocket. The terminal panel subscribes to these by listening for events scoped to the active session:

- **Text delta events** — partial text chunks appended to `streamingText`.
- **Tool call events** — tool invocation start/progress/completion updates.
- **Message end events** — finalize the streaming message, clear streaming state.
- **Error events** — set `runState` to `'error'`, show error in chat log.

The exact event names will be discovered during implementation by inspecting gateway traffic or consulting the full protocol docs. The event handler in `gateway-ws.ts` already dispatches by event name — we add new cases for chat-related events.

### Event Dispatch Extension

Add new handlers to `setupEventDispatch` and `EventDispatchHandlers`:

```typescript
// additions to EventDispatchHandlers
onChatDelta: (payload: { agentId: string; session: string; text: string }) => void
onChatToolCall: (payload: { agentId: string; session: string; tool: ToolCallData }) => void
onChatMessageEnd: (payload: { agentId: string; session: string }) => void
```

## File Structure

```
src/
  components/
    terminal/
      TerminalPanel.tsx      # outer shell: drag, header, layout
      ChatLog.tsx             # scrollable message list
      ChatMessage.tsx         # single message render
      ToolCard.tsx            # collapsible tool card
      ChatInput.tsx           # input field
  stores/
    terminal-store.ts         # Zustand store
  types/
    terminal.ts               # ChatMessageData, ToolCallData
```

## Integration Points

1. **App.tsx** — render `<TerminalPanel />` between `<main>` and `<StatusBar />`.
2. **StatusBar.tsx** — add a "Terminal" toggle button that calls `useTerminalStore().open()`.
3. **gateway-ws.ts** — add `chatSend()` and `sessionHistory()` RPC methods; extend event dispatch for chat events.
4. **Sidebar.tsx** — no changes needed (terminal is not a page, it's a panel).

## Styling

- Panel background: `#111` (slightly lighter than page bg `#0f0f0f`)
- Border-top: `2px solid #333` to visually separate from page content
- Drag handle: centered 32px wide, 3px tall, `#333` rounded pill
- Role labels: fixed-width right-aligned, purple for user, green for assistant, gray for system
- Tool cards: existing Card/border pattern with `border-left: 2px solid #a78bfa`
- Input: prompt `❯` in purple, monospace text, subtle top border

## Out of Scope (v2+)

- Slash commands (`/agent`, `/session`, `/model`, `/think`)
- Agent/session/model picker dropdowns
- Keyboard shortcut to toggle panel
- `!shell` local command execution
- Thinking mode toggles / token counts
- Multi-line input / shift+enter
- Message search
