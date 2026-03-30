import { useNavStore } from "@/stores/nav-store"
import { OverviewPage } from "@/components/pages/OverviewPage"
import { SessionsPage } from "@/components/pages/SessionsPage"
import { NodesPage } from "@/components/pages/NodesPage"
import { LogsPage } from "@/components/pages/LogsPage"
import { ApprovalsPage } from "@/components/pages/ApprovalsPage"
import { AgentsPage } from "@/components/pages/AgentsPage"
import { CronPage } from "@/components/pages/CronPage"

export function PageRouter() {
  const activePage = useNavStore((s) => s.activePage)

  switch (activePage) {
    case "overview":
      return <OverviewPage />
    case "sessions":
      return <SessionsPage />
    case "nodes":
      return <NodesPage />
    case "logs":
      return <LogsPage />
    case "approvals":
      return <ApprovalsPage />
    case "agents":
      return <AgentsPage />
    case "cron":
      return <CronPage />
  }
}
