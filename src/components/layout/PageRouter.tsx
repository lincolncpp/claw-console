import { Routes, Route, Navigate } from "react-router-dom"
import { OverviewPage } from "@/components/pages/OverviewPage"
import { SessionsPage } from "@/components/pages/SessionsPage"
import { NodesPage } from "@/components/pages/NodesPage"
import { LogsPage } from "@/components/pages/LogsPage"
import { ApprovalsPage } from "@/components/pages/ApprovalsPage"
import { AgentsPage } from "@/components/pages/AgentsPage"
import { CronPage } from "@/components/pages/CronPage"

export function PageRouter() {
  return (
    <Routes>
      <Route path="/" element={<OverviewPage />} />
      <Route path="/sessions" element={<SessionsPage />} />
      <Route path="/agents" element={<AgentsPage />} />
      <Route path="/nodes" element={<NodesPage />} />
      <Route path="/cron" element={<CronPage />} />
      <Route path="/logs" element={<LogsPage />} />
      <Route path="/approvals" element={<ApprovalsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
