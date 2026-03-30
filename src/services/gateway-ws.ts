import type { CronJob, CronRun } from "@/types/cron"
import type { SystemInfo } from "@/types/gateway"
import type { GatewayFrame } from "@/types/ws"

type EventHandler = (event: string, payload: unknown) => void

interface PendingRpc {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

export class GatewayWebSocket {
  private ws: WebSocket | null = null
  private pendingRpc = new Map<string, PendingRpc>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private shouldReconnect = false
  private onEvent: EventHandler | null = null
  private onStatusChange: ((status: "disconnected" | "connecting" | "connected" | "error", error?: string) => void) | null = null
  private token: string | null = null
  private connectId = 0 // guards against stale connections

  setEventHandler(handler: EventHandler) {
    this.onEvent = handler
  }

  setStatusChangeHandler(handler: NonNullable<typeof this.onStatusChange>) {
    this.onStatusChange = handler
  }

  connect(token: string) {
    // If already connecting/connected with the same token, skip
    if (this.token === token && this.ws) {
      return
    }

    this.teardown()
    this.token = token
    this.shouldReconnect = true
    this.reconnectDelay = 1000
    this.doConnect()
  }

  disconnect() {
    this.teardown()
    this.onStatusChange?.("disconnected")
  }

  private teardown() {
    this.connectId++ // invalidate any in-flight connection
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.onclose = null
      this.ws.onerror = null
      this.ws.onmessage = null
      this.ws.onopen = null
      this.ws.close()
      this.ws = null
    }
    this.clearPendingRpcs("Disconnected")
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  async cronList(): Promise<CronJob[]> {
    return this.sendRpc("cron.list") as Promise<CronJob[]>
  }

  async cronRuns(jobId: string, limit = 50): Promise<CronRun[]> {
    return this.sendRpc("cron.runs", { jobId, limit }) as Promise<CronRun[]>
  }

  async cronRun(jobId: string): Promise<void> {
    await this.sendRpc("cron.run", { jobId })
  }

  async cronStatus(jobId: string): Promise<CronJob> {
    return this.sendRpc("cron.status", { jobId }) as Promise<CronJob>
  }

  private doConnect() {
    if (!this.token) return

    const token = this.token
    const id = this.connectId

    // Connect through Vite proxy at /ws -> gateway root
    const proto = location.protocol === "https:" ? "wss:" : "ws:"
    const wsUrl = `${proto}//${location.host}/ws`
    this.onStatusChange?.("connecting")

    let ws: WebSocket
    try {
      ws = new WebSocket(wsUrl)
    } catch {
      this.onStatusChange?.("error", "Failed to create WebSocket")
      this.scheduleReconnect()
      return
    }

    this.ws = ws

    ws.onopen = () => {
      if (this.connectId !== id) return
    }

    ws.onmessage = (event) => {
      if (this.connectId !== id) return
      try {
        const frame: GatewayFrame = JSON.parse(event.data)
        this.handleFrame(frame, token)
      } catch {
        // Ignore unparseable frames
      }
    }

    ws.onclose = () => {
      if (this.connectId !== id) return
      this.ws = null
      this.clearPendingRpcs("Connection closed")
      this.onStatusChange?.("disconnected")
      this.scheduleReconnect()
    }

    ws.onerror = () => {
      if (this.connectId !== id) return
      this.onStatusChange?.("error", "WebSocket error")
    }
  }

  private handleFrame(frame: GatewayFrame, token: string) {
    if (frame.type === "event") {
      if (frame.event === "connect.challenge") {
        const connectMsg = {
          type: "req",
          id: crypto.randomUUID(),
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: "cli",
              version: "1.0.0",
              platform: navigator.platform,
              mode: "webchat",
            },
            role: "operator",
            scopes: ["operator.admin", "operator.approvals", "operator.pairing"],
            caps: [],
            auth: { token },
            locale: navigator.language,
            userAgent: navigator.userAgent,
          },
        }
        this.ws?.send(JSON.stringify(connectMsg))
        return
      }

      if (
        frame.event === "connect.hello" ||
        frame.event === "hello" ||
        frame.event === "hello-ok"
      ) {
        this.reconnectDelay = 1000
        this.onStatusChange?.("connected")
        return
      }

      // Dispatch other events
      this.onEvent?.(frame.event, frame.payload)
      return
    }

    if (frame.type === "response" || frame.type === "res") {
      const res = frame as { id: string; ok?: boolean; result?: unknown; error?: { code: string; message: string } }

      const pending = this.pendingRpc.get(res.id)
      if (pending) {
        this.pendingRpc.delete(res.id)
        clearTimeout(pending.timeout)
        if (res.ok === false || res.error) {
          pending.reject(new Error(`RPC error: ${res.error?.message ?? "unknown"}`))
        } else {
          pending.resolve(res.result)
        }
        return
      }

      // If no pending RPC matched, this might be the connect response
      if (res.ok !== false) {
        this.reconnectDelay = 1000
        this.onStatusChange?.("connected")
      }
    }
  }

  private sendRpc(method: string, params?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("Not connected"))
        return
      }

      const id = crypto.randomUUID()
      const timeout = setTimeout(() => {
        this.pendingRpc.delete(id)
        reject(new Error(`RPC timeout: ${method}`))
      }, 15000)

      this.pendingRpc.set(id, { resolve, reject, timeout })

      const request = { type: "req", id, method, params }
      this.ws.send(JSON.stringify(request))
    })
  }

  private clearPendingRpcs(reason: string) {
    for (const [id, pending] of this.pendingRpc) {
      clearTimeout(pending.timeout)
      pending.reject(new Error(reason))
      this.pendingRpc.delete(id)
    }
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect || this.reconnectTimer) return

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.doConnect()
    }, this.reconnectDelay)

    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
  }
}

// Singleton instance
export const gatewayWs = new GatewayWebSocket()

// Helper to dispatch WS events to stores
export function setupEventDispatch(
  onSystemUpdate: (data: SystemInfo) => void,
  onCronUpdate: (jobs: CronJob[]) => void,
) {
  gatewayWs.setEventHandler((event, payload) => {
    switch (event) {
      case "health":
      case "system":
        onSystemUpdate(payload as SystemInfo)
        break
      case "cron":
        gatewayWs.cronList().then(onCronUpdate).catch(() => {})
        break
    }
  })
}
