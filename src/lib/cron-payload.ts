import type { CronJobDelivery, CronJobPayload } from "@/types/cron"

// Since gateway 2026.6 (openclaw a84819a63), cron.add/cron.update no longer
// infer payload.kind from which fields are present: payloads must carry an
// explicit kind, main-session jobs take {kind:"systemEvent", text} while
// isolated/session jobs take {kind:"agentTurn", message, ...}, and delivery
// modes are limited to none | announce | webhook.

export type CronDeliveryMode = "none" | "announce" | "webhook"

export interface CronPayloadFields {
  instructions: string
  model?: string
  thinking?: string
  timeoutSeconds?: number
}

/** True when the session target routes into the main session (systemEvent payloads). */
export function isMainSessionTarget(sessionTarget: string): boolean {
  return sessionTarget === "main"
}

export function buildCronCreatePayload(
  sessionTarget: string,
  fields: CronPayloadFields,
): CronJobPayload {
  if (isMainSessionTarget(sessionTarget)) {
    return { kind: "systemEvent", text: fields.instructions }
  }
  const payload: CronJobPayload = { kind: "agentTurn", message: fields.instructions }
  if (fields.model) payload.model = fields.model
  if (fields.thinking) payload.thinking = fields.thinking
  if (fields.timeoutSeconds != null) payload.timeoutSeconds = fields.timeoutSeconds
  return payload
}

/**
 * Builds a payload patch for cron.update. Patches must also carry an explicit
 * kind; when the kind changes the gateway rebuilds the payload from the patch
 * alone, so instructions are carried over from the existing payload.
 */
export function buildCronPatchPayload(
  sessionTarget: string,
  existing: CronJobPayload | undefined,
  fields: Omit<CronPayloadFields, "instructions">,
): CronJobPayload {
  const instructions = existing?.message ?? existing?.text
  if (isMainSessionTarget(sessionTarget)) {
    const payload: CronJobPayload = { kind: "systemEvent" }
    if (instructions) payload.text = instructions
    return payload
  }
  const payload: CronJobPayload = { kind: "agentTurn" }
  if (existing?.kind !== "agentTurn" && instructions) payload.message = instructions
  // null clears a per-job model override; omitting would leave it unchanged.
  payload.model = fields.model ? fields.model : null
  if (fields.thinking) payload.thinking = fields.thinking
  if (fields.timeoutSeconds != null) payload.timeoutSeconds = fields.timeoutSeconds
  return payload
}

export function buildCronCreateDelivery(
  mode: CronDeliveryMode,
  channel: string,
  to: string,
): CronJobDelivery {
  if (mode === "announce") {
    const delivery: CronJobDelivery = { mode }
    if (channel.trim()) delivery.channel = channel.trim()
    if (to.trim()) delivery.to = to.trim()
    return delivery
  }
  if (mode === "webhook") {
    return { mode, to: to.trim() }
  }
  return { mode: "none" }
}

/** Delivery patch for cron.update; null clears a previously set field. */
export function buildCronPatchDelivery(
  mode: CronDeliveryMode,
  channel: string,
  to: string,
): CronJobDelivery {
  if (mode === "announce") {
    return { mode, channel: channel.trim() || null, to: to.trim() || null }
  }
  if (mode === "webhook") {
    return { mode, to: to.trim() }
  }
  return { mode: "none" }
}

export function isValidWebhookUrl(value: string): boolean {
  const trimmed = value.trim()
  return /^https?:\/\/\S+$/i.test(trimmed)
}

/** Model column/row value for a job; only agentTurn payloads carry a model override. */
export function formatCronPayloadModel(payload: CronJobPayload | undefined): string {
  if (payload?.kind === "command") return payload.argv?.join(" ") ?? "command"
  if (payload?.kind === "systemEvent") return "--"
  return payload?.model ?? "agent default"
}

/** Maps a stored delivery mode (possibly legacy) onto the modes the gateway accepts. */
export function normalizeDeliveryMode(mode: string | undefined): CronDeliveryMode {
  if (mode === "announce" || mode === "webhook") return mode
  // Legacy "deliver"/"direct" modes routed through channels; announce is the
  // closest current equivalent.
  if (mode === "deliver" || mode === "direct") return "announce"
  return "none"
}
