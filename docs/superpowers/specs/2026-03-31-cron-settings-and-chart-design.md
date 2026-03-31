# Cron Settings & Runs-by-Agent Chart

Add a settings panel and pie chart to the `/cron` page, displayed as a two-column row above the existing job table.

## Data Layer

### Extend `ParsedConfig.cron` (`src/types/agent.ts`)

Add `sessionRetention` and `runLog` fields to the existing `cron` type:

```ts
cron?: {
  maxConcurrentRuns?: number
  sessionRetention?: string | false  // "24h", "1h", false to disable
  runLog?: {
    maxBytes?: string   // "2mb"
    keepLines?: number  // 2000
  }
}
```

### Preserve `total` from `cronRuns` response (`src/services/gateway-ws.ts`)

Currently `cronRuns()` normalizes the `CronRunsResponse` to just `CronRun[]`, dropping the `total` field. Change the return type to `{ runs: CronRun[], total: number }` so the store can track total run counts per job.

### Extend cron store (`src/stores/cron-store.ts`)

Add a `runTotals` map alongside the existing `runs`:

```ts
runTotals: Record<string, number>  // jobId → total run count from gateway
setRunTotals(jobId: string, total: number): void
```

### Update `useFetchAllCronRuns` (`src/hooks/use-all-cron-runs.ts`)

Adapt to the new `{ runs, total }` return shape. Call `setRunTotals(job.id, total)` alongside `setRuns(job.id, runs)`.

### New `useConfig` hook (`src/hooks/use-config.ts`)

Extracts the `config.get` RPC call from `useAgents` into a shared hook:

```ts
function useConfig() → { parsed, configHash, isLoading, error, refetch }
```

### Refactor `useAgents` (`src/hooks/use-agents.ts`)

Replace the inline `configGet()` call with `useConfig()`. No behavior change.

### New `useCronConfig` hook (`src/hooks/use-cron-config.ts`)

Consumes `useConfig()` and extracts cron-specific config:

```ts
function useCronConfig() → { cronConfig, configHash, updateCronConfig(patch), isLoading, refetch }
```

`updateCronConfig` calls `gatewayWs.configPatch({ cron: { ...patch } }, configHash)` then `refetch()`.

## Components

### `CronRunsByAgentChart` (`src/components/dashboard/CronRunsByAgentChart.tsx`)

- Recharts `PieChart` with `Pie` + `Cell` (donut style)
- Aggregates `runTotals` from cron store by agent via `jobs[].agentId`
- Legend beside the chart: agent name + total count
- Uses CSS chart color variables (`--chart-1` through `--chart-5`)
- Wrapped in `Card` with "Runs by Agent" header

### `CronSettingsCard` (`src/components/dashboard/CronSettingsCard.tsx`)

- Read-only `Card` with 4 key-value rows:
  - Session Retention
  - Max Concurrent Runs
  - Run Log Max Size
  - Run Log Keep Lines
- "Edit" button in card header opens `CronSettingsDialog`
- Shows fallback text ("default" or "—") for unset values
- When `sessionRetention` is `false`, display "Disabled" instead of the raw value

### `CronSettingsDialog` (`src/components/dashboard/CronSettingsDialog.tsx`)

- Dialog with 4 form fields:
  - `sessionRetention`: text input (e.g. "24h", "1h")
  - `maxConcurrentRuns`: number input
  - `runLog.maxBytes`: text input (e.g. "2mb")
  - `runLog.keepLines`: number input
- Save calls `updateCronConfig()` from `useCronConfig`
- Loading/error pattern matches existing agent config dialogs

### `CronPage` update (`src/components/pages/CronPage.tsx`)

Adds a `flex gap-4` row above `CronJobList`:
- Left: `CronRunsByAgentChart`
- Right: `CronSettingsCard`

## Data Flow

```
config.get ──→ useConfig (shared)
                 ├──→ useAgents (agents + bindings)
                 └──→ useCronConfig (cron settings)
                        ├──→ CronSettingsCard (read)
                        └──→ CronSettingsDialog (write via config.patch)

cronRuns ──→ gateway-ws returns { runs, total }
               └──→ cron-store.runs + cron-store.runTotals
                       └──→ CronRunsByAgentChart (aggregates by agentId)
```

## Edit Flow

1. User clicks Edit on CronSettingsCard
2. CronSettingsDialog opens, pre-filled with current values
3. User modifies fields, clicks Save
4. `configPatch({ cron: { ...patch } }, configHash)` sent to gateway
5. On success, `useConfig.refetch()` refreshes config data
6. Dialog closes, card shows updated values

## Layout (Option A)

Two-column row above the job table:

```
┌─────────────────────────────────────────────────┐
│ PageHeader: Cron Jobs                           │
├──────────────────────┬──────────────────────────┤
│ Runs by Agent        │ Cron Settings     [Edit] │
│ [donut chart]        │ Session Retention    24h  │
│  + legend            │ Max Concurrent        2   │
│                      │ Run Log Max Size    2mb   │
│                      │ Run Log Keep Lines 2000   │
├──────────────────────┴──────────────────────────┤
│ CronJobList (existing table)                     │
└─────────────────────────────────────────────────┘
```

## Scope Boundaries

- No new gateway RPC methods — uses existing `config.get` and `config.patch`
- No new routes
- No new zustand stores — extends existing cron-store
- Only change to gateway-ws is the `cronRuns` return shape
- Chart uses Recharts (already a dependency at v3.8.0)
