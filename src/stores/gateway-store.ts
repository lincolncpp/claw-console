import { create } from "zustand"

const ENV_HOST = import.meta.env.VITE_GATEWAY_HOST ?? ""
const ENV_PORT = Number(import.meta.env.VITE_GATEWAY_PORT) || 18789
const ENV_TOKEN = import.meta.env.VITE_GATEWAY_TOKEN ?? ""

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

interface GatewayState {
  host: string
  port: number
  token: string
  connectionStatus: ConnectionStatus
  errorMessage: string | null
  setConnectionStatus: (status: ConnectionStatus, errorMessage?: string) => void
}

export const useGatewayStore = create<GatewayState>()((set) => ({
  host: ENV_HOST,
  port: ENV_PORT,
  token: ENV_TOKEN,
  connectionStatus: "disconnected",
  errorMessage: null,

  setConnectionStatus: (connectionStatus, errorMessage = null) =>
    set({ connectionStatus, errorMessage }),
}))
