import { useEffect, useRef, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/shared/EmptyState"
import { LoadingBlock } from "@/components/shared/LoadingSpinner"
import { PageHeader } from "@/components/shared/PageHeader"
import { TableFooter } from "@/components/shared/TableFooter"
import { useLogs } from "@/hooks/use-logs"
import { ScrollText, Pause, Play, ArrowDown } from "lucide-react"

const levelColors: Record<string, string> = {
  error: "text-status-error",
  warn: "text-status-warning",
  info: "text-status-info",
  debug: "text-muted-foreground",
}

export function LogsPage() {
  const [paused, setPaused] = useState(false)
  const [filter, setFilter] = useState("")
  const [levelFilter, setLevelFilter] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const autoScrollRef = useRef(true)

  const { lines, isLoading, scopeError, lineCount } = useLogs({ paused })

  useEffect(() => {
    if (autoScrollRef.current) {
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView())
    }
  }, [lineCount])

  useEffect(() => {
    if (!isLoading) {
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView())
    }
  }, [isLoading])

  if (scopeError) return <EmptyState scope="operator.read" icon={ScrollText} title="" />

  const filtered = lines.filter((l) => {
    if (levelFilter && l.level !== levelFilter) return false
    if (filter && !(l.message ?? l.raw).toLowerCase().includes(filter.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-col h-full">
      <div className="mb-3">
        <PageHeader
          breadcrumbs={[{ label: "Logs" }]}
          subtitle={`${lines.length} lines loaded`}
        />
      </div>

      <div className="flex-1 flex flex-col rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <LoadingBlock className="h-full" />
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
                  {line.timestamp && (
                    <span className="shrink-0 text-muted-foreground/60 whitespace-nowrap">
                      {new Date(line.timestamp).toLocaleTimeString()}
                    </span>
                  )}
                  {line.level && (
                    <span
                      className={`shrink-0 w-12 text-right ${levelColors[line.level] ?? "text-muted-foreground"}`}
                    >
                      {line.level}
                    </span>
                  )}
                  <span className="shrink-0 text-muted-foreground w-32 truncate">
                    {line.subsystem ?? ""}
                  </span>
                  <span className="text-foreground/90 break-all">{line.message ?? line.raw}</span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        )}
        <TableFooter className="gap-3 shrink-0 rounded-t-none mt-0 -mx-0 -mb-0 px-3 py-2">
          <div className="flex gap-1">
            {["error", "warn", "info", "debug"].map((level) => (
              <Badge
                key={level}
                variant={levelFilter === level ? "default" : "outline"}
                className="cursor-pointer text-[0.625rem] px-1.5 py-0"
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
            className="w-48 h-7 text-xs ml-auto"
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
        </TableFooter>
      </div>
    </div>
  )
}
