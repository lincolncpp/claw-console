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
  /**
   * ID of the assistant message we're currently building during this turn.
   * Tools and final text from the same turn collapse into this single message,
   * mirroring how the gateway stores one assistant message per turn.
   */
  currentTurnAssistantId: string | null

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
  currentTurnAssistantId: null,

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
      currentTurnAssistantId: null,
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

  completeToolCall: (finishedTool) =>
    set((s) => {
      const msgs = [...s.messages]
      const turnId = s.currentTurnAssistantId
      const turnIdx = turnId ? msgs.findIndex((m) => m.id === turnId) : -1

      if (turnIdx >= 0) {
        const target = msgs[turnIdx]
        msgs[turnIdx] = {
          ...target,
          toolCalls: [...(target.toolCalls ?? []), finishedTool],
        }
        persistSessionCache(s.sessionKey, msgs)
        return {
          messages: msgs,
          streamingToolCall: null,
          lastEventAt: Date.now(),
        }
      }

      const newMsg: ChatMessageData = {
        id: uuid(),
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        toolCalls: [finishedTool],
      }
      msgs.push(newMsg)
      const messages = msgs.length > MAX_MESSAGES ? msgs.slice(-MAX_MESSAGES) : msgs
      persistSessionCache(s.sessionKey, messages)
      return {
        messages,
        streamingToolCall: null,
        currentTurnAssistantId: newMsg.id,
        lastEventAt: Date.now(),
      }
    }),

  finalizeStreaming: () =>
    set((s) => {
      const msgs = [...s.messages]
      const turnId = s.currentTurnAssistantId
      const turnIdx = turnId ? msgs.findIndex((m) => m.id === turnId) : -1

      if (s.streamingText != null) {
        if (turnIdx >= 0) {
          msgs[turnIdx] = { ...msgs[turnIdx], content: s.streamingText }
        } else {
          msgs.push({
            id: uuid(),
            role: "assistant",
            content: s.streamingText,
            timestamp: Date.now(),
          })
        }
      }
      const messages = msgs.length > MAX_MESSAGES ? msgs.slice(-MAX_MESSAGES) : msgs
      persistSessionCache(s.sessionKey, messages)
      return {
        messages,
        streamingText: null,
        streamingThinking: null,
        streamingToolCall: null,
        currentTurnAssistantId: null,
        runState: "idle",
      }
    }),

  resetStreaming: () =>
    set({
      streamingText: null,
      streamingThinking: null,
      streamingToolCall: null,
      currentTurnAssistantId: null,
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
            currentTurnAssistantId: null,
          }
        : { runState },
    ),
}))
