# Agent Detail Page Redesign

## Context

The agent detail page (`AgentDetailPage.tsx`) has three problems:
1. **Workspace overflow** — long paths like `~/.openclaw/workspace-deploy-bot` truncate inside a `StatCard` and are unreadable
2. **Read-only config fields** — the page displays 8 config fields (memory search, compaction, fallbacks, subagent model, subagent concurrency, etc.) but the edit modal only allows changing 4 (model, thinking, timeout, concurrency)
3. **Inconsistent action buttons** — uses icon-only ghost buttons (Settings gear, Trash2) while other pages like `CronJobDetail` use text buttons ("Edit", "Delete")
4. **Wrong patch target** — the edit modal patches `agents.defaults` (global) instead of the per-agent entry in `agents.list`

## Design

### Detail Page Layout

Replace the current StatCards + Configuration Card with a single card using a description list grid (matching `CronJobDetail` pattern):

- **Card header**: Agent name as `CardTitle`, agent ID as subtitle. Text action buttons ("Edit", "Delete") in header right side using `size="sm" variant="outline"` — same pattern as CronJobDetail lines 81-96
- **Card body**: `dl` grid with `grid-template-columns: auto 1fr` showing all fields:
  - Model, Workspace (monospace, `word-break: break-all`), Channels (badges), Thinking, Timeout (formatted), Concurrency, Memory Search (on/off badge), Compaction, Fallbacks (badges), Subagent Model, Subagent Concurrency
- **Sessions card** remains as a separate card below with `SessionsTable`

Remove the `StatCard` grid entirely. Sessions count is no longer a stat card — it's implicit from the sessions table.

### Edit Modal (AgentConfigDialog)

Expand from 4 fields to 11 fields. Widen dialog from `sm:max-w-sm` to `sm:max-w-md`.

**Fields:**
1. Name — text input
2. Workspace — text input (monospace placeholder)
3. Model — select dropdown (from `useModels()`, with "Use default" option)
4. Thinking Default — select dropdown (off/minimal/low/medium/high/xhigh/adaptive, with "Use default" option)
5. Timeout (seconds) / Max Concurrent — 2-column grid, number inputs
6. Memory Search / Compaction Mode — 2-column grid, select dropdowns
   - Memory Search: "Use default", "enabled", "disabled"
   - Compaction: "Use default", "auto", "full", "none" (values from gateway)
7. Fallback Models — multi-value: select dropdown to add + removable badges for each
8. Subagent Model / Subagent Concurrency — 2-column grid

**Per-agent config patching:**
Change `handleSave` to patch the specific agent entry in `agents.list` instead of `agents.defaults`. Find the agent by ID in the current `parsed.agents.list`, merge the changes, and patch the full list back.

### Files to Modify

1. **`src/components/pages/AgentDetailPage.tsx`** — Main changes:
   - Remove StatCard grid and `ConfigRow` helper
   - Replace with single Card using `dl/dt/dd` grid layout
   - Change action buttons from icon-only to text buttons
   - Expand `AgentConfigDialog` with all 11 fields
   - Fix config patch to target per-agent entry in `agents.list`
   - Widen dialog to `sm:max-w-md`

2. **`src/hooks/use-agents.ts`** — Expose `parsed` config from `useAgents()` so the detail page can read `agents.list` for patching. Currently only `useAgentMutations` accesses parsed config via `useConfig()`.

3. **`src/types/agent.ts`** — May need to extend `ConfigAgentEntry` to include compaction, fallbacks, and subagent fields if patching per-agent (currently these only exist in `ParsedConfig.agents.defaults`).

### Existing Code to Reuse

- `formatDuration()` from `src/lib/format.ts` — already used for timeout display
- `useModels()` from `src/hooks/use-agents.ts` — for model select dropdown
- `DeleteConfirmDialog` from `src/components/shared/DeleteConfirmDialog.tsx` — keep as-is
- `SessionsTable` from `src/components/shared/SessionsTable.tsx` — keep as-is
- Button pattern from `CronJobDetail.tsx:81-96` — text buttons with `size="sm" variant="outline"`
- `gatewayWs.configPatch()` from `src/services/gateway-ws.ts` — same RPC, different payload shape

## Verification

1. Open the agent detail page — confirm workspace path displays fully without truncation
2. Click "Edit" — confirm all 11 fields appear pre-populated with current values
3. Change a field and save — confirm the patch targets the per-agent entry (check config.get response)
4. Confirm "Delete" button still works and is disabled for the default agent
5. Confirm sessions table still renders correctly
6. Test with an agent that has no overrides (all defaults) — fields should show "Use default" or "--"
7. Test the gateway restart warning still appears in the dialog footer
