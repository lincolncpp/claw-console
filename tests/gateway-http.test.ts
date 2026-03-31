import { describe, it, expect } from "vitest"
import { gatewayHttpBase } from "./setup"
import { HealthzResponseSchema } from "./schemas"

describe("Gateway HTTP endpoints", () => {
  it("GET /healthz returns valid health response", async () => {
    const res = await fetch(`${gatewayHttpBase}/healthz`)
    expect(res.ok).toBe(true)

    const body = await res.json()
    const parsed = HealthzResponseSchema.safeParse(body)
    if (!parsed.success) {
      throw new Error(
        `/healthz response shape mismatch:\n${JSON.stringify(parsed.error.issues, null, 2)}`,
      )
    }
    expect(parsed.data.ok).toBe(true)
  })
})
