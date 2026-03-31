import { create } from "zustand"
import type { HealthPayload, ConnectResult, ChannelHealth, AgentHealth } from "@/types/gateway"
import type { PresenceEntry } from "@/types/node"

interface SystemState {
  version: string | null
  uptimeMs: number | null
  connectedAt: number | null

  healthOk: boolean | null
  healthCheckMs: number | null

  channels: { key: string; label: string; health: ChannelHealth }[]
  agents: AgentHealth[]
  totalSessions: number | null

  presence: PresenceEntry[]

  updateAvailable: {
    currentVersion: string
    latestVersion: string
    channel: string
  } | null

  lastUpdated: number | null

  updateFromConnect: (data: ConnectResult) => void
  updateFromHealth: (data: HealthPayload) => void
  updateAgentSessionCounts: (counts: Record<string, number>) => void
  clear: () => void
}

function mapHealth(health: HealthPayload) {
  const channels = health.channelOrder.map((key) => ({
    key,
    label: health.channelLabels[key] ?? key,
    health: health.channels[key],
  }))

  return {
    healthOk: health.ok,
    healthCheckMs: health.durationMs,
    channels,
    agents: health.agents ?? [],
    totalSessions: health.sessions?.count ?? null,
    lastUpdated: Date.now(),
  }
}

export const useSystemStore = create<SystemState>()((set) => ({
  version: null,
  uptimeMs: null,
  connectedAt: null,
  healthOk: null,
  healthCheckMs: null,
  channels: [],
  agents: [],
  totalSessions: null,
  presence: [],
  updateAvailable: null,
  lastUpdated: null,

  updateFromConnect: (data) =>
    set({
      version: data.server.version,
      uptimeMs: data.snapshot.uptimeMs,
      connectedAt: Date.now(),
      presence: (data.snapshot as unknown as { presence?: PresenceEntry[] }).presence ?? [],
      updateAvailable: data.snapshot.updateAvailable ?? null,
      ...mapHealth(data.snapshot.health),
    }),

  updateFromHealth: (data) => set(mapHealth(data)),

  updateAgentSessionCounts: (counts) =>
    set((state) => ({
      agents: state.agents.map((a) => ({
        ...a,
        sessions: { count: counts[a.agentId] ?? a.sessions.count },
      })),
      totalSessions: Object.values(counts).reduce((sum, n) => sum + n, 0),
    })),

  clear: () =>
    set({
      version: null,
      uptimeMs: null,
      connectedAt: null,
      healthOk: null,
      healthCheckMs: null,
      channels: [],
      agents: [],
      totalSessions: null,
      presence: [],
      updateAvailable: null,
      lastUpdated: null,
    }),
}))
