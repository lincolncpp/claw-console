import { create } from "zustand"
import type { ChatMessageData, ToolCallData } from "@/types/terminal"
import { uuid } from "@/lib/uuid"

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
  updateStreamingText: (updater: string | ((prev: string | null) => string)) => void
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
      messages: [],
      streamingText: null,
      streamingToolCall: null,
      runState: "idle",
      lastEventAt: 0,
    }),

  appendMessage: (msg) =>
    set((s) => {
      const next = [...s.messages, msg]
      return { messages: next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next }
    }),

  setMessages: (messages) => set({ messages }),

  updateStreamingText: (updater) =>
    set((s) => ({
      streamingText: typeof updater === "function" ? updater(s.streamingText) : updater,
      runState: "streaming",
      lastEventAt: Date.now(),
    })),

  updateStreamingToolCall: (streamingToolCall) =>
    set({ streamingToolCall, runState: "streaming", lastEventAt: Date.now() }),

  completeToolCall: (finishedTool) =>
    set((s) => {
      const msgs = [...s.messages]
      const lastMsg = msgs[msgs.length - 1]
      if (lastMsg && lastMsg.role === "assistant") {
        msgs[msgs.length - 1] = {
          ...lastMsg,
          toolCalls: [...(lastMsg.toolCalls ?? []), finishedTool],
        }
      } else {
        msgs.push({
          id: uuid(),
          role: "assistant",
          content: "",
          timestamp: Date.now(),
          toolCalls: [finishedTool],
        })
      }
      return {
        messages: msgs.length > MAX_MESSAGES ? msgs.slice(-MAX_MESSAGES) : msgs,
        streamingToolCall: null,
        lastEventAt: Date.now(),
      }
    }),

  finalizeStreaming: () =>
    set((s) => {
      const msgs = [...s.messages]
      if (s.streamingText != null) {
        msgs.push({
          id: uuid(),
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

  resetStreaming: () => set({ streamingText: null, streamingToolCall: null, runState: "idle" }),

  setRunState: (runState) => set({ runState }),
}))
