export type CronSessionTargetMode = "main" | "isolated" | "session" | "unsupported"

const SESSION_PREFIX = "session:"

export function parseCronSessionTarget(target: string | undefined): {
  mode: CronSessionTargetMode
  raw: string
  sessionId: string
} {
  const raw = target?.trim() || "isolated"
  if (raw === "main") return { mode: "main", raw, sessionId: "" }
  if (raw === "isolated") return { mode: "isolated", raw, sessionId: "" }
  if (raw.startsWith(SESSION_PREFIX)) {
    return { mode: "session", raw, sessionId: raw.slice(SESSION_PREFIX.length) }
  }
  return { mode: "unsupported", raw, sessionId: "" }
}

export function buildCronSessionTarget(
  mode: Exclude<CronSessionTargetMode, "unsupported">,
  sessionId = "",
): string {
  if (mode === "session") return `${SESSION_PREFIX}${sessionId.trim()}`
  return mode
}

export function formatCronSessionTarget(target: string | undefined): string {
  const parsed = parseCronSessionTarget(target)
  switch (parsed.mode) {
    case "main":
      return "Main"
    case "isolated":
      return "Isolated"
    case "session":
      return parsed.raw
    default:
      return parsed.raw
  }
}
