export interface WsRpcRequest {
  type: "request"
  id: number
  method: string
  params?: unknown
}

export interface WsRpcResponse {
  type: "response"
  id: number
  result?: unknown
  error?: { code: number; message: string }
}

export interface WsEvent {
  type: "event"
  event: string
  payload?: unknown
  seq?: number
  stateVersion?: number
}

export interface WsConnectChallenge {
  type: "event"
  event: "connect.challenge"
  payload: { nonce: string; ts: number }
}

export interface WsConnectParams {
  type: "connect"
  token: string
  role?: string
  scope?: string
}

export type GatewayFrame = WsRpcRequest | WsRpcResponse | WsEvent
