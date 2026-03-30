import { useEffect } from "react"
import { Header } from "@/components/layout/Header"
import { StatusBar } from "@/components/layout/StatusBar"
import { Sidebar } from "@/components/layout/Sidebar"
import { PageRouter } from "@/components/layout/PageRouter"
import { TerminalPanel } from "@/components/terminal/TerminalPanel"
import { CronJobDetail } from "@/components/dashboard/CronJobDetail"
import { useGatewayStore } from "@/stores/gateway-store"
import { useSystemStore } from "@/stores/system-store"
import { useCronStore } from "@/stores/cron-store"
import { gatewayWs, setupEventDispatch } from "@/services/gateway-ws"

function App() {
  const { token, connectionStatus, setConnectionStatus } = useGatewayStore()
  const updateFromHealth = useSystemStore((s) => s.updateFromHealth)
  const updateFromConnect = useSystemStore((s) => s.updateFromConnect)
  const setJobs = useCronStore((s) => s.setJobs)

  useEffect(() => {
    setupEventDispatch({
      onHealth: updateFromHealth,
      onConnect: updateFromConnect,
      onCron: () => {
        gatewayWs
          .cronList()
          .then(setJobs)
          .catch(() => {})
      },
      onSessionsChanged: () => {},
      onPresence: () => {},
      onApprovalRequested: () => {},
      onApprovalResolved: () => {},
      onChatEvent: () => {},
    })
    gatewayWs.setStatusChangeHandler((status, error) => {
      setConnectionStatus(status, error)
    })
  }, [updateFromHealth, updateFromConnect, setJobs, setConnectionStatus])

  useEffect(() => {
    if (token) {
      gatewayWs.connect(token)
      return () => gatewayWs.disconnect()
    }
  }, [token])

  useEffect(() => {
    if (connectionStatus === "connected") {
      gatewayWs
        .cronList()
        .then(setJobs)
        .catch(() => {})
    }
  }, [connectionStatus, setJobs])

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <PageRouter />
        </main>
        <TerminalPanel />
        <StatusBar />
      </div>
      <CronJobDetail />
    </div>
  )
}

export default App
