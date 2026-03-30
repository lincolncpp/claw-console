import type { HealthResponse, SystemInfo, StatusResponse } from "@/types/gateway"

// Uses Vite dev proxy - all requests go to same origin, proxy forwards to gateway
async function fetchWithTimeout(
  path: string,
  options: RequestInit = {},
  timeoutMs = 5000,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(path, { ...options, signal: controller.signal })
    if (!res.ok) {
      throw new GatewayError(res.status, `${res.status} ${res.statusText}`)
    }
    return res
  } finally {
    clearTimeout(timer)
  }
}

export class GatewayError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message)
    this.name = "GatewayError"
  }
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetchWithTimeout("/healthz")
  return res.json()
}

export async function getSystemInfo(token: string): Promise<SystemInfo> {
  const res = await fetchWithTimeout("/api/system", {
    headers: authHeaders(token),
  })
  return res.json()
}

export async function getStatus(): Promise<StatusResponse> {
  const res = await fetchWithTimeout("/api/status")
  return res.json()
}
