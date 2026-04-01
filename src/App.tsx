import { useEffect } from "react"
import { Header } from "@/components/layout/Header"
import { StatusBar } from "@/components/layout/StatusBar"
import { Sidebar } from "@/components/layout/Sidebar"
import { PageRouter } from "@/components/layout/PageRouter"
import { TerminalPanel } from "@/components/terminal/TerminalPanel"
import { ErrorToasts } from "@/components/shared/ErrorToasts"
import { GatewayDisconnectedModal } from "@/components/shared/GatewayDisconnectedModal"
import { useGatewayStore } from "@/stores/gateway-store"
import { useSystemStore } from "@/stores/system-store"
import { useCronStore } from "@/stores/cron-store"
import { gatewayWs, setupEventDispatch } from "@/services/gateway-ws"
import { useTerminalStore } from "@/stores/terminal-store"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { notifySessionsChanged } from "@/hooks/use-sessions-refresh"
import { formatRpcError } from "@/lib/errors"
import { extractAgentId } from "@/lib/session-utils"
import { useFetchAllCronRuns } from "@/hooks/use-all-cron-runs"

function App() {
  const { token, connectionStatus, setConnectionStatus } = useGatewayStore()
  const updateFromHealth = useSystemStore((s) => s.updateFromHealth)
  const updateFromConnect = useSystemStore((s) => s.updateFromConnect)
  const updateAgentSessionCounts = useSystemStore((s) => s.updateAgentSessionCounts)
  const setJobs = useCronStore((s) => s.setJobs)
  const addToast = useErrorToastStore((s) => s.addToast)

  useFetchAllCronRuns()

  useEffect(() => {
    setupEventDispatch({
      onHealth: updateFromHealth,
      onConnect: updateFromConnect,
      onCron: () => {
        gatewayWs
          .cronList()
          .then(setJobs)
          .catch((err) => addToast(formatRpcError(err)))
      },
      onSessionsChanged: () => {
        notifySessionsChanged()
        gatewayWs
          .sessionsList()
          .then((resp) => {
            const counts: Record<string, number> = {}
            for (const s of resp.sessions) {
              const aid = extractAgentId(s.key)
              counts[aid] = (counts[aid] ?? 0) + 1
            }
            updateAgentSessionCounts(counts)
          })
          .catch(() => {})
      },
      onPresence: () => {},
      onApprovalRequested: () => {},
      onApprovalResolved: () => {},
      onChatEvent: (event, payload) => {
        const p = payload as Record<string, unknown>
        const evtSession = (p.sessionKey as string) ?? (p.session as string) ?? null
        const { sessionKey: tSession } = useTerminalStore.getState()

        if (evtSession && tSession && evtSession !== tSession) return

        if (event === "agent") {
          const stream = p.stream as string | undefined
          const data = p.data as Record<string, unknown> | undefined
          if (!stream || !data) return

          if (stream === "text" || stream === "content") {
            const text =
              (data.text as string) ?? (data.content as string) ?? (data.delta as string) ?? ""
            if (text) {
              const current = useTerminalStore.getState().streamingText
              useTerminalStore.getState().updateStreamingText((current ?? "") + text)
            }
          } else if (stream === "tool" || stream === "tool_use") {
            const status = (data.status as string) ?? (data.state as string) ?? ""
            if (status === "start" || status === "running") {
              useTerminalStore.getState().updateStreamingToolCall({
                id: (data.toolCallId as string) ?? (data.id as string) ?? crypto.randomUUID(),
                name: (data.name as string) ?? (data.tool as string) ?? "unknown",
                args: data.args ?? data.input,
                status: "running",
              })
            } else if (
              status === "end" ||
              status === "done" ||
              status === "success" ||
              status === "error"
            ) {
              const current = useTerminalStore.getState().streamingToolCall
              if (current) {
                const finishedTool = {
                  ...current,
                  result: data.result ?? data.output,
                  status: (status === "error" ? "error" : "success") as "error" | "success",
                  durationMs: data.durationMs as number | undefined,
                }
                const msgs = [...useTerminalStore.getState().messages]
                const lastMsg = msgs[msgs.length - 1]
                if (lastMsg && lastMsg.role === "assistant") {
                  msgs[msgs.length - 1] = {
                    ...lastMsg,
                    toolCalls: [...(lastMsg.toolCalls ?? []), finishedTool],
                  }
                  useTerminalStore.getState().setMessages(msgs)
                } else {
                  useTerminalStore.getState().appendMessage({
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: "",
                    timestamp: Date.now(),
                    toolCalls: [finishedTool],
                  })
                }
                useTerminalStore.setState({ streamingToolCall: null })
              }
            }
          } else if (stream === "lifecycle") {
            const status = (data.status as string) ?? (data.state as string) ?? ""
            if (status === "done" || status === "end" || status === "complete") {
              useTerminalStore.getState().finalizeStreaming()
            } else if (status === "error" || status === "failed") {
              useTerminalStore.getState().setRunState("error")
              useTerminalStore.getState().appendMessage({
                id: crypto.randomUUID(),
                role: "system",
                content: (data.message as string) ?? (data.error as string) ?? "An error occurred.",
                timestamp: Date.now(),
              })
            }
          }
          return
        }

        if (event === "chat.delta" || event === "session.delta") {
          const text = (p.text as string) ?? (p.content as string) ?? ""
          const current = useTerminalStore.getState().streamingText
          useTerminalStore.getState().updateStreamingText((current ?? "") + text)
        } else if (
          event === "chat.end" ||
          event === "session.end" ||
          event === "chat.message.end"
        ) {
          useTerminalStore.getState().finalizeStreaming()
        } else if (event === "chat.error" || event === "session.error") {
          useTerminalStore.getState().setRunState("error")
          useTerminalStore.getState().appendMessage({
            id: crypto.randomUUID(),
            role: "system",
            content: (p.message as string) ?? (p.error as string) ?? "An error occurred.",
            timestamp: Date.now(),
          })
        }
      },
    })
    gatewayWs.setStatusChangeHandler((status, error) => {
      setConnectionStatus(status, error)
    })
  }, [
    updateFromHealth,
    updateFromConnect,
    setJobs,
    setConnectionStatus,
    addToast,
    updateAgentSessionCounts,
  ])

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
        .catch((err) => addToast(formatRpcError(err)))
    }
  }, [connectionStatus, setJobs, addToast])

  useEffect(() => {
    if (connectionStatus !== "connected") return
    const { agentId } = useTerminalStore.getState()
    if (agentId) return

    gatewayWs
      .agentsList()
      .then((resp) => {
        const defaultAgent = resp.agents.find((a) => a.isDefault) ?? resp.agents[0]
        if (!defaultAgent) return
        const aid = defaultAgent.id
        gatewayWs
          .sessionsList()
          .then((sessResp) => {
            const agentSession =
              sessResp.sessions.find((s) => s.agentId === aid) ?? sessResp.sessions[0]
            const skey = agentSession?.key ?? "main"
            useTerminalStore.getState().setSession(aid, skey)
          })
          .catch((err) => {
            addToast(
              `Could not load sessions list, using default: ${formatRpcError(err)}`,
              "warning",
            )
            useTerminalStore.getState().setSession(aid, "main")
          })
      })
      .catch((err) => addToast(`Failed to load agents: ${formatRpcError(err)}`))
  }, [connectionStatus, addToast])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 h-full">
        <Header />
        <main className="flex-1 min-h-0 overflow-y-auto p-6">
          <PageRouter />
        </main>
        <TerminalPanel />
        <StatusBar />
      </div>
      <ErrorToasts />
      <GatewayDisconnectedModal />
    </div>
  )
}

export default App
