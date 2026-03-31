import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { TestGatewayClient } from "./setup"
import {
  AgentsListResponseSchema,
  ConfigGetResponseSchema,
  ModelsListResponseSchema,
  ToolsCatalogResponseSchema,
  SkillsStatusResponseSchema,
  SessionsListResponseSchema,
  CronListResponseSchema,
  CronRunsResponseSchema,
  CronJobSchema,
  NodeListResponseSchema,
  LogsTailResponseSchema,
} from "./schemas"

function assertSchema(name: string, schema: { safeParse: (v: unknown) => { success: boolean; error?: unknown } }, data: unknown) {
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    const err = parsed.error as { issues?: unknown[] }
    const issues = err?.issues?.slice(0, 5) ?? err
    throw new Error(`${name} shape mismatch:\n${JSON.stringify(issues, null, 2)}`)
  }
}

let client: TestGatewayClient

beforeAll(async () => {
  client = new TestGatewayClient()
  await client.connect()
})

afterAll(() => {
  client.close()
})

describe("Agents RPCs", () => {
  it("agents.list", async () => {
    const result = await client.sendRpc("agents.list")
    assertSchema("agents.list", AgentsListResponseSchema, result)
  })

  it("config.get", async () => {
    const result = await client.sendRpc("config.get")
    assertSchema("config.get", ConfigGetResponseSchema, result)
  })

  it("models.list", async () => {
    const result = await client.sendRpc("models.list")
    assertSchema("models.list", ModelsListResponseSchema, result)
  })

  it("tools.catalog", async () => {
    const result = await client.sendRpc("tools.catalog")
    assertSchema("tools.catalog", ToolsCatalogResponseSchema, result)
  })

  it("skills.status", async () => {
    const result = await client.sendRpc("skills.status")
    assertSchema("skills.status", SkillsStatusResponseSchema, result)
  })
})

describe("Sessions RPCs", () => {
  it("sessions.list", async () => {
    const result = await client.sendRpc("sessions.list")
    assertSchema("sessions.list", SessionsListResponseSchema, result)
  })
})

describe("Cron RPCs", () => {
  let cronJobs: unknown[] = []

  it("cron.list", async () => {
    const result = await client.sendRpc("cron.list", { includeDisabled: true })
    assertSchema("cron.list", CronListResponseSchema, result)
    const parsed = CronListResponseSchema.parse(result)
    cronJobs = Array.isArray(parsed) ? parsed : (parsed.jobs ?? [])
  })

  it("cron.runs (if jobs exist)", async () => {
    if (cronJobs.length === 0) return
    const job = CronJobSchema.parse(cronJobs[0])
    const result = await client.sendRpc("cron.runs", { jobId: job.id, limit: 10 })
    if (Array.isArray(result)) {
      expect(result).toBeInstanceOf(Array)
    } else {
      assertSchema("cron.runs", CronRunsResponseSchema, result)
    }
  })
})

describe("Nodes RPCs", () => {
  it("node.list", async () => {
    const result = await client.sendRpc("node.list")
    assertSchema("node.list", NodeListResponseSchema, result)
  })
})

describe("Logs RPCs", () => {
  it("logs.tail", async () => {
    const result = await client.sendRpc("logs.tail")
    assertSchema("logs.tail", LogsTailResponseSchema, result)
  })
})

describe("Approvals RPCs", () => {
  it("exec.approvals.get", async () => {
    const result = await client.sendRpc("exec.approvals.get")
    expect(result).toBeDefined()
  })
})
