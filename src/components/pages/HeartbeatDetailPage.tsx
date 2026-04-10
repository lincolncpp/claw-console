import { useState, useRef, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb } from "@/components/shared/Breadcrumb"
import { PageContent } from "@/components/shared/PageContent"
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog"
import {
  useHeartbeatAgents,
  useHeartbeatConfig,
  useHeartbeatDefaults,
  useLastHeartbeat,
} from "@/hooks/use-heartbeat"
import { EditHeartbeatDialog } from "@/components/heartbeat/EditHeartbeatDialog"
import { formatTimeAgo } from "@/lib/format"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Settings, Pencil, Check, X, Trash2, Info } from "lucide-react"

export function HeartbeatDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const { agents } = useHeartbeatAgents()
  const { config, updateConfig, deleteConfig } = useHeartbeatConfig(agentId ?? "")
  const { defaults } = useHeartbeatDefaults()
  const { data: lastHeartbeat } = useLastHeartbeat(agentId)
  const navigate = useNavigate()

  const agent = agents.find((a) => a.agentId === agentId)

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [editing])

  if (!agentId) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No agent selected.</p>
  }

  if (!agent) {
    return (
      <PageContent>
        <Breadcrumb items={[{ label: "Heartbeats", to: "/heartbeats" }, { label: agentId }]} />
        <p className="py-8 text-center text-sm text-muted-foreground">
          Agent not found or has no heartbeat configuration.
        </p>
      </PageContent>
    )
  }

  const { heartbeat } = agent
  const isActive = heartbeat.enabled && (heartbeat.everyMs ?? 0) > 0

  const handleSavePrompt = async () => {
    try {
      await updateConfig({ prompt: draft })
      setEditing(false)
    } catch {
      // error toast handled by updateConfig
    }
  }

  const renderBool = (v: boolean | undefined, dv: boolean | undefined) => {
    const resolved = v ?? dv
    return resolved == null ? "No" : resolved ? "Yes" : "No"
  }

  const effectivePrompt = config.prompt ?? heartbeat.prompt

  const configFields = [
    {
      label: "Interval",
      value: config.every ?? heartbeat.every,
      tip: "How often the heartbeat runs. Use 0m to disable.",
    },
    {
      label: "Target",
      value: config.target ?? heartbeat.target,
      tip: "Where heartbeat messages are delivered: last contact, a specific channel, or none.",
    },
    {
      label: "Model",
      value: config.model ?? "Default",
      tip: "Model used for heartbeat runs. Defaults to the global heartbeat model, then the agent's own model.",
    },
    {
      label: "Session",
      value: config.session ?? "Default",
      tip: "Session key for heartbeat runs. Defaults to main.",
    },
    {
      label: "Ack Max Chars",
      value: String(config.ackMaxChars ?? defaults.ackMaxChars ?? heartbeat.ackMaxChars),
      tip: "Replies under this length containing HEARTBEAT_OK are suppressed. Longer replies are delivered as alerts.",
    },
    {
      label: "Isolated Session",
      value: renderBool(config.isolatedSession, defaults.isolatedSession),
      tip: "When enabled, each heartbeat runs in a fresh session with no conversation history. Reduces token cost significantly.",
    },
    {
      label: "Light Context",
      value: renderBool(config.lightContext, defaults.lightContext),
      tip: "When enabled, only HEARTBEAT.md is injected from workspace bootstrap files, reducing context size.",
    },
    {
      label: "Direct Policy",
      value: config.directPolicy ?? defaults.directPolicy ?? "allow",
      tip: "Controls DM delivery: allow permits direct-target delivery, block suppresses it.",
    },
    {
      label: "Include Reasoning",
      value: renderBool(config.includeReasoning, defaults.includeReasoning),
      tip: "When enabled, delivers a separate Reasoning message alongside the heartbeat response.",
    },
  ]

  const lastHb = lastHeartbeat as { ts?: number } | null

  return (
    <PageContent>
      <Breadcrumb
        items={[{ label: "Heartbeats", to: "/heartbeats" }, { label: agent.name || agentId }]}
      />

      {/* Config Card */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>
              {agent.name || agentId}
              {agent.isDefault && (
                <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 align-middle">
                  default
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">Agent heartbeat configuration</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
              {isActive ? "Active" : "Inactive"}
            </Badge>
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              <Settings className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-x-6 gap-y-3">
            {configFields.map((field) => (
              <div key={field.label}>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide inline-flex items-center gap-1">
                  {field.label}
                  <Tooltip>
                    <TooltipTrigger
                      render={<Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />}
                    />
                    <TooltipContent className="max-w-60">{field.tip}</TooltipContent>
                  </Tooltip>
                </p>
                <p className="text-sm mt-0.5">{field.value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prompt Card */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Heartbeat Prompt</p>
            {!editing && (
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0"
                onClick={() => {
                  setDraft(effectivePrompt)
                  setEditing(true)
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
          </div>
          {editing ? (
            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                className="w-full rounded-md border border-border bg-background p-2 text-xs font-mono leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  e.target.style.height = "auto"
                  e.target.style.height = e.target.scrollHeight + "px"
                }}
              />
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs px-2"
                  onClick={handleSavePrompt}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs px-2"
                  onClick={() => setEditing(false)}
                >
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs font-mono leading-relaxed text-muted-foreground">
              {effectivePrompt}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Last Heartbeat Card */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Last Heartbeat</p>
            {lastHb?.ts && (
              <span className="text-xs text-muted-foreground">{formatTimeAgo(lastHb.ts)}</span>
            )}
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            {lastHeartbeat != null ? (
              (() => {
                const hb = lastHeartbeat as Record<string, unknown>
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {String(hb.status ?? "unknown")}
                      </Badge>
                      {hb.reason != null && (
                        <span className="text-xs text-muted-foreground">
                          reason: {String(hb.reason)}
                        </span>
                      )}
                      {hb.agentId != null && (
                        <span className="text-xs text-muted-foreground">{String(hb.agentId)}</span>
                      )}
                    </div>
                    {hb.text != null && (
                      <div className="text-xs font-mono leading-relaxed text-muted-foreground whitespace-pre-wrap">
                        {String(hb.text)}
                      </div>
                    )}
                  </div>
                )
              })()
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No data available yet. Heartbeat results will appear here after the next run.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <EditHeartbeatDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        config={config}
        onSave={updateConfig}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await deleteConfig()
          navigate("/heartbeats")
        }}
        targetLabel={agent.name || agentId}
        title="Remove Heartbeat"
        description="Remove heartbeat configuration from this agent? The agent will no longer run heartbeats."
      />
    </PageContent>
  )
}
