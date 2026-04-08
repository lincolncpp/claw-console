import { useState, useRef, useEffect } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Breadcrumb } from "@/components/shared/Breadcrumb"
import { PageContent } from "@/components/shared/PageContent"
import {
  useHeartbeatAgents,
  useHeartbeatConfig,
  useHeartbeatDefaults,
  useLastHeartbeat,
} from "@/hooks/use-heartbeat"
import { EditHeartbeatDialog } from "@/components/heartbeat/EditHeartbeatDialog"
import { gatewayWs } from "@/services/gateway-ws"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { formatRpcError } from "@/lib/errors"
import { formatTimeAgo } from "@/lib/format"
import { Settings, Pencil, Check, X } from "lucide-react"

export function HeartbeatDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const { agents } = useHeartbeatAgents()
  const { config, updateConfig } = useHeartbeatConfig(agentId ?? "")
  const { defaults, configHash, refetch } = useHeartbeatDefaults()
  const { data: lastHeartbeat } = useLastHeartbeat(agentId)
  const addToast = useErrorToastStore((s) => s.addToast)

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

  const handleToggle = async () => {
    try {
      const newEvery = heartbeat.enabled ? "0m" : (defaults.every ?? "30m")
      await gatewayWs.configPatch(
        { agents: { list: [{ id: agentId, heartbeat: { every: newEvery } }] } },
        configHash,
      )
      refetch()
    } catch (err) {
      addToast(`Failed to toggle heartbeat: ${formatRpcError(err)}`)
    }
  }

  const handleSavePrompt = async () => {
    try {
      await updateConfig({ prompt: draft })
      setEditing(false)
    } catch {
      // error toast handled by updateConfig
    }
  }

  const configFields = [
    { label: "Interval", value: heartbeat.every },
    { label: "Target", value: heartbeat.target },
    { label: "Model", value: config.model ?? "agent default" },
    { label: "Session", value: config.session ?? "main" },
    { label: "Ack Max Chars", value: String(heartbeat.ackMaxChars) },
    { label: "Isolated Session", value: config.isolatedSession ? "Yes" : "No" },
    { label: "Light Context", value: config.lightContext ? "Yes" : "No" },
    { label: "Direct Policy", value: config.directPolicy ?? "allow" },
    { label: "Include Reasoning", value: config.includeReasoning ? "Yes" : "No" },
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
            <div className="flex items-center gap-2 cursor-pointer" onClick={handleToggle}>
              <Switch checked={heartbeat.enabled} className="pointer-events-none" />
              <span className="text-xs text-muted-foreground">
                {heartbeat.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
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
                  setDraft(heartbeat.prompt)
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
              {heartbeat.prompt}
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
        heartbeatEnabled={heartbeat.enabled}
        onSave={updateConfig}
      />
    </PageContent>
  )
}
