# Usage Page Design Spec

## Context

The OpenClaw dashboard currently has 7 pages for managing agents, sessions, cron jobs, nodes, logs, and approvals. There is no visibility into resource consumption — token usage, API costs, session activity, or system resource utilization. The Usage page fills this gap by providing a comprehensive view of how the system is being used.

The gateway does not yet have RPC endpoints for usage data, so the page will be built with mock data services that match eventual RPC signatures, enabling a clean swap when real endpoints are available.

## Architecture

**Layout:** Single sidebar entry ("Usage") with 3 tabs: "API & Tokens", "Sessions", "System Resources". Follows the existing `AgentsPage` tabbed pattern using shadcn `Tabs` with `variant="line"`.

**Time range selector:** Badge-style buttons (`1h`, `24h`, `7d`, `30d`) placed above the tab bar, shared across all tabs. Selection stored in `usage-store.ts`.

**Data flow:** Each tab panel calls `useRpc` with a mock fetcher function. Mock functions return `Promise<T>` with a small delay to simulate network latency. When real RPC endpoints exist, swap the import from `usage-mock` to `gateway-ws`.

## Files to Create

| File | Purpose |
|------|---------|
| `src/types/usage.ts` | Type definitions for all usage domains |
| `src/services/usage-mock.ts` | Mock data generators with deterministic seeding |
| `src/stores/usage-store.ts` | Zustand store (time range state only) |
| `src/components/pages/UsagePage.tsx` | Top-level page with Tabs + time range selector |
| `src/components/dashboard/usage/TokenUsagePanel.tsx` | API & Tokens tab content |
| `src/components/dashboard/usage/SessionUsagePanel.tsx` | Sessions tab content |
| `src/components/dashboard/usage/SystemResourcesPanel.tsx` | System Resources tab content |

## Files to Modify

| File | Change |
|------|--------|
| `src/stores/nav-store.ts` | Add `"usage"` to `Page` type union |
| `src/components/layout/Sidebar.tsx` | Add `{ page: "usage", label: "Usage", icon: BarChart3 }` to `navItems` |
| `src/components/layout/PageRouter.tsx` | Add `case "usage": return <UsagePage />` |

## Tab 1: API & Tokens

### Summary Cards (4 cards, `md:grid-cols-4`)
- **Total Tokens** — input + output combined, formatted as "1.2M"
- **Total Cost** — dollar amount, e.g. "$45.20"
- **API Requests** — total request count in the time range
- **Avg Cost/Session** — cost divided by session count

### Token Usage Over Time
- Stacked `AreaChart` (input tokens vs output tokens)
- Uses `ChartContainer` wrapper consistent with `RunHistoryChart`
- X-axis: time buckets based on selected range
- Y-axis: token count

### Per-Model Breakdown Table
- Columns: Model, Provider, Input Tokens, Output Tokens, Requests, Cost
- Sorted by cost descending
- Uses existing `Table` component

## Tab 2: Sessions

### Summary Cards (3 cards, `md:grid-cols-3`)
- **Total Sessions** — count in the time range
- **Total Messages** — aggregate message count
- **Avg Session Duration** — formatted as "12m 34s"

### Sessions Per Agent
- `BarChart` showing session counts grouped by agent
- One bar per agent, colored distinctly

### Message Volume Over Time
- `AreaChart` showing messages over time, stacked by agent

### Per-Agent Breakdown Table
- Columns: Agent Name, Sessions, Messages, Avg Duration
- Sorted by sessions descending

## Tab 3: System Resources

### Resource Gauges (2x2 grid)
Each card shows:
- **CPU** — current percentage + mini sparkline `AreaChart`
- **Memory** — current usage / total (e.g. "6.2 GB / 16 GB") + sparkline
- **Disk** — usage / total + sparkline
- **Network** — current throughput in/out + sparkline

### Resource History
- Full-width `AreaChart` showing CPU and memory usage over the selected time range
- Dual lines (CPU %, Memory %)

## Types (`src/types/usage.ts`)

```typescript
export type TimeRange = "1h" | "24h" | "7d" | "30d"

// API & Tokens
export interface TokenUsageSummary {
  totalInputTokens: number
  totalOutputTokens: number
  totalCost: number
  totalRequests: number
  avgCostPerSession: number
  timeSeries: TokenTimePoint[]
  byModel: ModelUsageEntry[]
}

export interface TokenTimePoint {
  timestamp: number
  inputTokens: number
  outputTokens: number
}

export interface ModelUsageEntry {
  model: string
  provider: string
  inputTokens: number
  outputTokens: number
  requests: number
  cost: number
}

// Sessions
export interface SessionMetrics {
  totalSessions: number
  totalMessages: number
  avgDurationMs: number
  sessionsByAgent: AgentSessionBar[]
  messageTimeSeries: MessageTimePoint[]
  byAgent: AgentSessionEntry[]
}

export interface AgentSessionBar {
  agentName: string
  sessions: number
}

export interface MessageTimePoint {
  timestamp: number
  messages: number
  agentName: string
}

export interface AgentSessionEntry {
  agentName: string
  sessions: number
  messages: number
  avgDurationMs: number
}

// System Resources
export interface SystemResourceMetrics {
  cpu: ResourceGauge
  memory: ResourceGauge & { totalBytes: number; usedBytes: number }
  disk: ResourceGauge & { totalBytes: number; usedBytes: number }
  network: { inBytesPerSec: number; outBytesPerSec: number; sparkline: number[] }
  history: ResourceHistoryPoint[]
}

export interface ResourceGauge {
  current: number // percentage 0-100
  sparkline: number[] // recent values for mini chart
}

export interface ResourceHistoryPoint {
  timestamp: number
  cpuPercent: number
  memoryPercent: number
}
```

## Mock Data Strategy

- `src/services/usage-mock.ts` exports 3 async functions:
  - `fetchTokenUsage(range: TimeRange): Promise<TokenUsageSummary>`
  - `fetchSessionMetrics(range: TimeRange): Promise<SessionMetrics>`
  - `fetchSystemResources(): Promise<SystemResourceMetrics>`
- Uses date-based seeding for deterministic data that varies day-to-day but is stable across refreshes
- Includes realistic model names (claude-sonnet-4, gpt-4o, etc.)
- Wraps in `Promise` with 200-500ms delay to simulate latency
- Each function consumed via `useRpc` hook from day one

## RPC Swap-Out Plan

When real gateway endpoints exist:
1. Add methods to `GatewayWebSocket` class (e.g., `usageTokenSummary(range)`)
2. Change imports in panel components from `usage-mock` to `gateway-ws`
3. The `useRpc` hook handles connection-gating and error states automatically

## Verification

1. Run `npm run dev` and navigate to the Usage page via sidebar
2. Verify all 3 tabs render with mock data
3. Verify time range selector updates charts across all tabs
4. Verify summary cards show formatted numbers
5. Verify charts render with proper axes and tooltips
6. Verify table sorting works
7. Verify responsive layout at different viewport widths
