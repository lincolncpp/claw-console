export function isScopeError(err: unknown): boolean {
  if (err instanceof Error) return err.message.includes("missing scope")
  if (typeof err === "string") return err.includes("missing scope")
  return false
}

export function formatRpcError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  return "An unknown error occurred"
}
