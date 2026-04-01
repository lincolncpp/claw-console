import type { ToolCallData } from "@/types/terminal"

const statusColors: Record<string, string> = {
  running: "text-status-warning",
  success: "text-status-success",
  error: "text-status-error",
}

export function ToolCard({ tool }: { tool: ToolCallData }) {
  const duration = tool.durationMs != null ? ` (${(tool.durationMs / 1000).toFixed(1)}s)` : ""

  return (
    <div className="flex gap-3 items-start px-2 py-0.5">
      <span className="shrink-0 w-20" />
      <details>
        <summary className="text-[0.6875rem] text-muted-foreground/60 cursor-pointer select-none hover:text-muted-foreground transition-colors">
          {tool.name}
          <span className={statusColors[tool.status] ?? "text-muted-foreground/60"}>
            {" "}{tool.status}
          </span>
          {duration}
        </summary>
        <div className="mt-1 pl-2 border-l border-muted-foreground/20 text-muted-foreground/50 text-[0.75rem] font-mono space-y-2">
          {tool.args != null && (
            <div>
              <div className="text-muted-foreground/40 text-[0.625rem] mb-0.5">ARGS</div>
              <pre className="bg-muted rounded px-2 py-1 overflow-x-auto text-foreground/70 text-[0.6875rem]">
                {typeof tool.args === "string" ? tool.args : JSON.stringify(tool.args, null, 2)}
              </pre>
            </div>
          )}
          {tool.result != null && (
            <div>
              <div className="text-muted-foreground/40 text-[0.625rem] mb-0.5">RESULT</div>
              <pre className="bg-muted rounded px-2 py-1 overflow-x-auto text-foreground/70 text-[0.6875rem]">
                {typeof tool.result === "string"
                  ? tool.result
                  : JSON.stringify(tool.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </details>
    </div>
  )
}
