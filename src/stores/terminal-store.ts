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
    set({
      agentId,
      sessionKey,
      messages: [],
      streamingText: null,
      streamingToolCall: null,
      runState: "idle",
    }),

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

  clearMessages: () =>
    set({ messages: [], streamingText: null, streamingToolCall: null, runState: "idle" }),
}))
