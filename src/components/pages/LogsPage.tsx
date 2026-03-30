import { useCallback, useEffect, useRef, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useGatewayStore } from "@/stores/gateway-store"
import { gatewayWs } from "@/services/gateway-ws"
import { ScrollText, Pause, Play, Loader2, ArrowDown } from "lucide-react"
import type { LogLine } from "@/types/log"

const MAX_LINES = 1000

function parseLine(raw: string): LogLine {
  try {
    const outer = JSON.parse(raw)
    // Gateway logs are sometimes double-encoded
    const inner = typeof outer["0"] === "string" ? JSON.parse(outer["0"]) : outer
    return {
      raw,
      subsystem: inner.subsystem ?? inner.component,
      level: inner.level ?? "info",
      message: inner.message ?? inner.msg ?? raw,
      timestamp: inner.timestamp ?? inner.ts ?? inner.time,
    }
  } catch {
    return { raw, message: raw }
  }
}

const levelColors: Record<string, string> = {
  error: "text-red-400",
  warn: "text-amber-400",
  info: "text-blue-400",
  debug: "text-zinc-500",
}

function ScopeMessage() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <ScrollText className="h-8 w-8 mb-3 opacity-50" />
      <p className="text-sm">
        Requires <code className="bg-muted px-1.5 py-0.5 rounded text-xs">operator.read</code> scope
      </p>
      <p className="text-xs mt-1 opacity-70">
        Update your gateway token configuration to enable this section.
      </p>
    </div>
  )
}

export function LogsPage() {
  const connectionStatus = useGatewayStore((s) => s.connectionStatus)
  const [lines, setLines] = useState<LogLine[]>([])
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState("")
  const [levelFilter, setLevelFilter] = useState<string | null>(null)
  const [scopeError, setScopeError] = useState(false)
  const [loading, setLoading] = useState(true)
  const cursorRef = useRef<number | undefined>(undefined)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

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
        if (autoScrollRef.current) {
          requestAnimationFrame(() => bottomRef.current?.scrollIntoView())
        }
      }
      cursorRef.current = resp.cursor
      setLoading(false)
    } catch (err: unknown) {
      const msg = (err as Error).message ?? ""
      if (msg.includes("missing scope")) {
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

  if (scopeError) return <ScopeMessage />

  const filtered = lines.filter((l) => {
    if (levelFilter && l.level !== levelFilter) return false
    if (filter && !(l.message ?? l.raw).toLowerCase().includes(filter.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Logs</h2>
          <p className="text-xs text-muted-foreground">{lines.length} lines loaded</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {["error", "warn", "info", "debug"].map((level) => (
              <Badge
                key={level}
                variant={levelFilter === level ? "default" : "outline"}
                className="cursor-pointer text-[10px] px-1.5 py-0"
                onClick={() => setLevelFilter(levelFilter === level ? null : level)}
              >
                {level}
              </Badge>
            ))}
          </div>
          <Input
            placeholder="Filter..."
            value={filter}
            onChange={(e) => setFilter((e.target as HTMLInputElement).value)}
            className="w-48 h-8 text-xs"
          />
          <Button variant="outline" size="xs" onClick={() => setPaused(!paused)}>
            {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              autoScrollRef.current = true
              bottomRef.current?.scrollIntoView({ behavior: "smooth" })
            }}
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="flex-1 rounded-lg border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea
            className="h-full"
            onScrollCapture={() => {
              autoScrollRef.current = false
            }}
          >
            <div className="p-3 font-mono text-xs space-y-px">
              {filtered.map((line, i) => (
                <div key={i} className="flex gap-2 leading-5 hover:bg-muted/30 px-1 rounded">
                  {line.level && (
                    <span
                      className={`shrink-0 w-12 text-right ${levelColors[line.level] ?? "text-muted-foreground"}`}
                    >
                      {line.level}
                    </span>
                  )}
                  {line.subsystem && (
                    <span className="shrink-0 text-muted-foreground w-32 truncate">
                      {line.subsystem}
                    </span>
                  )}
                  <span className="text-foreground/90 break-all">{line.message ?? line.raw}</span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
