export function extractAgentId(key: string): string {
  const parts = key.split(":")
  return parts[1] ?? "unknown"
}

export function extractSessionType(key: string): string {
  const parts = key.split(":")
  return parts[2] ?? "session"
}
