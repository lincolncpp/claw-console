import WebSocket from "ws"

const host = process.env.VITE_GATEWAY_HOST || "127.0.0.1"
const port = process.env.VITE_GATEWAY_PORT || "18789"
const token = process.env.VITE_GATEWAY_TOKEN || ""

export const gatewayHttpBase = `http://${host}:${port}`
export const gatewayWsUrl = `ws://${host}:${port}/`

export function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${token}` }
}

interface PendingRpc {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timeout: ReturnType<typeof setTimeout>
}

export class TestGatewayClient {
  private ws: WebSocket | null = null
  private pending = new Map<string, PendingRpc>()
  private connected = false

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(gatewayWsUrl, {
        headers: { Origin: gatewayHttpBase },
      })
      this.ws = ws

      const timeout = setTimeout(() => {
        ws.close()
        reject(new Error("Connection timeout"))
      }, 15_000)

      ws.on("error", (err) => {
        clearTimeout(timeout)
        reject(err)
      })

      ws.on("message", (data) => {
        const frame = JSON.parse(data.toString())

        // Handle challenge → send connect
        if (frame.type === "event" && frame.event === "connect.challenge") {
          const connectMsg = {
            type: "req",
            id: randomId(),
            method: "connect",
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: {
                id: "openclaw-control-ui",
                version: "1.0.0",
                platform: "node",
                mode: "test",
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
              locale: "en-US",
              userAgent: "vitest",
            },
          }
          ws.send(JSON.stringify(connectMsg))
          return
        }

        // Handle hello → connected
        if (
          frame.type === "event" &&
          (frame.event === "connect.hello" ||
            frame.event === "hello" ||
            frame.event === "hello-ok")
        ) {
          this.connected = true
          clearTimeout(timeout)
          resolve()
          return
        }

        // Handle connect response (also marks connected)
        if (frame.type === "response" || frame.type === "res") {
          const res = frame as {
            id: string
            ok?: boolean
            result?: unknown
            payload?: unknown
            error?: { code: string; message: string }
          }

          // Check if it's a pending RPC response
          const rpc = this.pending.get(res.id)
          if (rpc) {
            this.pending.delete(res.id)
            clearTimeout(rpc.timeout)
            if (res.ok === false || res.error) {
              rpc.reject(new Error(`RPC error: ${res.error?.message ?? "unknown"}`))
            } else {
              rpc.resolve(res.result ?? res.payload)
            }
            return
          }

          // Connect response
          if (res.ok === false || res.error) {
            clearTimeout(timeout)
            reject(new Error(`Connect failed: ${res.error?.message ?? JSON.stringify(res)}`))
            return
          }
          if (!this.connected) {
            this.connected = true
            clearTimeout(timeout)
            resolve()
          }
        }
      })
    })
  }

  async sendRpc(method: string, params?: unknown): Promise<unknown> {
    if (!this.ws || !this.connected) {
      throw new Error("Not connected")
    }
    return new Promise((resolve, reject) => {
      const id = randomId()
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`RPC timeout: ${method}`))
      }, 15_000)
      this.pending.set(id, { resolve, reject, timeout })
      this.ws!.send(JSON.stringify({ type: "req", id, method, params }))
    })
  }

  close() {
    for (const [id, rpc] of this.pending) {
      clearTimeout(rpc.timeout)
      rpc.reject(new Error("Client closed"))
      this.pending.delete(id)
    }
    this.ws?.close()
    this.ws = null
    this.connected = false
  }
}

let counter = 0
function randomId(): string {
  return `test-${Date.now()}-${counter++}`
}
