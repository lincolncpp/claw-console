import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { ChevronRight, ChevronDown } from "lucide-react"
import type { ToolCallData } from "@/types/terminal"

const statusVariants: Record<string, "default" | "secondary" | "destructive"> = {
  success: "default",
  running: "secondary",
  error: "destructive",
}

export function ToolCard({ tool }: { tool: ToolCallData }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="ml-[68px] my-1 border border-border rounded-md bg-card overflow-hidden" style={{ borderLeft: "2px solid rgb(167 139 250)" }}>
      <button
        type="button"
        className="flex items-center justify-between w-full px-3 py-1.5 text-left hover:bg-white/[0.02] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-3 w-3 text-violet-400" />
          ) : (
            <ChevronRight className="h-3 w-3 text-violet-400" />
          )}
          <span className="text-xs font-mono text-foreground/80">{tool.name}</span>
          <Badge variant={statusVariants[tool.status] ?? "secondary"} className="text-[10px] px-1.5 py-0">
            {tool.status}
          </Badge>
        </div>
        {tool.durationMs != null && (
          <span className="text-[10px] text-muted-foreground">{(tool.durationMs / 1000).toFixed(1)}s</span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-border px-3 py-2 text-xs font-mono space-y-2">
          {tool.args != null && (
            <div>
              <div className="text-muted-foreground text-[10px] mb-1">ARGS</div>
              <pre className="bg-zinc-900 rounded px-2 py-1 overflow-x-auto text-foreground/70 text-[11px]">
                {typeof tool.args === "string" ? tool.args : JSON.stringify(tool.args, null, 2)}
              </pre>
            </div>
          )}
          {tool.result != null && (
            <div>
              <div className="text-muted-foreground text-[10px] mb-1">RESULT</div>
              <pre className="bg-zinc-900 rounded px-2 py-1 overflow-x-auto text-foreground/70 text-[11px]">
                {typeof tool.result === "string" ? tool.result : JSON.stringify(tool.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
