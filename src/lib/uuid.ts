/**
 * Generate a random UUID v4.
 *
 * `crypto.randomUUID()` is only available in **secure contexts**
 * (HTTPS / localhost). When the app is served over plain HTTP on a
 * LAN IP the native API is missing, so we fall back to a manual
 * implementation that still uses `crypto.getRandomValues` for entropy.
 */
export function uuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  // Fallback: RFC-4122 v4 UUID via getRandomValues
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  // Set version (4) and variant (10xx) bits
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
