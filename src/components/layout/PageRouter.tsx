import { Routes, Route, Navigate } from "react-router-dom"
import { OverviewPage } from "@/components/pages/OverviewPage"
import { SessionsPage } from "@/components/pages/SessionsPage"
import { NodesPage } from "@/components/pages/NodesPage"
import { LogsPage } from "@/components/pages/LogsPage"
import { ApprovalsPage } from "@/components/pages/ApprovalsPage"
import { AgentsPage } from "@/components/pages/AgentsPage"
import { AgentDetailPage } from "@/components/pages/AgentDetailPage"
import { CronPage } from "@/components/pages/CronPage"
import { CronJobDetail } from "@/components/dashboard/CronJobDetail"
import { CronRunDetail } from "@/components/dashboard/CronRunDetail"
import { SkillsPage } from "@/components/pages/SkillsPage"
import { SkillDetailPage } from "@/components/pages/SkillDetailPage"

export function PageRouter() {
  return (
    <Routes>
      <Route path="/" element={<OverviewPage />} />
      <Route path="/sessions" element={<SessionsPage />} />
      <Route path="/agents/:agentId" element={<AgentDetailPage />} />
      <Route path="/agents" element={<AgentsPage />} />
      <Route path="/skills/:skillName" element={<SkillDetailPage />} />
      <Route path="/skills" element={<SkillsPage />} />
      <Route path="/nodes" element={<NodesPage />} />
      <Route path="/cron" element={<CronPage />} />
      <Route path="/cron/:jobId/runs/:runTs" element={<CronRunDetail />} />
      <Route path="/cron/:jobId" element={<CronJobDetail />} />
      <Route path="/logs" element={<LogsPage />} />
      <Route path="/approvals" element={<ApprovalsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
