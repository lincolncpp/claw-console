# Agent Detail Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the agent detail page with a description-list layout, text action buttons, expanded edit modal (10 fields), and per-agent config patching.

**Architecture:** Replace the StatCard grid + Configuration card with a single Card using a `dl` grid (matching CronJobDetail pattern). Expand `AgentConfigDialog` to edit all displayed fields. Fix config patching to target per-agent entries in `agents.list` instead of global `agents.defaults`.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn-style UI components, lucide-react icons

---

### Task 1: Extend ConfigAgentEntry type and update data hook

**Files:**
- Modify: `src/types/agent.ts:68-77`
- Modify: `src/hooks/use-agents.ts:28-49`

- [ ] **Step 1: Extend ConfigAgentEntry to support per-agent compaction, subagents, and model-with-fallbacks**

In `src/types/agent.ts`, replace the `ConfigAgentEntry` interface (lines 68-77):

```typescript
export interface ConfigAgentEntry {
  id: string
  name?: string
  workspace?: string
  model?: string | { primary?: string; fallbacks?: string[] }
  thinkingDefault?: string
  timeoutSeconds?: number
  maxConcurrent?: number
  memorySearch?: { enabled?: boolean }
  compaction?: { mode?: string }
  subagents?: { maxConcurrent?: number; model?: string }
}
```

- [ ] **Step 2: Update useAgents to resolve per-agent overrides for compaction, fallbacks, and subagents**

In `src/hooks/use-agents.ts`, replace the `base.map()` callback (lines 28-49). Add `cfgModelFallbacks` extraction before the return, then update `model` to use `normalizeModel(cfg?.model)` (handles string|object), and update the four fields that currently only read from defaults:

```typescript
    return base.map((agent): AgentEntry => {
      const cfg = configList.find((c) => c.id === agent.id)
      const agentBindings = bindings
        .filter((b) => b.agentId === agent.id && b.match?.channel)
        .map((b) => b.match!.channel!)
      const uniqueChannels = [...new Set(agentBindings)]

      const cfgModelFallbacks =
        typeof cfg?.model === "object" && cfg.model !== null
          ? (cfg.model as { fallbacks?: string[] }).fallbacks
          : undefined

      return {
        ...agent,
        workspace: cfg?.workspace ?? defaults?.workspace,
        model: normalizeModel(cfg?.model) ?? defaults?.model?.primary ?? normalizeModel(agent.model),
        channels: uniqueChannels.length > 0 ? uniqueChannels : undefined,
        thinkingDefault: cfg?.thinkingDefault ?? defaults?.thinkingDefault,
        timeoutSeconds: cfg?.timeoutSeconds ?? defaults?.timeoutSeconds,
        maxConcurrent: cfg?.maxConcurrent ?? defaults?.maxConcurrent,
        memorySearchEnabled: cfg?.memorySearch?.enabled ?? defaults?.memorySearch?.enabled,
        fallbacks: cfgModelFallbacks ?? defaults?.model?.fallbacks,
        compactionMode: cfg?.compaction?.mode ?? defaults?.compaction?.mode,
        subagentsMaxConcurrent: cfg?.subagents?.maxConcurrent ?? defaults?.subagents?.maxConcurrent,
        subagentsModel: cfg?.subagents?.model ?? defaults?.subagents?.model,
      }
    })
```

Key change: `model` now uses `normalizeModel(cfg?.model)` instead of `cfg?.model` directly since per-agent model can be string or object. `normalizeModel` (already defined at line 19-26) handles both formats.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc -b --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/types/agent.ts src/hooks/use-agents.ts
git commit -m "feat: extend ConfigAgentEntry with compaction, subagents, and model fallbacks"
```

---

### Task 2: Rewrite AgentDetailPage with dl-grid layout and expanded edit modal

**Files:**
- Modify: `src/components/pages/AgentDetailPage.tsx:1-338` (full rewrite)

This task combines the layout redesign and the dialog expansion into a single file rewrite. The file has `noUnusedLocals: true` so a placeholder dialog would cause compile errors.

- [ ] **Step 1: Replace the entire AgentDetailPage.tsx file**

Write the complete new file content:

```tsx
import { useNavigate, useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { Bot, TriangleAlert, X } from "lucide-react"
import { extractAgentId } from "@/lib/session-utils"
import { formatDuration } from "@/lib/format"
import { formatRpcError } from "@/lib/errors"
import { gatewayWs } from "@/services/gateway-ws"
import { Breadcrumb } from "@/components/shared/Breadcrumb"
import { PageContent } from "@/components/shared/PageContent"
import { PageLoading } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { SessionsTable } from "@/components/shared/SessionsTable"
import { useAgents, useModels } from "@/hooks/use-agents"
import { useConfig } from "@/hooks/use-config"
import { useAgentMutations } from "@/hooks/use-agent-mutations"
import { useSessions, useSessionDelete } from "@/hooks/use-sessions"
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog"
import { useState, useEffect } from "react"
import type { AgentEntry } from "@/types/agent"

const selectClass =
  "h-8 w-full appearance-none rounded-lg border border-input bg-background px-2.5 py-1 text-sm text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"

function AgentConfigDialog({
  open,
  onClose,
  agent,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  agent: AgentEntry
  onSaved: () => void
}) {
  const { parsed, configHash } = useConfig()
  const { models } = useModels()
  const addToast = useErrorToastStore((s) => s.addToast)

  const [name, setName] = useState("")
  const [model, setModel] = useState("")
  const [thinking, setThinking] = useState("")
  const [timeout, setTimeout] = useState("")
  const [concurrency, setConcurrency] = useState("")
  const [memorySearch, setMemorySearch] = useState("")
  const [compaction, setCompaction] = useState("")
  const [fallbacks, setFallbacks] = useState<string[]>([])
  const [subagentModel, setSubagentModel] = useState("")
  const [subagentConcurrency, setSubagentConcurrency] = useState("")
  const [saving, setSaving] = useState(false)

  // Reset form state from raw per-agent config each time dialog opens
  useEffect(() => {
    if (!open) return
    const entry = parsed?.agents?.list?.find((c) => c.id === agent.id)
    const entryModel =
      typeof entry?.model === "object" && entry?.model !== null
        ? (entry.model as { primary?: string }).primary ?? ""
        : (entry?.model as string) ?? ""
    const entryFallbacks =
      typeof entry?.model === "object" && entry?.model !== null
        ? (entry.model as { fallbacks?: string[] }).fallbacks ?? []
        : []

    setName(entry?.name ?? "")
    setModel(entryModel)
    setThinking(entry?.thinkingDefault ?? "")
    setTimeout(String(entry?.timeoutSeconds ?? ""))
    setConcurrency(String(entry?.maxConcurrent ?? ""))
    setMemorySearch(
      entry?.memorySearch?.enabled != null
        ? entry.memorySearch.enabled
          ? "enabled"
          : "disabled"
        : "",
    )
    setCompaction(entry?.compaction?.mode ?? "")
    setFallbacks(entryFallbacks)
    setSubagentModel(entry?.subagents?.model ?? "")
    setSubagentConcurrency(String(entry?.subagents?.maxConcurrent ?? ""))
  }, [open, agent.id, parsed])

  const handleSave = async () => {
    setSaving(true)
    try {
      const currentList = parsed?.agents?.list ?? []

      // Build the updated per-agent entry
      const entry: Record<string, unknown> = { id: agent.id }
      if (name.trim()) entry.name = name.trim()

      // Preserve workspace from existing entry (not editable)
      const existing = currentList.find((c) => c.id === agent.id)
      if (existing?.workspace) entry.workspace = existing.workspace

      if (model) {
        entry.model =
          fallbacks.length > 0 ? { primary: model, fallbacks } : model
      }
      if (thinking) entry.thinkingDefault = thinking
      if (timeout) entry.timeoutSeconds = parseInt(timeout, 10)
      if (concurrency) entry.maxConcurrent = parseInt(concurrency, 10)
      if (memorySearch)
        entry.memorySearch = { enabled: memorySearch === "enabled" }
      if (compaction) entry.compaction = { mode: compaction }
      if (subagentModel || subagentConcurrency) {
        const sub: Record<string, unknown> = {}
        if (subagentModel) sub.model = subagentModel
        if (subagentConcurrency)
          sub.maxConcurrent = parseInt(subagentConcurrency, 10)
        entry.subagents = sub
      }

      // Replace existing entry or append new one
      const existingIdx = currentList.findIndex((c) => c.id === agent.id)
      const newList =
        existingIdx >= 0
          ? currentList.map((c, i) => (i === existingIdx ? entry : c))
          : [...currentList, entry]

      await gatewayWs.configPatch({ agents: { list: newList } }, configHash)
      onSaved()
      onClose()
    } catch (err) {
      addToast(`Failed to update config: ${formatRpcError(err)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Agent</DialogTitle>
          <DialogDescription>
            Update configuration for {agent.name ?? agent.id}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
              placeholder="Display name"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={selectClass}
            >
              <option value="">Use default</option>
              {models.map((m) => (
                <option key={m.id} value={`${m.provider}/${m.id}`}>
                  {m.provider}/{m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Thinking Default
            </label>
            <select
              value={thinking}
              onChange={(e) => setThinking(e.target.value)}
              className={selectClass}
            >
              <option value="">Use default</option>
              <option value="off">off</option>
              <option value="minimal">minimal</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="xhigh">xhigh</option>
              <option value="adaptive">adaptive</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">
                Timeout (seconds)
              </label>
              <Input
                type="number"
                min="1"
                value={timeout}
                onChange={(e) =>
                  setTimeout((e.target as HTMLInputElement).value)
                }
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Max Concurrent
              </label>
              <Input
                type="number"
                min="1"
                value={concurrency}
                onChange={(e) =>
                  setConcurrency((e.target as HTMLInputElement).value)
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">
                Memory Search
              </label>
              <select
                value={memorySearch}
                onChange={(e) => setMemorySearch(e.target.value)}
                className={selectClass}
              >
                <option value="">Use default</option>
                <option value="enabled">enabled</option>
                <option value="disabled">disabled</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Compaction Mode
              </label>
              <select
                value={compaction}
                onChange={(e) => setCompaction(e.target.value)}
                className={selectClass}
              >
                <option value="">Use default</option>
                <option value="auto">auto</option>
                <option value="full">full</option>
                <option value="none">none</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Fallback Models
            </label>
            {fallbacks.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {fallbacks.map((f, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-[0.625rem] px-1.5 py-0 gap-1"
                  >
                    {f}
                    <button
                      type="button"
                      onClick={() =>
                        setFallbacks(fallbacks.filter((_, j) => j !== i))
                      }
                      className="hover:text-destructive"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <select
              value=""
              onChange={(e) => {
                if (e.target.value && !fallbacks.includes(e.target.value)) {
                  setFallbacks([...fallbacks, e.target.value])
                }
              }}
              className={selectClass}
            >
              <option value="">Add fallback model...</option>
              {models
                .filter((m) => !fallbacks.includes(`${m.provider}/${m.id}`))
                .map((m) => (
                  <option key={m.id} value={`${m.provider}/${m.id}`}>
                    {m.provider}/{m.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">
                Subagent Model
              </label>
              <select
                value={subagentModel}
                onChange={(e) => setSubagentModel(e.target.value)}
                className={selectClass}
              >
                <option value="">Use default</option>
                {models.map((m) => (
                  <option key={m.id} value={`${m.provider}/${m.id}`}>
                    {m.provider}/{m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                Subagent Concurrency
              </label>
              <Input
                type="number"
                min="1"
                value={subagentConcurrency}
                onChange={(e) =>
                  setSubagentConcurrency(
                    (e.target as HTMLInputElement).value,
                  )
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <div className="flex items-center gap-1.5 text-xs text-warning mr-auto">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
            <span>Saving restarts the gateway</span>
          </div>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const [configOpen, setConfigOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const { agents, defaultId, isLoading: agentsLoading, refetch } = useAgents()
  const { deleteAgent } = useAgentMutations(defaultId)
  const {
    sessions,
    isLoading: sessionsLoading,
    refetch: sessionsRefetch,
  } = useSessions()
  const { deleteSession } = useSessionDelete(sessionsRefetch)

  const agentNameMap = new Map(agents.map((a) => [a.id, a.name ?? a.id]))
  const agent = agents.find((a) => a.id === agentId)
  const agentSessions = sessions.filter(
    (s) => extractAgentId(s.key) === agentId,
  )

  if (agentsLoading) return <PageLoading />

  if (!agent) {
    return (
      <PageContent>
        <Breadcrumb
          items={[
            { label: "Agents", to: "/agents" },
            { label: agentId ?? "Unknown" },
          ]}
        />
        <EmptyState icon={Bot} title={`Agent ${agentId} not found`} />
      </PageContent>
    )
  }

  return (
    <PageContent>
      <Breadcrumb
        items={[
          { label: "Agents", to: "/agents" },
          { label: agent.name ?? agent.id },
        ]}
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{agent.name ?? agent.id}</CardTitle>
            {agent.name && (
              <p className="text-sm text-muted-foreground">ID: {agent.id}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfigOpen(true)}
            >
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={agent.isDefault || agent.id === defaultId}
            >
              Delete
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Model</dt>
            <dd>{agent.model ?? "default"}</dd>

            <dt className="text-muted-foreground">Workspace</dt>
            <dd className="font-mono break-all">
              {agent.workspace ?? "--"}
            </dd>

            <dt className="text-muted-foreground">Channels</dt>
            <dd>
              {agent.channels?.length ? (
                <div className="flex gap-1 flex-wrap">
                  {agent.channels.map((ch) => (
                    <Badge
                      key={ch}
                      variant="outline"
                      className="text-[0.625rem] px-1.5 py-0"
                    >
                      {ch}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">--</span>
              )}
            </dd>

            <dt className="text-muted-foreground">Thinking</dt>
            <dd>{agent.thinkingDefault ?? "--"}</dd>

            <dt className="text-muted-foreground">Timeout</dt>
            <dd>
              {formatDuration(
                agent.timeoutSeconds
                  ? agent.timeoutSeconds * 1000
                  : undefined,
              )}
            </dd>

            <dt className="text-muted-foreground">Concurrency</dt>
            <dd>{agent.maxConcurrent ?? "--"}</dd>

            <dt className="text-muted-foreground">Memory Search</dt>
            <dd>
              {agent.memorySearchEnabled != null ? (
                <Badge
                  variant={
                    agent.memorySearchEnabled ? "default" : "secondary"
                  }
                  className="text-[0.625rem] px-1.5 py-0"
                >
                  {agent.memorySearchEnabled ? "on" : "off"}
                </Badge>
              ) : (
                "--"
              )}
            </dd>

            <dt className="text-muted-foreground">Compaction</dt>
            <dd>{agent.compactionMode ?? "--"}</dd>

            <dt className="text-muted-foreground">Fallbacks</dt>
            <dd>
              {agent.fallbacks?.length ? (
                <div className="flex gap-1 flex-wrap">
                  {agent.fallbacks.map((f) => (
                    <Badge
                      key={f}
                      variant="outline"
                      className="text-[0.625rem] px-1.5 py-0"
                    >
                      {f}
                    </Badge>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">--</span>
              )}
            </dd>

            <dt className="text-muted-foreground">Subagent Model</dt>
            <dd>{agent.subagentsModel ?? "--"}</dd>

            <dt className="text-muted-foreground">Subagent Concurrency</dt>
            <dd>{agent.subagentsMaxConcurrent ?? "--"}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm font-medium">Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionsTable
            sessions={agentSessions}
            agentNameMap={agentNameMap}
            deleteSession={deleteSession}
            isLoading={sessionsLoading}
            emptyMessage="No sessions for this agent"
            hideAgentColumn
          />
        </CardContent>
      </Card>

      <AgentConfigDialog
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        agent={agent}
        onSaved={refetch}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={async () => {
          await deleteAgent(agent.id)
          navigate("/agents")
        }}
        targetLabel={agent.name ?? agent.id}
        title="Delete Agent"
        description="Permanently remove this agent and its channel bindings? Existing sessions will remain."
      />
    </PageContent>
  )
}
```

**What changed from the original file:**

Imports removed: `StatCard`, `Cpu`, `FolderOpen`, `Hash`, `MessageSquare`, `Settings`, `Trash2`

Imports added: `X` (fallback badge removal), `useConfig` from `@/hooks/use-config`, `useEffect`

Components removed: `ConfigRow` helper

**AgentDetailPage changes:**
- Removed `configHash` from `useAgents()` destructuring — dialog gets it from `useConfig()` directly
- Removed StatCard grid — replaced with single `Card` using `dl` grid (`grid-cols-[auto_1fr]`)
- Workspace displays with `font-mono break-all` — long paths wrap instead of truncating
- Text action buttons ("Edit" / "Delete") with `size="sm" variant="outline"` — matches CronJobDetail pattern
- Removed Configuration card — all config is in the `dl` grid

**AgentConfigDialog changes:**
- Calls `useConfig()` directly — gets `parsed` and `configHash` without prop drilling
- 10 editable fields: name, model, thinking, timeout, concurrency, memory search, compaction, fallbacks, subagent model, subagent concurrency
- `useEffect` resets form state from raw per-agent config each time dialog opens
- `selectClass` const DRYs the repeated Tailwind class string (used 6 times)
- `handleSave` patches per-agent entry in `agents.list` (not `agents.defaults`)
- Workspace preserved from existing entry but never exposed in form
- Fallback models: select-to-add dropdown + removable badges with X buttons
- Dialog width increased to `sm:max-w-md` to fit the extra fields

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc -b --noEmit`
Expected: no errors

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`

1. Open agent detail page — workspace should display fully without truncation
2. Click "Edit" — all 10 fields should appear, pre-populated with per-agent values (empty = "Use default")
3. Change a field and save — verify the patch targets the per-agent entry (not defaults)
4. "Delete" button should be disabled for the default agent
5. Sessions table should still render correctly
6. Test with an agent that has no per-agent overrides — all fields should show "Use default" or be empty

- [ ] **Step 4: Commit**

```bash
git add src/components/pages/AgentDetailPage.tsx
git commit -m "feat: redesign agent detail page with dl-grid layout and expanded edit modal"
```
