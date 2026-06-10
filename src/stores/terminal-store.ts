import { create } from "zustand"
import type { ChatMessageData, ToolCallData } from "@/types/terminal"
import { uuid } from "@/lib/uuid"

const STORAGE_KEY = "terminal-panel-height"
const DEFAULT_HEIGHT = 240
const MAX_MESSAGES = 500
const SESSION_CACHE_KEY = "terminal-session-cache"

function loadHeight(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v ? Number(v) : DEFAULT_HEIGHT
  } catch {
    return DEFAULT_HEIGHT
  }
}

// Live agent events are not replayable from the gateway (and codex runs only
// persist their transcript at turn end), so the accumulated conversation is
// cached per session to survive page refreshes mid-run.
function loadSessionCache(sessionKey: string): ChatMessageData[] | null {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { sessionKey?: string; messages?: ChatMessageData[] }
    return parsed.sessionKey === sessionKey && Array.isArray(parsed.messages)
      ? parsed.messages
      : null
  } catch {
    return null
  }
}

function persistSessionCache(sessionKey: string | null, messages: ChatMessageData[]) {
  if (!sessionKey) return
  try {
    const raw = JSON.stringify({ sessionKey, messages })
    if (raw.length > 2_000_000) return
    sessionStorage.setItem(SESSION_CACHE_KEY, raw)
  } catch {
    // best effort — quota or serialization failures just lose the cache
  }
}

export type RunState = "idle" | "waiting" | "streaming" | "error"

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
  streamingThinking: string | null
  streamingToolCall: ToolCallData | null

  // Status
  runState: RunState
  lastEventAt: number

  // Actions
  open: () => void
  close: () => void
  setPanelHeight: (h: number) => void
  setSession: (agentId: string, sessionKey: string) => void
  appendMessage: (msg: ChatMessageData) => void
  setMessages: (msgs: ChatMessageData[]) => void
  touchLastEvent: () => void
  updateStreamingText: (updater: string | ((prev: string | null) => string)) => void
  updateStreamingThinking: (updater: string | ((prev: string | null) => string)) => void
  updateStreamingToolCall: (tool: ToolCallData) => void
  /** Inserts or updates an assistant text message in place (e.g. streamed commentary). */
  upsertAssistantText: (id: string, text: string) => void
  completeToolCall: (finishedTool: ToolCallData) => void
  finalizeStreaming: () => void
  resetStreaming: () => void
  setRunState: (state: RunState) => void
}

export const useTerminalStore = create<TerminalState>()((set) => ({
  isOpen: false,
  panelHeight: loadHeight(),

  agentId: null,
  sessionKey: null,

  messages: [],
  streamingText: null,
  streamingThinking: null,
  streamingToolCall: null,

  runState: "idle",
  lastEventAt: 0,

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
    set({
      agentId,
      sessionKey,
      messages: loadSessionCache(sessionKey) ?? [],
      streamingText: null,
      streamingThinking: null,
      streamingToolCall: null,
      runState: "idle",
      lastEventAt: 0,
    }),

  appendMessage: (msg) =>
    set((s) => {
      const next = [...s.messages, msg]
      const messages = next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next
      persistSessionCache(s.sessionKey, messages)
      return { messages }
    }),

  setMessages: (messages) =>
    set((s) => {
      persistSessionCache(s.sessionKey, messages)
      return { messages }
    }),

  touchLastEvent: () => set({ lastEventAt: Date.now() }),

  updateStreamingText: (updater) =>
    set((s) => ({
      streamingText: typeof updater === "function" ? updater(s.streamingText) : updater,
      runState: "streaming",
      lastEventAt: Date.now(),
    })),

  updateStreamingThinking: (updater) =>
    set((s) => ({
      streamingThinking: typeof updater === "function" ? updater(s.streamingThinking) : updater,
      runState: "streaming",
      lastEventAt: Date.now(),
    })),

  updateStreamingToolCall: (streamingToolCall) =>
    set({ streamingToolCall, runState: "streaming", lastEventAt: Date.now() }),

  upsertAssistantText: (id, text) =>
    set((s) => {
      const msgs = [...s.messages]
      const idx = msgs.findIndex((m) => m.id === id)
      if (idx >= 0) {
        msgs[idx] = { ...msgs[idx], content: text }
      } else {
        msgs.push({ id, role: "assistant", content: text, timestamp: Date.now() })
      }
      const messages = msgs.length > MAX_MESSAGES ? msgs.slice(-MAX_MESSAGES) : msgs
      persistSessionCache(s.sessionKey, messages)
      return { messages, runState: "streaming", lastEventAt: Date.now() }
    }),

  // Each finished tool gets its own message so commentary text and command
  // boxes interleave in the order they happened. The same tool call can be
  // reported by both the "item" and "tool" event streams; merge by id so it
  // renders once, preferring whichever side carried args/result.
  completeToolCall: (finishedTool) =>
    set((s) => {
      const msgs = [...s.messages]
      let merged = false
      for (let i = msgs.length - 1; i >= 0 && !merged; i--) {
        const tcs = msgs[i].toolCalls
        if (!tcs) continue
        const idx = tcs.findIndex((t) => t.id === finishedTool.id)
        if (idx < 0) continue
        const existing = tcs[idx]
        const nextTcs = [...tcs]
        nextTcs[idx] = {
          ...existing,
          ...finishedTool,
          args: finishedTool.args ?? existing.args,
          result: finishedTool.result ?? existing.result,
        }
        msgs[i] = { ...msgs[i], toolCalls: nextTcs }
        merged = true
      }
      if (!merged) {
        msgs.push({
          id: uuid(),
          role: "assistant",
          content: "",
          timestamp: Date.now(),
          toolCalls: [finishedTool],
        })
      }
      const messages = msgs.length > MAX_MESSAGES ? msgs.slice(-MAX_MESSAGES) : msgs
      persistSessionCache(s.sessionKey, messages)
      return {
        messages,
        streamingToolCall: null,
        lastEventAt: Date.now(),
      }
    }),

  finalizeStreaming: () =>
    set((s) => {
      const msgs = [...s.messages]
      if (s.streamingText != null && s.streamingText !== "") {
        msgs.push({
          id: uuid(),
          role: "assistant",
          content: s.streamingText,
          timestamp: Date.now(),
        })
      }
      const messages = msgs.length > MAX_MESSAGES ? msgs.slice(-MAX_MESSAGES) : msgs
      persistSessionCache(s.sessionKey, messages)
      return {
        messages,
        streamingText: null,
        streamingThinking: null,
        streamingToolCall: null,
        runState: "idle",
      }
    }),

  resetStreaming: () =>
    set({
      streamingText: null,
      streamingThinking: null,
      streamingToolCall: null,
      runState: "idle",
    }),

  setRunState: (runState) =>
    set(
      runState === "waiting"
        ? {
            runState,
            // Starting a new turn: drop any leftover streaming state from a
            // prior errored or aborted turn so deltas don't append to stale text.
            streamingText: null,
            streamingThinking: null,
            streamingToolCall: null,
          }
        : { runState },
    ),
}))
