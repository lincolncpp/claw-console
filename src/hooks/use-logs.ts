import { useCallback, useEffect, useRef, useState } from "react"
import { useGatewayStore } from "@/stores/gateway-store"
import { gatewayWs } from "@/services/gateway-ws"
import { isScopeError } from "@/lib/errors"
import type { LogLine } from "@/types/log"

const MAX_LINES = 1000

function parseLine(raw: string): LogLine {
  try {
    const outer = JSON.parse(raw)

    // tslog format: "0" = subsystem JSON, "1" = data/message, "2" = message, _meta, time
    let subsystem: string | undefined
    if (typeof outer["0"] === "string") {
      try {
        const parsed = JSON.parse(outer["0"])
        subsystem = parsed.subsystem ?? parsed.module
      } catch {
        // "0" is a plain string (e.g. error messages) — used as message fallback below
      }
    }

    const level = outer._meta?.logLevelName?.toLowerCase() ?? outer.level ?? "info"

    const message =
      (typeof outer["2"] === "string" ? outer["2"] : undefined) ??
      (typeof outer["1"] === "string" ? outer["1"] : undefined) ??
      (typeof outer["0"] === "string" && !subsystem ? outer["0"] : undefined) ??
      outer.message ??
      outer.msg ??
      raw

    return {
      raw,
      subsystem,
      level,
      message,
      timestamp: outer.time ?? outer.timestamp ?? outer.ts,
    }
  } catch {
    return { raw, message: raw }
  }
}

interface UseLogsOptions {
  paused?: boolean
}

export function useLogs(options?: UseLogsOptions) {
  const connectionStatus = useGatewayStore((s) => s.connectionStatus)
  const [lines, setLines] = useState<LogLine[]>([])
  const [loading, setLoading] = useState(true)
  const [scopeError, setScopeError] = useState(false)
  const [lineCount, setLineCount] = useState(0)
  const cursorRef = useRef<number | undefined>(undefined)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const paused = options?.paused ?? false

  const fetchLogs = useCallback(async () => {
    if (connectionStatus !== "connected" || paused) return
    try {
      const resp = await gatewayWs.logsTail(cursorRef.current)
      if (resp.lines && resp.lines.length > 0) {
        const parsed = resp.lines.map(parseLine)
        setLines((prev) => {
          const next = [...prev, ...parsed]
          return next.length > MAX_LINES ? next.slice(-MAX_LINES) : next
        })
        setLineCount((c) => c + resp.lines.length)
      }
      cursorRef.current = resp.cursor
      setLoading(false)
    } catch (err: unknown) {
      if (isScopeError(err)) {
        setScopeError(true)
        setLoading(false)
      }
    }
  }, [connectionStatus, paused])

  useEffect(() => {
    if (connectionStatus !== "connected") return
    fetchLogs()
    intervalRef.current = setInterval(fetchLogs, 3000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchLogs, connectionStatus])

  return { lines, loading, scopeError, lineCount }
}
