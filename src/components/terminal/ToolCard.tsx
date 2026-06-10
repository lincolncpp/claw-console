import type { ToolCallData } from "@/types/terminal"

// Status is conveyed solely by the command box's left border.
const statusBorders: Record<string, string> = {
  running: "border-l-status-warning",
  success: "border-l-status-success",
  error: "border-l-status-error",
}

/** The command line itself: bash args carry it in `command`; live activity items pass a description string. */
function commandText(args: unknown): string {
  if (args == null) return ""
  if (typeof args === "string") return args
  if (typeof args === "object" && typeof (args as { command?: unknown }).command === "string") {
    return (args as { command: string }).command
  }
  return JSON.stringify(args, null, 2)
}

export function ToolCard({ tool }: { tool: ToolCallData }) {
  const command = commandText(tool.args) || tool.name

  return (
    <div className="flex gap-3 items-start px-2 py-0.5">
      <span className="shrink-0 w-20" />
      <div className="min-w-0 flex-1 space-y-1 text-[0.6875rem] font-mono">
        <pre
          className={`bg-muted rounded px-2 py-1 overflow-x-auto whitespace-pre-wrap break-words text-foreground/70 border-l-2 ${statusBorders[tool.status] ?? "border-l-muted-foreground/40"}`}
        >
          {command}
        </pre>
        {tool.result != null && (
          <pre className="bg-muted/60 rounded px-2 py-1 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-muted-foreground/70">
            {typeof tool.result === "string" ? tool.result : JSON.stringify(tool.result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}
