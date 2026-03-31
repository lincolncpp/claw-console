# Claw Console

The web console for the [OpenClaw](https://openclaw.ai/) Gateway. Monitor system health, manage AI agent sessions, chat with agents in real time, and administer cron jobs, logs, and approvals — all from your browser.

## Features

- **Overview** — System health, connected nodes, gateway uptime, and recent cron activity at a glance
- **Agents & Tools** — Browse registered agents, available models, tools, and installed skills
- **Sessions** — List, search, filter, and manage chat sessions across agents
- **Terminal** — Interactive chat panel with real-time streaming of text and tool-call output
- **Cron Jobs** — View scheduled tasks with status, duration, and execution history
- **Logs** — Stream and filter gateway logs by level and subsystem
- **Nodes** — Monitor connected and disconnected compute nodes with platform and version info
- **Approvals** — Review and act on pending tool-execution approval requests

## Tech Stack

- **React 19** with TypeScript
- **Vite 8** (build & dev server)
- **Tailwind CSS 4** with shadcn/ui components
- **Zustand** (state management)
- **Recharts** (charts)
- **React Router 7** (routing)
- **WebSocket + HTTP** (Gateway communication)

## Getting Started

### Prerequisites

- Node.js 20+
- A running [OpenClaw Gateway](https://docs.openclaw.ai) (default port `18789`)

### Setup

1. Clone the repository and install dependencies:

   ```bash
   git clone <repo-url>
   cd ai-dashboard
   npm install
   ```

2. Copy the example environment file and configure it:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your Gateway connection details:

   ```
   VITE_GATEWAY_HOST=192.168.0.102   # Gateway hostname or IP
   VITE_GATEWAY_PORT=18789           # Gateway port
   VITE_GATEWAY_TOKEN=               # Bearer token (if authentication is enabled)
   ```

3. Start the dev server:

   ```bash
   npm run dev
   ```

### Available Scripts

| Command              | Description                        |
| -------------------- | ---------------------------------- |
| `npm run dev`        | Start the Vite dev server          |
| `npm run build`      | Type-check and build for production|
| `npm run preview`    | Preview the production build       |
| `npm run lint`       | Run ESLint                         |
| `npm run format`     | Format code with Prettier          |
| `npm run check`      | Run format check, lint, and build  |

## Project Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI primitives (button, card, dialog, etc.)
│   ├── pages/        # Page-level components
│   ├── layout/       # Header, Sidebar, StatusBar, PageRouter
│   ├── dashboard/    # Dashboard widgets (SystemHealth, CronJobList, etc.)
│   └── terminal/     # Terminal panel (ChatMessage, ToolCard, ChatInput)
├── types/            # TypeScript interfaces (gateway, session, agent, cron, etc.)
├── services/         # Gateway communication (WebSocket & HTTP)
├── stores/           # Zustand state stores
├── hooks/            # Custom React hooks
├── lib/              # Utility functions
├── App.tsx
└── main.tsx
```

## OpenClaw Gateway

**OpenClaw** is an AI agent orchestration platform. The **OpenClaw Gateway** is the backend service that manages AI agents, sessions, scheduled tasks, tool approvals, and compute nodes. This dashboard is the web-based control UI that operators use to monitor and manage a running Gateway instance.

The Gateway exposes two communication interfaces:

- **WebSocket** (`ws://<host>:<port>/`) — Primary interface. Carries the JSON-RPC protocol for request/response calls and a push-based event stream for real-time updates.
- **HTTP** (`http://<host>:<port>/`) — Secondary interface for health checks and system info (`/healthz`, `/readyz`, `/api/status`, `/api/system`).

In development, Vite proxies both interfaces (see `vite.config.ts`): `/ws` routes to the WebSocket endpoint (with the `/ws` prefix stripped), and `/api`, `/healthz`, `/readyz` route to the HTTP endpoints.

## Gateway Communication Protocol

### WebSocket Frame Types

All WebSocket messages are JSON. Three frame types exist (defined in `src/types/ws.ts`):

| Frame type | Direction | Shape |
|---|---|---|
| **Request** (`req`) | Client → Gateway | `{ type: "req", id, method, params? }` |
| **Response** (`res`) | Gateway → Client | `{ type: "res", id, ok?, result?, error? }` |
| **Event** (`event`) | Gateway → Client | `{ type: "event", event, payload?, seq? }` |

### Connection Handshake

1. Client opens a WebSocket to `/ws`
2. Gateway sends `connect.challenge` event
3. Client responds with a `connect` RPC request:
   ```json
   {
     "type": "req",
     "id": "<uuid>",
     "method": "connect",
     "params": {
       "minProtocol": 3,
       "maxProtocol": 3,
       "client": { "id": "openclaw-control-ui", "version": "1.0.0", "platform": "...", "mode": "ui" },
       "role": "operator",
       "scopes": ["operator.admin", "operator.read", "operator.write", "operator.approvals", "operator.pairing"],
       "auth": { "token": "<bearer-token>" }
     }
   }
   ```
4. Gateway responds with `ConnectResult` containing a `ConnectSnapshot` (health, uptime, update availability)
5. Connection is established; RPC methods are now available

### RPC Call Pattern

Implemented in `src/services/gateway-ws.ts` → `sendRpc()`:

- Each call gets a unique UUID as its `id`
- Sends `{ type: "req", id, method, params }` over WebSocket
- Waits for a matching `{ type: "res", id, ... }` response
- **Timeout**: 15 seconds per call
- **Reconnection**: Exponential backoff from 1s up to 30s max

### Authentication

- Bearer token passed during the WebSocket `connect` handshake in `auth.token`
- HTTP endpoints use `Authorization: Bearer <token>` header
- Token is configured via `VITE_GATEWAY_TOKEN` environment variable
- Scope-based authorization — missing scopes return distinguishable errors (detected by `isScopeError()` in `src/lib/errors.ts`)

## RPC Methods Reference

All methods are defined as typed wrappers in `src/services/gateway-ws.ts`:

### Cron Jobs

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `cron.list` | `{ includeDisabled: true }` | `CronJob[]` | List all cron jobs |
| `cron.runs` | `{ jobId, limit? }` | `CronRun[]` | Get run history for a job (default limit: 50) |
| `cron.run` | `{ jobId }` | `void` | Trigger immediate execution |
| `cron.status` | `{ jobId }` | `CronJob` | Get current job status |
| `cron.update` | `{ id, patch }` | `CronJob` | Update job properties (e.g. toggle enabled) |

### Sessions

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `sessions.list` | — | `SessionsListResponse` | List all sessions with metadata |
| `sessions.delete` | `{ key }` | `SessionDeleteResponse` | Delete a session |
| `sessions.cleanup` | `{ maxAgeDays? }` | `SessionsCleanupResponse` | Remove old sessions |

### Agents & Catalog

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `agents.list` | — | `AgentsListResponse` | List registered agents |
| `models.list` | — | `ModelsListResponse` | List available LLM models |
| `tools.catalog` | — | `ToolsCatalogResponse` | List available tools |
| `skills.status` | — | `SkillsStatusResponse` | List skills with status |

### Nodes

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `node.list` | — | `NodeListResponse` | List connected compute nodes |

### Logs

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `logs.tail` | `{ cursor? }` | `LogsTailResponse` | Tail gateway logs (cursor-based pagination) |

### Approvals

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `exec.approvals.get` | — | `ApprovalsResponse` | Get pending tool execution approvals |

### Chat

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `chat.send` | `{ sessionKey, message, idempotencyKey }` | `unknown` | Send a message to an agent session |
| `chat.history` | `{ sessionKey, limit? }` | `unknown` | Load chat history (default limit: 200) |

## Event System

The Gateway pushes events over WebSocket. The dashboard routes them in `setupEventDispatch()` (`src/services/gateway-ws.ts`):

| Event | Payload | Dashboard action |
|---|---|---|
| `health` | `HealthPayload` | Updates system store (health, channels, agents, sessions) |
| `cron` | — | Triggers cron job list refetch |
| `sessions.changed` | — | Notifies all `useSessionsRefresh` listeners to refetch |
| `presence` | `PresenceEntry[]` | Updates node presence in system store |
| `exec.approval.requested` | `ApprovalEntry` | Triggers approval list refresh |
| `exec.approval.resolved` | `ApprovalEntry` | Triggers approval list refresh |
| `agent` | varies | Chat stream events routed to terminal store |
| `chat.*` | varies | Alternative chat event format, also routed to terminal |
| `session.*` | varies | Session-scoped events, also routed to terminal |

### Chat Stream Events

When `event === "agent"`, the payload includes a `stream` field:

- `stream: "text"` — Streaming text chunk, appended to the current assistant message
- `stream: "tool"` — Tool call in progress (name, args, result, status)
- `stream: "lifecycle"` — Message lifecycle (finalize message, set error state)

## Data Models

All TypeScript interfaces are in `src/types/`. Key models:

### Gateway (`src/types/gateway.ts`)

- `HealthPayload` — System health snapshot: `ok`, `channels` (Record of `ChannelHealth`), `agents` (`AgentHealth[]`), `sessions.count`
- `ChannelHealth` — Per-channel: `configured`, `running`, `lastError`, optional `probe` with latency and bot info
- `AgentHealth` — Per-agent: `agentId`, `name`, `isDefault`, `sessions.count`
- `ConnectResult` — Connection response: `protocol`, `server.version`, `snapshot` (`ConnectSnapshot`)
- `ConnectSnapshot` — Initial state: `health`, `uptimeMs`, optional `updateAvailable`

### Cron (`src/types/cron.ts`)

- `CronJob` — Scheduled task: `id`, `name`, `agentId?`, `enabled`, `sessionTarget` ("main" | "isolated"), `schedule` (`CronSchedule`), `state?` (`CronJobState`), `delivery?`
- `CronSchedule` — Union type: `{ kind: "cron", expr }` | `{ kind: "every", everyMs }` | `{ kind: "at", atMs }`
- `CronRun` — Execution record: `ts`, `jobId`, `status`, `durationMs?`, `model?`, `usage?` (token counts), `sessionKey?`
- `CronJobState` — Runtime state: `lastRunAtMs?`, `lastRunStatus?`, `nextRunAtMs?`, `consecutiveErrors?`, `runningAtMs?`

### Sessions (`src/types/session.ts`)

- `SessionEntry` — `key`, `agentId?`, `updatedAt?`, `messageCount?`, `model?`, `label?`
- `SessionsListResponse` — `count`, `defaults` (default model/provider/contextTokens), `sessions[]`

### Agents (`src/types/agent.ts`)

- `AgentEntry` — `id`, `name?`, `isDefault?`, `model?`, `workspace?`
- `AgentsListResponse` — `defaultId`, `mainKey`, `scope`, `agents[]`
- `ModelEntry` — `id`, `name`, `provider`, `contextWindow?`, `reasoning?`, `input?[]`
- `ToolEntry` — `name`, `description?`, `source?`, `enabled?`
- `SkillEntry` — `id`, `name`, `status?`, `version?`

### Approvals (`src/types/approval.ts`)

- `ApprovalEntry` — `id`, `sessionKey?`, `agentId?`, `tool?`, `status` ("pending" | "approved" | "denied" | "expired"), `requestedAt?`, `resolvedAt?`

### Nodes (`src/types/node.ts`)

- `NodeEntry` — `nodeId`, `host`, `ip?`, `version?`, `platform?`, `mode?`, `connectedAt?`
- `PresenceEntry` — `host`, `ip`, `version?`, `platform?`, `deviceFamily?`, `roles?[]`, `ts?`

### Logs (`src/types/log.ts`)

- `LogLine` — Parsed log: `raw`, `timestamp?`, `level?` (debug/info/warn/error), `subsystem?`, `message?`
- `LogsTailResponse` — `file`, `cursor`, `size`, `lines[]`

### Terminal (`src/types/terminal.ts`)

- `ChatMessageData` — `id`, `role` (user/assistant/system), `content`, `timestamp`, `toolCalls?`
- `ToolCallData` — `id`, `name`, `args`, `result?`, `status`, `durationMs?`

## State Management

Zustand stores in `src/stores/`:

| Store | File | State | Purpose |
|---|---|---|---|
| `useGatewayStore` | `gateway-store.ts` | `host`, `port`, `token`, `connectionStatus`, `errorMessage` | Gateway connection config and status (from env vars) |
| `useSystemStore` | `system-store.ts` | `version`, `uptimeMs`, `healthOk`, `channels[]`, `agents[]`, `presence[]`, `updateAvailable` | System health and metadata (populated from connect snapshot + health events) |
| `useCronStore` | `cron-store.ts` | `jobs[]`, `runs` (Record by jobId) | Cron job list and cached run history |
| `useTerminalStore` | `terminal-store.ts` | `isOpen`, `agentId`, `sessionKey`, `messages[]`, `streamingText`, `runState` | Terminal panel state, active session, chat messages (max 500) |
| `useNavStore` | `nav-store.ts` | `collapsed` | Sidebar collapse state |
| `useErrorToastStore` | `error-toast-store.ts` | `toasts[]` | Deduped error/warning/info toasts (max 3 visible, 8s auto-dismiss) |

## Hooks

### `useRpc<T>` (`src/hooks/use-rpc.ts`)

Generic hook for calling any Gateway RPC method:

```typescript
const { data, isLoading, isFetching, error, scopeError, refetch } = useRpc(
  () => gatewayWs.cronList(),  // fetcher function
  [dep1, dep2],                // dependency array
  { enabled: true }            // optional
)
```

- Waits for `connectionStatus === "connected"` before fetching
- Automatically refetches when connection is (re)established or deps change
- Distinguishes scope errors (missing authorization) from network/RPC errors
- Returns `isLoading` (first load, no data yet) and `isFetching` (any fetch including refetch)

### Domain Hooks (`src/hooks/`)

| Hook | File | RPC Method | Description |
|---|---|---|---|
| `useAgents` | `use-agents.ts` | `agents.list` | Fetch agent list |
| `useModels` | `use-agents.ts` | `models.list` | Fetch available models |
| `useTools` | `use-agents.ts` | `tools.catalog` | Fetch tool catalog |
| `useSkills` | `use-agents.ts` | `skills.status` | Fetch skill status |
| `useSessions` | `use-sessions.ts` | `sessions.list` | Fetch sessions; also exports `useSessionDelete`, `useSessionCleanup` |
| `useApprovals` | `use-approvals.ts` | `exec.approvals.get` | Fetch pending approvals |
| `useLogs` | `use-logs.ts` | `logs.tail` | Streaming logs with cursor-based polling (3s interval) |
| `useCronRuns` | `use-cron-runs.ts` | `cron.runs` | Fetch run history for a cron job |
| `useCronToggle` | `use-cron-actions.ts` | `cron.update` | Toggle cron job enabled/disabled |
| `useCronRunNow` | `use-cron-actions.ts` | `cron.run` | Trigger immediate cron execution |

## Architecture Flow

### App Initialization (`src/App.tsx`)

1. App reads gateway config from env vars (`VITE_GATEWAY_HOST`, `VITE_GATEWAY_PORT`, `VITE_GATEWAY_TOKEN`)
2. `gatewayWs.connect(token)` opens WebSocket connection
3. On successful connect, receives `ConnectSnapshot` → populates `useSystemStore` (health, channels, agents, uptime, version)
4. `setupEventDispatch()` routes incoming events to the appropriate stores and handlers
5. Pages and hooks begin fetching data via `useRpc`

### Real-Time Update Flow

```
Gateway pushes event → WebSocket onmessage
  → handleFrame() parses JSON frame
  → onEvent() dispatches by event name
  → Store update (Zustand set())
  → React re-render
```

### Chat Streaming Flow

```
User types message → ChatInput → chat.send RPC
  → Gateway processes with AI agent
  → Gateway pushes "agent" events:
     stream:"text"  → append to streamingText
     stream:"tool"  → build ToolCallData
     stream:"lifecycle" → finalize message, update runState
  → TerminalPanel re-renders with live content
```

## Routes

| Path | Component | Description |
|---|---|---|
| `/` | `OverviewPage` | System health, nodes, recent cron activity |
| `/sessions` | `SessionsPage` | Session list with search, filter, delete, cleanup |
| `/agents` | `AgentsPage` | Agents, models, tools, skills (tabbed) |
| `/agents/:agentId` | `AgentDetailPage` | Agent detail with its sessions |
| `/cron` | `CronPage` | Cron job list grouped by agent |
| `/cron/:jobId` | `CronJobDetail` | Job detail with runs table and duration chart |
| `/cron/:jobId/runs/:runTs` | `CronRunDetail` | Individual run detail with token usage |
| `/logs` | `LogsPage` | Streaming logs with level/subsystem filters |
| `/nodes` | `NodesPage` | Connected/disconnected node cards |
| `/approvals` | `ApprovalsPage` | Pending tool execution approvals |

## Links

- [OpenClaw](https://openclaw.ai/)
- [OpenClaw Documentation](https://docs.openclaw.ai)
- [Gateway Protocol](https://docs.openclaw.ai/gateway/protocol)
