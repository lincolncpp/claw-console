import type { HealthResponse, StatusResponse } from "@/types/gateway"

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

class GatewayError extends Error {
  statusCode: number
  constructor(statusCode: number, message: string) {
    super(message)
    this.name = "GatewayError"
    this.statusCode = statusCode
  }
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` }
}

export async function checkHealth(): Promise<HealthResponse> {
  const res = await fetchWithTimeout("/healthz")
  return res.json()
}

export async function getSystemInfo(token: string): Promise<unknown> {
  const res = await fetchWithTimeout("/api/system", {
    headers: authHeaders(token),
  })
  return res.json()
}

export async function getStatus(): Promise<StatusResponse> {
  const res = await fetchWithTimeout("/api/status")
  return res.json()
}
