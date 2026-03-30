export interface ApprovalEntry {
  id: string
  sessionKey?: string
  agentId?: string
  action?: string
  description?: string
  tool?: string
  status: "pending" | "approved" | "denied" | "expired"
  requestedAt?: number
  resolvedAt?: number
  resolvedBy?: string
}

export interface ApprovalsResponse {
  approvals: ApprovalEntry[]
}
