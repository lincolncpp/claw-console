export type CronSessionTargetMode = "main" | "isolated" | "session" | "unsupported"

const SESSION_PREFIX = "session:"
const RUN_SEGMENT = ":run:"

/**
 * Cron runs execute on per-run child lanes ("agent:<a>:cron:<job>:run:<id>")
 * that are never persisted as session rows; only the parent cron session key
 * is resolvable via chat.history, and it always holds the latest run.
 */
export function cronRunParentSessionKey(sessionKey: string): string {
  const idx = sessionKey.indexOf(RUN_SEGMENT)
  return idx === -1 ? sessionKey : sessionKey.slice(0, idx)
}

/** Agent id embedded in an "agent:<id>:..." session key. */
export function agentIdFromSessionKey(sessionKey: string): string {
  const parts = sessionKey.split(":")
  return parts[0] === "agent" && parts[1] ? parts[1] : sessionKey
}

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
