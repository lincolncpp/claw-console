import { useState, useRef, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Breadcrumb } from "@/components/shared/Breadcrumb"
import { PageContent } from "@/components/shared/PageContent"
import {
  useHeartbeatAgents,
  useHeartbeatConfig,
  useLastHeartbeat,
} from "@/hooks/use-heartbeat"
import { EditHeartbeatDialog } from "@/components/heartbeat/EditHeartbeatDialog"
import { formatTimeAgo } from "@/lib/format"
import { Settings, Pencil, Check, X } from "lucide-react"

export function HeartbeatDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const { agents } = useHeartbeatAgents()
  const { config, updateConfig } = useHeartbeatConfig(agentId ?? "")
  const { data: lastHeartbeat } = useLastHeartbeat(agentId)

  const agent = agents.find((a) => a.agentId === agentId)

  const [editOpen, setEditOpen] = useState(false)
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

  const renderBool = (v?: boolean) => (v == null ? "--" : v ? "Yes" : "No")

  const effectivePrompt = config.prompt ?? heartbeat.prompt

  const configFields = [
    { label: "Interval", value: (() => { const v = config.every ?? heartbeat.every; return v === "disabled" || v === "0m" ? "--" : v })() },
    { label: "Target", value: config.target ?? heartbeat.target },
    { label: "Model", value: config.model ?? "agent default" },
    { label: "Session", value: config.session ?? "main" },
    { label: "Ack Max Chars", value: String(config.ackMaxChars ?? heartbeat.ackMaxChars) },
    { label: "Isolated Session", value: renderBool(config.isolatedSession) },
    { label: "Light Context", value: renderBool(config.lightContext) },
    { label: "Direct Policy", value: config.directPolicy ?? "allow" },
    { label: "Include Reasoning", value: renderBool(config.includeReasoning) },
  ]

  const lastHb = lastHeartbeat as { ts?: number } | null

  return (
    <PageContent>
      <Breadcrumb
        items={[
          { label: "Heartbeats", to: "/heartbeats" },
          { label: agent.name || agentId },
        ]}
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
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-x-6 gap-y-3">
            {configFields.map((field) => (
              <div key={field.label}>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                  {field.label}
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
              <div>
                <Badge variant="outline" className="text-xs">
                  {String((lastHeartbeat as Record<string, unknown>).status ?? "unknown")}
                </Badge>
              </div>
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
    </PageContent>
  )
}
