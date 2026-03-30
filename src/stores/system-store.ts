import { create } from "zustand"
import type { SystemInfo } from "@/types/gateway"

interface SystemState {
  cpu: number | null
  memoryUsed: number | null
  memoryTotal: number | null
  diskUsed: number | null
  diskTotal: number | null
  uptime: number | null
  pid: number | null
  version: string | null
  lastUpdated: number | null

  updateSystem: (data: SystemInfo) => void
  clear: () => void
}

export const useSystemStore = create<SystemState>()((set) => ({
  cpu: null,
  memoryUsed: null,
  memoryTotal: null,
  diskUsed: null,
  diskTotal: null,
  uptime: null,
  pid: null,
  version: null,
  lastUpdated: null,

  updateSystem: (data) =>
    set({
      cpu: data.cpu,
      memoryUsed: data.memory?.used ?? null,
      memoryTotal: data.memory?.total ?? null,
      diskUsed: data.disk?.used ?? null,
      diskTotal: data.disk?.total ?? null,
      uptime: data.uptime ?? null,
      pid: data.pid ?? null,
      version: data.version ?? null,
      lastUpdated: Date.now(),
    }),

  clear: () =>
    set({
      cpu: null,
      memoryUsed: null,
      memoryTotal: null,
      diskUsed: null,
      diskTotal: null,
      uptime: null,
      pid: null,
      version: null,
      lastUpdated: null,
    }),
}))
