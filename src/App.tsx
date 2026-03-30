import { useEffect } from "react"
import { Header } from "@/components/layout/Header"
import { StatusBar } from "@/components/layout/StatusBar"
import { SystemHealth } from "@/components/dashboard/SystemHealth"
import { CronJobList } from "@/components/dashboard/CronJobList"
import { CronJobDetail } from "@/components/dashboard/CronJobDetail"
import { useGatewayStore } from "@/stores/gateway-store"
import { useSystemStore } from "@/stores/system-store"
import { useCronStore } from "@/stores/cron-store"
import { gatewayWs, setupEventDispatch } from "@/services/gateway-ws"

function App() {
  const { token, connectionStatus, setConnectionStatus } = useGatewayStore()
  const updateSystem = useSystemStore((s) => s.updateSystem)
  const setJobs = useCronStore((s) => s.setJobs)

  // Set up WS event dispatch (once)
  useEffect(() => {
    setupEventDispatch(updateSystem, setJobs)
    gatewayWs.setStatusChangeHandler((status, error) => {
      setConnectionStatus(status, error)
    })
  }, [updateSystem, setJobs, setConnectionStatus])

  // Connect/disconnect when token is available
  useEffect(() => {
    if (token) {
      gatewayWs.connect(token)
      return () => gatewayWs.disconnect()
    }
  }, [token])

  // On connect: fetch initial data via WS RPC
  useEffect(() => {
    if (connectionStatus === "connected") {
      gatewayWs.cronList().then(setJobs).catch(() => {})
    }
  }, [connectionStatus, setJobs])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 space-y-6 p-6">
        <SystemHealth />
        <CronJobList />
      </main>
      <StatusBar />
      <CronJobDetail />
    </div>
  )
}

export default App
