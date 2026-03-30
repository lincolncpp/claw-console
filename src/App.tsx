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
import { useTerminalStore } from "@/stores/terminal-store"
import { notifySessionsChanged } from "@/hooks/use-sessions-refresh"

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
      onSessionsChanged: () => {
        notifySessionsChanged()
      },
      onPresence: () => {},
      onApprovalRequested: () => {},
      onApprovalResolved: () => {},
      onChatEvent: (event, payload) => {
        const p = payload as Record<string, unknown>
        const evtAgent = (p.agentId as string) ?? null
        const evtSession = (p.session as string) ?? (p.sessionKey as string) ?? null
        const { agentId: tAgent, sessionKey: tSession } = useTerminalStore.getState()

        // Only process events for the active terminal session
        if (evtAgent !== tAgent || evtSession !== tSession) return

        if (event === "chat.delta" || event === "session.delta") {
          const text = (p.text as string) ?? (p.content as string) ?? ""
          const current = useTerminalStore.getState().streamingText
          useTerminalStore.getState().updateStreamingText((current ?? "") + text)
        } else if (event === "chat.tool.start" || event === "session.tool.start") {
          useTerminalStore.getState().updateStreamingToolCall({
            id: (p.toolCallId as string) ?? crypto.randomUUID(),
            name: (p.name as string) ?? (p.tool as string) ?? "unknown",
            args: p.args ?? p.input,
            status: "running",
          })
        } else if (event === "chat.tool.end" || event === "session.tool.end") {
          const current = useTerminalStore.getState().streamingToolCall
          if (current) {
            const msgs = [...useTerminalStore.getState().messages]
            const lastMsg = msgs[msgs.length - 1]
            const finishedTool = {
              ...current,
              result: p.result ?? p.output,
              status: (p.error ? "error" : "success") as "error" | "success",
              durationMs: p.durationMs as number | undefined,
            }
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

  useEffect(() => {
    if (connectionStatus !== "connected") return
    const { agentId } = useTerminalStore.getState()
    if (agentId) return // already have a session selected

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
            // Load session history (best-effort)
            const compositeKey = `agent:${aid}:${skey}`
            gatewayWs
              .chatHistory(compositeKey)
              .then((histResp) => {
                const data = histResp as {
                  messages?: Array<{
                    id?: string
                    role?: string
                    content?: string
                    timestamp?: number
                  }>
                }
                if (!data.messages?.length) return
                const msgs = data.messages.map((m) => ({
                  id: m.id ?? crypto.randomUUID(),
                  role: (m.role as "user" | "assistant" | "system") ?? "system",
                  content: m.content ?? "",
                  timestamp: m.timestamp ?? Date.now(),
                }))
                useTerminalStore.getState().setMessages(msgs)
              })
              .catch(() => {})
          })
          .catch(() => {
            useTerminalStore.getState().setSession(aid, "main")
          })
      })
      .catch(() => {})
  }, [connectionStatus])

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
