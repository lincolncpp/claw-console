export interface WsRpcRequest {
  type: "request" | "req"
  id: string | number
  method: string
  params?: unknown
}

export interface WsRpcResponse {
  type: "response" | "res"
  id: string | number
  ok?: boolean
  result?: unknown
  payload?: unknown
  error?: { code: string; message: string }
}

export interface WsEvent {
  type: "event"
  event: string
  payload?: unknown
  seq?: number
  stateVersion?: unknown
}

export interface WsConnectChallenge {
  type: "event"
  event: "connect.challenge"
  payload: { nonce: string; ts: number }
}

export type GatewayFrame = WsRpcRequest | WsRpcResponse | WsEvent
