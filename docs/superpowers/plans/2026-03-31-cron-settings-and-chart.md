# Cron Settings & Runs-by-Agent Chart — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a settings panel (view/edit) and a pie chart showing cron runs per agent to the `/cron` page.

**Architecture:** Extend the existing `config.get`/`config.patch` flow into a shared `useConfig` hook consumed by both `useAgents` and a new `useCronConfig`. Preserve the `total` field from `cronRuns` responses in the cron store for the pie chart. Three new components: `CronRunsByAgentChart`, `CronSettingsCard`, `CronSettingsDialog`.

**Tech Stack:** React, Zustand, Recharts (v3.8.0), Base-UI Dialog, Tailwind CSS

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `src/types/agent.ts:106` | Extend `ParsedConfig.cron` with retention/runLog fields |
| Modify | `src/services/gateway-ws.ts:96-98` | Return `{ runs, total }` from `cronRuns()` |
| Modify | `src/stores/cron-store.ts` | Add `runTotals` map and `setRunTotals` |
| Modify | `src/hooks/use-all-cron-runs.ts:33-35` | Adapt to new `cronRuns` return shape, store totals |
| Create | `src/hooks/use-config.ts` | Shared `useConfig` hook wrapping `config.get` |
| Modify | `src/hooks/use-agents.ts:8` | Replace inline `configGet()` with `useConfig()` |
| Create | `src/hooks/use-cron-config.ts` | Cron-specific config hook with `updateCronConfig` |
| Create | `src/components/dashboard/CronRunsByAgentChart.tsx` | Donut pie chart of runs per agent |
| Create | `src/components/dashboard/CronSettingsCard.tsx` | Read-only settings card with Edit button |
| Create | `src/components/dashboard/CronSettingsDialog.tsx` | Edit dialog for cron settings |
| Modify | `src/components/pages/CronPage.tsx` | Add chart + settings row above job list |

---

### Task 1: Extend `ParsedConfig.cron` type

**Files:**
- Modify: `src/types/agent.ts:106`

- [ ] **Step 1: Add retention and runLog fields to the cron type**

In `src/types/agent.ts`, replace the `cron` field in `ParsedConfig`:

```ts
// old
cron?: { maxConcurrentRuns?: number }

// new
cron?: {
  maxConcurrentRuns?: number
  sessionRetention?: string | false
  runLog?: {
    maxBytes?: string
    keepLines?: number
  }
}
```

- [ ] **Step 2: Verify the app still compiles**

Run: `npx tsc --noEmit`
Expected: No new errors (existing code only reads `maxConcurrentRuns` which is unchanged).

- [ ] **Step 3: Commit**

```bash
git add src/types/agent.ts
git commit -m "feat: extend ParsedConfig.cron with retention and runLog fields"
```

---

### Task 2: Preserve `total` from `cronRuns` response

**Files:**
- Modify: `src/services/gateway-ws.ts:96-98`
- Modify: `src/stores/cron-store.ts`
- Modify: `src/hooks/use-all-cron-runs.ts:29-36`

- [ ] **Step 1: Change `cronRuns` return type in gateway-ws**

In `src/services/gateway-ws.ts`, replace the `cronRuns` method (lines 96-98):

```ts
// old
async cronRuns(jobId: string, limit = 50): Promise<CronRun[]> {
  const res = (await this.sendRpc("cron.runs", { jobId, limit })) as CronRunsResponse | CronRun[]
  return Array.isArray(res) ? res : (res?.entries ?? [])
}

// new
async cronRuns(jobId: string, limit = 50): Promise<{ runs: CronRun[]; total: number }> {
  const res = (await this.sendRpc("cron.runs", { jobId, limit })) as CronRunsResponse | CronRun[]
  if (Array.isArray(res)) return { runs: res, total: res.length }
  return { runs: res?.entries ?? [], total: res?.total ?? 0 }
}
```

- [ ] **Step 2: Add `runTotals` to cron store**

In `src/stores/cron-store.ts`, add to the `CronState` interface:

```ts
runTotals: Record<string, number>
setRunTotals: (jobId: string, total: number) => void
```

Add to the create body:

```ts
runTotals: {},

setRunTotals: (jobId, total) =>
  set((state) => ({
    runTotals: { ...state.runTotals, [jobId]: total },
  })),
```

- [ ] **Step 3: Update `useFetchAllCronRuns` to use new shape**

In `src/hooks/use-all-cron-runs.ts`, update the fetch function. Change lines 13-14 to also grab `setRunTotals`:

```ts
const setRuns = useCronStore((s) => s.setRuns)
const setRunTotals = useCronStore((s) => s.setRunTotals)
```

Then update the try block inside `fetchSequential()` (lines 33-35):

```ts
// old
const r = await gatewayWs.cronRuns(job.id)
fetchedRef.current.add(job.id)
setRuns(job.id, r)

// new
const { runs, total } = await gatewayWs.cronRuns(job.id)
fetchedRef.current.add(job.id)
setRuns(job.id, runs)
setRunTotals(job.id, total)
```

- [ ] **Step 4: Update `useCronRuns` hook**

In `src/hooks/use-cron-runs.ts`, the `useRpc` fetcher calls `gatewayWs.cronRuns()` directly (line 11) and the effect sets runs from `data` (lines 16-20). Update to handle the new `{ runs, total }` shape:

Replace line 11:

```ts
// old
() => (jobId ? gatewayWs.cronRuns(jobId) : Promise.resolve([])),

// new
() => (jobId ? gatewayWs.cronRuns(jobId).then(({ runs }) => runs) : Promise.resolve([])),
```

No other changes needed — `data` will still be `CronRun[]` and the effect on lines 16-20 stays the same.

- [ ] **Step 5: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/services/gateway-ws.ts src/stores/cron-store.ts src/hooks/use-all-cron-runs.ts src/hooks/use-cron-runs.ts
git commit -m "feat: preserve total run count from cronRuns response"
```

---

### Task 3: Extract `useConfig` hook and refactor `useAgents`

**Files:**
- Create: `src/hooks/use-config.ts`
- Modify: `src/hooks/use-agents.ts:1-11`

- [ ] **Step 1: Create `useConfig` hook**

Create `src/hooks/use-config.ts`:

```ts
import { useRpc } from "./use-rpc"
import { gatewayWs } from "@/services/gateway-ws"
import type { ParsedConfig } from "@/types/agent"

export function useConfig() {
  const { data, isLoading, error, scopeError, refetch } = useRpc(
    () => gatewayWs.configGet(),
    [],
  )

  return {
    parsed: data?.parsed as ParsedConfig | undefined,
    configHash: data?.hash,
    isLoading,
    error,
    scopeError,
    refetch,
  }
}
```

- [ ] **Step 2: Refactor `useAgents` to use `useConfig`**

In `src/hooks/use-agents.ts`, replace:

```ts
// old (lines 7-8)
const { data, isLoading, error, scopeError, refetch } = useRpc(() => gatewayWs.agentsList(), [])
const { data: configData } = useRpc(() => gatewayWs.configGet(), [])
```

with:

```ts
// new
const { data, isLoading, error, scopeError, refetch } = useRpc(() => gatewayWs.agentsList(), [])
const { parsed, configHash } = useConfig()
```

Then remove the lines that derived `parsed` and `configHash` from `configData`:

```ts
// delete these two lines
const parsed: ParsedConfig | undefined = configData?.parsed
const configHash: string | undefined = configData?.hash
```

Update the import section — remove `ConfigGetResponse` if no longer used directly, add `useConfig`:

```ts
import { useConfig } from "./use-config"
```

Remove `gatewayWs` import if no longer used directly (it's still used for `agentsList`):

```ts
// keep: import { gatewayWs } from "@/services/gateway-ws"
```

Remove unused `ParsedConfig` from the type import if it's now only used via `useConfig` internally. Check if `ParsedConfig` is still referenced in the `agents` memo — it is (for `defaults`, `configList`), so keep it in the import.

- [ ] **Step 3: Verify compilation and existing behavior**

Run: `npx tsc --noEmit`
Expected: No errors. The `useAgents` hook returns the same shape — `configHash` and `globalConfig` still work.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-config.ts src/hooks/use-agents.ts
git commit -m "refactor: extract useConfig hook from useAgents"
```

---

### Task 4: Create `useCronConfig` hook

**Files:**
- Create: `src/hooks/use-cron-config.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/use-cron-config.ts`:

```ts
import { useCallback } from "react"
import { useConfig } from "./use-config"
import { gatewayWs } from "@/services/gateway-ws"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { formatRpcError } from "@/lib/errors"

export interface CronConfig {
  maxConcurrentRuns?: number
  sessionRetention?: string | false
  runLog?: {
    maxBytes?: string
    keepLines?: number
  }
}

export function useCronConfig() {
  const { parsed, configHash, isLoading, refetch } = useConfig()
  const addToast = useErrorToastStore((s) => s.addToast)

  const cronConfig: CronConfig = parsed?.cron ?? {}

  const updateCronConfig = useCallback(
    async (patch: Partial<CronConfig>) => {
      try {
        await gatewayWs.configPatch({ cron: { ...patch } }, configHash)
        refetch()
      } catch (err) {
        addToast(`Failed to update cron config: ${formatRpcError(err)}`)
        throw err
      }
    },
    [configHash, refetch, addToast],
  )

  return { cronConfig, configHash, isLoading, updateCronConfig, refetch }
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-cron-config.ts
git commit -m "feat: add useCronConfig hook"
```

---

### Task 5: Create `CronRunsByAgentChart` component

**Files:**
- Create: `src/components/dashboard/CronRunsByAgentChart.tsx`

- [ ] **Step 1: Create the chart component**

Create `src/components/dashboard/CronRunsByAgentChart.tsx`:

```tsx
import { useMemo } from "react"
import { PieChart, Pie, Cell, Tooltip } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { Card, CardContent } from "@/components/ui/card"
import { useCronStore } from "@/stores/cron-store"

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "hsl(280 65% 60%)",
  "hsl(340 65% 55%)",
  "hsl(160 50% 45%)",
]

export function CronRunsByAgentChart() {
  const jobs = useCronStore((s) => s.jobs)
  const runTotals = useCronStore((s) => s.runTotals)

  const { data, chartConfig } = useMemo(() => {
    const agentTotals = new Map<string, number>()

    for (const job of jobs) {
      const agent = job.agentId ?? "unknown"
      const total = runTotals[job.id] ?? 0
      agentTotals.set(agent, (agentTotals.get(agent) ?? 0) + total)
    }

    const entries = [...agentTotals.entries()]
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])

    const config: ChartConfig = {}
    entries.forEach(([agent], i) => {
      config[agent] = { label: agent, color: COLORS[i % COLORS.length] }
    })

    return {
      data: entries.map(([agent, count]) => ({ agent, count })),
      chartConfig: config,
    }
  }, [jobs, runTotals])

  if (data.length === 0) {
    return (
      <Card className="flex-1">
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Runs by Agent</p>
          <p className="py-8 text-center text-sm text-muted-foreground">
            No run data available.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex-1">
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">Runs by Agent</p>
        <div className="flex items-center gap-4">
          <ChartContainer config={chartConfig} className="h-[140px] w-[140px] shrink-0">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="agent"
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={60}
                strokeWidth={2}
                isAnimationActive={false}
              >
                {data.map((entry, i) => (
                  <Cell
                    key={entry.agent}
                    fill={COLORS[i % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0]
                  return (
                    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="ml-2 font-mono font-medium">
                        {(item.value as number).toLocaleString()} runs
                      </span>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ChartContainer>
          <div className="space-y-1.5 text-xs">
            {data.map((entry, i) => (
              <div key={entry.agent} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="text-muted-foreground">{entry.agent}</span>
                <span className="ml-auto font-mono tabular-nums">
                  {entry.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/CronRunsByAgentChart.tsx
git commit -m "feat: add CronRunsByAgentChart donut chart component"
```

---

### Task 6: Create `CronSettingsCard` and `CronSettingsDialog`

**Files:**
- Create: `src/components/dashboard/CronSettingsCard.tsx`
- Create: `src/components/dashboard/CronSettingsDialog.tsx`

- [ ] **Step 1: Create `CronSettingsDialog`**

Create `src/components/dashboard/CronSettingsDialog.tsx`:

```tsx
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TriangleAlert } from "lucide-react"
import { useCronConfig, type CronConfig } from "@/hooks/use-cron-config"

interface CronSettingsDialogProps {
  open: boolean
  onClose: () => void
}

export function CronSettingsDialog({ open, onClose }: CronSettingsDialogProps) {
  const { cronConfig, updateCronConfig } = useCronConfig()

  const [retention, setRetention] = useState(
    cronConfig.sessionRetention === false ? "" : (cronConfig.sessionRetention ?? ""),
  )
  const [maxConcurrent, setMaxConcurrent] = useState(
    String(cronConfig.maxConcurrentRuns ?? ""),
  )
  const [maxBytes, setMaxBytes] = useState(cronConfig.runLog?.maxBytes ?? "")
  const [keepLines, setKeepLines] = useState(
    String(cronConfig.runLog?.keepLines ?? ""),
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const patch: Partial<CronConfig> = {}
      if (retention) patch.sessionRetention = retention
      if (maxConcurrent) patch.maxConcurrentRuns = parseInt(maxConcurrent, 10)
      if (maxBytes || keepLines) {
        patch.runLog = {}
        if (maxBytes) patch.runLog.maxBytes = maxBytes
        if (keepLines) patch.runLog.keepLines = parseInt(keepLines, 10)
      }
      await updateCronConfig(patch)
      onClose()
    } catch {
      // error toast handled by updateCronConfig
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cron Settings</DialogTitle>
          <DialogDescription>
            Update global cron scheduler configuration.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Session Retention</label>
            <Input
              placeholder="e.g. 24h, 1h, 10m"
              value={retention}
              onChange={(e) => setRetention((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Max Concurrent Runs</label>
            <Input
              type="number"
              min="1"
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Run Log Max Size</label>
            <Input
              placeholder="e.g. 2mb, 500kb"
              value={maxBytes}
              onChange={(e) => setMaxBytes((e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Run Log Keep Lines</label>
            <Input
              type="number"
              min="1"
              value={keepLines}
              onChange={(e) => setKeepLines((e.target as HTMLInputElement).value)}
            />
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
```

- [ ] **Step 2: Create `CronSettingsCard`**

Create `src/components/dashboard/CronSettingsCard.tsx`:

```tsx
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useCronConfig } from "@/hooks/use-cron-config"
import { CronSettingsDialog } from "./CronSettingsDialog"

function formatRetention(value: string | false | undefined): string {
  if (value === false) return "Disabled"
  return value ?? "—"
}

export function CronSettingsCard() {
  const { cronConfig } = useCronConfig()
  const [dialogOpen, setDialogOpen] = useState(false)

  const rows = [
    { label: "Session Retention", value: formatRetention(cronConfig.sessionRetention) },
    { label: "Max Concurrent Runs", value: cronConfig.maxConcurrentRuns != null ? String(cronConfig.maxConcurrentRuns) : "—" },
    { label: "Run Log Max Size", value: cronConfig.runLog?.maxBytes ?? "—" },
    { label: "Run Log Keep Lines", value: cronConfig.runLog?.keepLines != null ? String(cronConfig.runLog.keepLines) : "—" },
  ]

  return (
    <>
      <Card className="flex-1">
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">Cron Settings</p>
            <Button variant="outline" size="xs" onClick={() => setDialogOpen(true)}>
              Edit
            </Button>
          </div>
          <div className="space-y-0">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 text-sm"
              >
                <span className="text-muted-foreground text-xs">{row.label}</span>
                <span className="font-mono text-xs tabular-nums">{row.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <CronSettingsDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  )
}
```

- [ ] **Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/CronSettingsCard.tsx src/components/dashboard/CronSettingsDialog.tsx
git commit -m "feat: add CronSettingsCard and CronSettingsDialog components"
```

---

### Task 7: Update `CronPage` layout

**Files:**
- Modify: `src/components/pages/CronPage.tsx`

- [ ] **Step 1: Add the two-column row above the job list**

Replace the contents of `src/components/pages/CronPage.tsx`:

```tsx
import { CronJobList } from "@/components/dashboard/CronJobList"
import { CronRunsByAgentChart } from "@/components/dashboard/CronRunsByAgentChart"
import { CronSettingsCard } from "@/components/dashboard/CronSettingsCard"
import { PageHeader } from "@/components/shared/PageHeader"
import { useCronStore } from "@/stores/cron-store"

export function CronPage() {
  const jobCount = useCronStore((s) => s.jobs.length)

  return (
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[{ label: "Cron Jobs" }]}
        subtitle={jobCount > 0 ? `${jobCount} job${jobCount !== 1 ? "s" : ""} across all agents` : undefined}
      />
      <div className="flex gap-4">
        <CronRunsByAgentChart />
        <CronSettingsCard />
      </div>
      <CronJobList />
    </div>
  )
}
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Verify in the browser**

Run: `npm run dev`

Navigate to `/cron`. Verify:
- Two cards appear above the job table in a horizontal row
- Left card shows "Runs by Agent" with a donut chart (or empty state if no run data)
- Right card shows "Cron Settings" with 4 key-value rows and an Edit button
- Clicking Edit opens a dialog with 4 form fields
- Existing job table still renders below

- [ ] **Step 4: Commit**

```bash
git add src/components/pages/CronPage.tsx
git commit -m "feat: add cron settings and runs chart to CronPage"
```
