import { z } from "zod/v4"

// Schemas use .passthrough() so extra gateway fields don't cause false failures.
// They validate the fields the dashboard RELIES ON are present with expected types.

// ── HTTP ────────────────────────────────────────────────────────

export const HealthzResponseSchema = z
  .object({ ok: z.boolean(), status: z.string() })
  .passthrough()

// ── Health (connect snapshot & events) ──────────────────────────

export const ChannelHealthSchema = z
  .object({
    configured: z.boolean(),
    running: z.boolean(),
    lastError: z.string().nullable(),
    probe: z
      .object({
        ok: z.boolean(),
        elapsedMs: z.number(),
        bot: z.object({ id: z.string(), username: z.string() }).passthrough().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

export const AgentHealthSchema = z
  .object({
    agentId: z.string(),
    name: z.string().optional(),
    isDefault: z.boolean(),
    sessions: z.object({ count: z.number() }).passthrough(),
  })
  .passthrough()

export const HealthPayloadSchema = z
  .object({
    ok: z.boolean(),
    ts: z.number(),
    durationMs: z.number(),
    channels: z.record(z.string(), ChannelHealthSchema),
    channelOrder: z.array(z.string()),
    channelLabels: z.record(z.string(), z.string()),
    agents: z.array(AgentHealthSchema),
    sessions: z.object({ count: z.number() }).passthrough(),
  })
  .passthrough()

export const ConnectSnapshotSchema = z
  .object({
    health: HealthPayloadSchema,
    uptimeMs: z.number(),
  })
  .passthrough()

export const ConnectResultSchema = z
  .object({
    type: z.string(),
    protocol: z.number(),
    server: z.object({ version: z.string(), connId: z.string() }).passthrough(),
    snapshot: ConnectSnapshotSchema,
  })
  .passthrough()

// ── Agents ──────────────────────────────────────────────────────

// model can be string or { primary, fallbacks } — dashboard normalizes both
const AgentModelSchema = z.union([
  z.string(),
  z.object({ primary: z.string(), fallbacks: z.array(z.string()).optional() }).passthrough(),
])

export const AgentEntrySchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    isDefault: z.boolean().optional(),
    model: AgentModelSchema.optional(),
    workspace: z.string().optional(),
  })
  .passthrough()

export const AgentsListResponseSchema = z
  .object({
    defaultId: z.string(),
    mainKey: z.string(),
    scope: z.string(),
    agents: z.array(AgentEntrySchema),
  })
  .passthrough()

// ── Models ──────────────────────────────────────────────────────

export const ModelEntrySchema = z
  .object({
    id: z.string(),
    name: z.string(),
    provider: z.string(),
  })
  .passthrough()

export const ModelsListResponseSchema = z
  .object({ models: z.array(ModelEntrySchema) })
  .passthrough()

// ── Tools ───────────────────────────────────────────────────────

// tools.catalog returns { agentId, groups: [{ tools: [...] }] }
const ToolItemSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    description: z.string().optional(),
    source: z.string().optional(),
  })
  .passthrough()

const ToolGroupSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    tools: z.array(ToolItemSchema),
  })
  .passthrough()

export const ToolsCatalogResponseSchema = z
  .object({
    agentId: z.string(),
    groups: z.array(ToolGroupSchema),
  })
  .passthrough()

// ── Skills ──────────────────────────────────────────────────────

// skills.status returns skills with `name` (not `id`)
export const SkillEntrySchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
    source: z.string().optional(),
    bundled: z.boolean().optional(),
  })
  .passthrough()

export const SkillsStatusResponseSchema = z
  .object({ skills: z.array(SkillEntrySchema) })
  .passthrough()

// ── Config ──────────────────────────────────────────────────────

export const ConfigGetResponseSchema = z
  .object({
    path: z.string(),
    exists: z.boolean(),
    raw: z.string().nullable(),
    parsed: z.record(z.string(), z.unknown()).optional(),
    hash: z.string().optional(),
  })
  .passthrough()

// ── Sessions ────────────────────────────────────────────────────

export const SessionEntrySchema = z
  .object({
    key: z.string(),
    agentId: z.string().optional(),
    updatedAt: z.number().optional(),
    age: z.number().optional(),
    messageCount: z.number().optional(),
    model: z.string().optional(),
    label: z.string().optional(),
    inputTokens: z.number().optional(),
    outputTokens: z.number().optional(),
    totalTokens: z.number().optional(),
    contextTokens: z.number().optional(),
  })
  .passthrough()

export const SessionsListResponseSchema = z
  .object({
    ts: z.number(),
    count: z.number(),
    path: z.string().optional(),
    defaults: z
      .object({
        modelProvider: z.string().optional(),
        model: z.string().optional(),
        contextTokens: z.number().optional(),
      })
      .passthrough()
      .optional(),
    sessions: z.array(SessionEntrySchema),
  })
  .passthrough()

// ── Cron ────────────────────────────────────────────────────────

const CronScheduleSchema = z.union([
  z.object({ kind: z.literal("cron"), expr: z.string(), tz: z.string().optional() }).passthrough(),
  z.object({ kind: z.literal("every"), everyMs: z.number() }).passthrough(),
  z.object({ kind: z.literal("at"), atMs: z.number() }).passthrough(),
])

export const CronJobSchema = z
  .object({
    id: z.string(),
    agentId: z.string().optional(),
    name: z.string(),
    enabled: z.boolean(),
    sessionTarget: z.string(),
    schedule: CronScheduleSchema,
  })
  .passthrough()

export const CronRunSchema = z
  .object({
    ts: z.number(),
    jobId: z.string(),
    status: z.string(),
    runAtMs: z.number(),
  })
  .passthrough()

export const CronRunsResponseSchema = z
  .object({
    entries: z.array(CronRunSchema),
    total: z.number(),
    offset: z.number(),
    limit: z.number(),
    hasMore: z.boolean(),
  })
  .passthrough()

export const CronListResponseSchema = z.union([
  z.object({ jobs: z.array(CronJobSchema) }).passthrough(),
  z.array(CronJobSchema),
])

// ── Nodes ───────────────────────────────────────────────────────

export const NodeEntrySchema = z
  .object({
    nodeId: z.string(),
    host: z.string(),
  })
  .passthrough()

export const NodeListResponseSchema = z
  .object({
    ts: z.number(),
    nodes: z.array(NodeEntrySchema),
  })
  .passthrough()

// ── Logs ────────────────────────────────────────────────────────

export const LogsTailResponseSchema = z
  .object({
    file: z.string(),
    cursor: z.number(),
    size: z.number(),
    lines: z.array(z.string()),
  })
  .passthrough()
