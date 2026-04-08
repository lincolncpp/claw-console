import type { CronJob, CronRun, CronRunsResponse } from "@/types/cron"
import type { ConnectResult, HealthPayload } from "@/types/gateway"
import type {
  SessionsListResponse,
  SessionDeleteResponse,
  SessionsCleanupResponse,
} from "@/types/session"
import type { NodeListResponse } from "@/types/node"
import type { LogsTailResponse } from "@/types/log"
import type {
  AgentsListResponse,
  ModelsListResponse,
  ToolsCatalogResponse,
  SkillsStatusResponse,
  ConfigGetResponse,
} from "@/types/agent"
import type { GatewayFrame } from "@/types/ws"

import { uuid } from "@/lib/uuid"

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
  private onStatusChange:
    | ((status: "disconnected" | "connecting" | "connected" | "error", error?: string) => void)
    | null = null
  private onConnect: ((data: ConnectResult) => void) | null = null
  private token: string | null = null
  private connectId = 0
  private lastFrameAt = 0
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null

  private static readonly HEARTBEAT_CHECK_MS = 15_000
  private static readonly HEARTBEAT_STALE_MS = 30_000

  setEventHandler(handler: EventHandler | null) {
    this.onEvent = handler
  }

  setStatusChangeHandler(handler: NonNullable<typeof this.onStatusChange> | null) {
    this.onStatusChange = handler
  }

  setConnectHandler(handler: ((data: ConnectResult) => void) | null) {
    this.onConnect = handler
  }

  connect(token: string) {
    if (this.token === token && this.ws) return
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
    this.connectId++
    this.shouldReconnect = false
    this.stopHeartbeat()
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

  // --- Cron RPCs ---
  async cronList(): Promise<CronJob[]> {
    const res = (await this.sendRpc("cron.list", { includeDisabled: true })) as
      | { jobs?: CronJob[] }
      | CronJob[]
    return Array.isArray(res) ? res : (res?.jobs ?? [])
  }
  async cronRuns(jobId: string, limit = 50): Promise<{ runs: CronRun[]; total: number }> {
    const res = (await this.sendRpc("cron.runs", { jobId, limit })) as CronRunsResponse | CronRun[]
    if (Array.isArray(res)) return { runs: res, total: res.length }
    return { runs: res?.entries ?? [], total: res?.total ?? 0 }
  }
  async cronRun(jobId: string): Promise<void> {
    await this.sendRpc("cron.run", { jobId })
  }
  async cronStatus(jobId: string): Promise<CronJob> {
    return this.sendRpc("cron.status", { jobId }) as Promise<CronJob>
  }
  async cronUpdate(id: string, patch: Partial<CronJob>): Promise<CronJob> {
    return this.sendRpc("cron.update", { id, patch }) as Promise<CronJob>
  }
  async cronAdd(job: Partial<CronJob>): Promise<CronJob> {
    return this.sendRpc("cron.add", job) as Promise<CronJob>
  }
  async cronRemove(jobId: string): Promise<void> {
    await this.sendRpc("cron.remove", { jobId })
  }

  // --- Sessions RPCs ---
  async sessionsList(): Promise<SessionsListResponse> {
    return this.sendRpc("sessions.list") as Promise<SessionsListResponse>
  }

  async sessionsDelete(key: string): Promise<SessionDeleteResponse> {
    return this.sendRpc("sessions.delete", { key }) as Promise<SessionDeleteResponse>
  }

  async sessionsCleanup(maxAgeDays?: number): Promise<SessionsCleanupResponse> {
    return this.sendRpc("sessions.cleanup", {
      ...(maxAgeDays != null && { maxAgeDays }),
    }) as Promise<SessionsCleanupResponse>
  }

  // --- Agents RPCs ---
  async agentsList(): Promise<AgentsListResponse> {
    return this.sendRpc("agents.list") as Promise<AgentsListResponse>
  }
  async agentsDelete(
    agentId: string,
  ): Promise<{ ok: boolean; agentId: string; removedBindings: number }> {
    return this.sendRpc("agents.delete", { agentId }) as Promise<{
      ok: boolean
      agentId: string
      removedBindings: number
    }>
  }
  async configGet(): Promise<ConfigGetResponse> {
    return this.sendRpc("config.get") as Promise<ConfigGetResponse>
  }
  async configPatch(patch: Record<string, unknown>, baseHash?: string): Promise<unknown> {
    return this.sendRpc("config.patch", { raw: JSON.stringify(patch), baseHash })
  }
  async modelsList(): Promise<ModelsListResponse> {
    return this.sendRpc("models.list") as Promise<ModelsListResponse>
  }
  async toolsCatalog(agentId?: string): Promise<ToolsCatalogResponse> {
    return this.sendRpc("tools.catalog", agentId ? { agentId } : undefined) as Promise<ToolsCatalogResponse>
  }
  async skillsStatus(): Promise<SkillsStatusResponse> {
    return this.sendRpc("skills.status") as Promise<SkillsStatusResponse>
  }

  // --- Heartbeat RPCs ---
  async lastHeartbeat(agentId?: string): Promise<unknown> {
    return this.sendRpc("last-heartbeat", agentId ? { agentId } : undefined)
  }

  async setHeartbeats(enabled: boolean): Promise<unknown> {
    return this.sendRpc("set-heartbeats", { enabled })
  }

  async health(): Promise<HealthPayload> {
    return this.sendRpc("health") as Promise<HealthPayload>
  }

  // --- Nodes RPCs ---
  async nodeList(): Promise<NodeListResponse> {
    return this.sendRpc("node.list") as Promise<NodeListResponse>
  }

  // --- Logs RPCs ---
  async logsTail(cursor?: number): Promise<LogsTailResponse> {
    return this.sendRpc("logs.tail", cursor != null ? { cursor } : {}) as Promise<LogsTailResponse>
  }

  // --- Approvals RPCs ---
  async execApprovalsGet(): Promise<unknown> {
    return this.sendRpc("exec.approvals.get")
  }

  // --- Chat RPCs ---
  async chatSend(sessionKey: string, message: string): Promise<unknown> {
    return this.sendRpc(
      "chat.send",
      { sessionKey, message, idempotencyKey: uuid() },
      45000,
    )
  }
  async chatHistory(sessionKey: string, limit = 200): Promise<unknown> {
    return this.sendRpc("chat.history", { sessionKey, limit })
  }

  // --- Connection ---
  private doConnect() {
    if (!this.token) return
    const token = this.token
    const id = this.connectId
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
      let frame: GatewayFrame
      try {
        frame = JSON.parse(event.data)
      } catch {
        console.warn("[gw-ws] Failed to parse frame:", event.data?.slice?.(0, 200))
        return
      }
      try {
        this.handleFrame(frame, token)
      } catch (err) {
        console.error("[gw-ws] Error handling frame:", err, frame)
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
    this.lastFrameAt = Date.now()
    console.log("[gw-frame]", frame.type, frame)
    if (frame.type === "event") {
      if (frame.event === "connect.challenge") {
        const connectMsg = {
          type: "req",
          id: uuid(),
          method: "connect",
          params: {
            minProtocol: 3,
            maxProtocol: 3,
            client: {
              id: "openclaw-control-ui",
              version: "1.0.0",
              platform: navigator.platform,
              mode: "ui",
            },
            role: "operator",
            scopes: [
              "operator.admin",
              "operator.read",
              "operator.write",
              "operator.approvals",
              "operator.pairing",
            ],
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
        this.startHeartbeat()
        return
      }
      this.onEvent?.(frame.event, frame.payload)
      return
    }

    if (frame.type === "response" || frame.type === "res") {
      const res = frame as {
        id: string
        ok?: boolean
        result?: unknown
        payload?: unknown
        error?: { code: string; message: string }
      }
      const pending = this.pendingRpc.get(res.id)
      if (pending) {
        this.pendingRpc.delete(res.id)
        clearTimeout(pending.timeout)
        if (res.ok === false || res.error) {
          pending.reject(new Error(`RPC error: ${res.error?.message ?? "unknown"}`))
        } else {
          pending.resolve(res.result ?? res.payload)
        }
        return
      }
      // Connect response
      if (res.ok !== false) {
        this.reconnectDelay = 1000
        this.onStatusChange?.("connected")
        const payload = res.payload as ConnectResult | undefined
        if (payload?.snapshot) {
          this.onConnect?.(payload)
        }
      }
    }
  }

  private sendRpc(method: string, params?: unknown, timeoutMs = 15000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("Not connected"))
        return
      }
      const id = uuid()
      const timeout = setTimeout(() => {
        this.pendingRpc.delete(id)
        reject(new Error(`RPC timeout: ${method}`))
      }, timeoutMs)
      this.pendingRpc.set(id, { resolve, reject, timeout })
      this.ws.send(JSON.stringify({ type: "req", id, method, params }))
    })
  }

  private clearPendingRpcs(reason: string) {
    for (const [id, pending] of this.pendingRpc) {
      clearTimeout(pending.timeout)
      pending.reject(new Error(reason))
      this.pendingRpc.delete(id)
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat()
    this.lastFrameAt = Date.now()
    this.heartbeatInterval = setInterval(() => {
      if (this.lastFrameAt && Date.now() - this.lastFrameAt > GatewayWebSocket.HEARTBEAT_STALE_MS) {
        console.warn("[gw-ws] No frames received for 30s, forcing reconnect")
        this.stopHeartbeat()
        this.ws?.close()
      }
    }, GatewayWebSocket.HEARTBEAT_CHECK_MS)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
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

export const gatewayWs = new GatewayWebSocket()

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

export function setupEventDispatch(handlers: EventDispatchHandlers): () => void {
  gatewayWs.setConnectHandler(handlers.onConnect)
  gatewayWs.setEventHandler((event, payload) => {
    console.log("[gw-event]", event, payload)
    switch (event) {
      case "health":
        handlers.onHealth(payload as HealthPayload)
        break
      case "cron":
        handlers.onCron()
        break
      case "sessions.changed":
        handlers.onSessionsChanged()
        break
      case "presence":
        handlers.onPresence(payload)
        break
      case "exec.approval.requested":
        handlers.onApprovalRequested(payload)
        break
      case "exec.approval.resolved":
        handlers.onApprovalResolved(payload)
        break
      default:
        if (event === "agent" || event.startsWith("chat.") || event.startsWith("session.")) {
          handlers.onChatEvent(event, payload)
        }
        break
    }
  })
  return () => {
    gatewayWs.setEventHandler(null)
    gatewayWs.setConnectHandler(null)
  }
}
