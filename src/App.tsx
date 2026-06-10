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
import { notifyCronRunsChanged } from "@/hooks/use-cron-runs-refresh"
import { formatRpcError } from "@/lib/errors"
import { extractAgentId } from "@/lib/session-utils"
import { uuid } from "@/lib/uuid"
import { parseChatHistory, serverHasNewerMessages } from "@/lib/chat-history"
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
    const cleanupDispatch = setupEventDispatch({
      onHealth: updateFromHealth,
      onConnect: updateFromConnect,
      onCron: () => {
        notifyCronRunsChanged()
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
          .catch((err) => {
            console.warn("Failed to refresh session counts:", formatRpcError(err))
          })
      },
      onPresence: () => {},
      onApprovalRequested: () => {},
      onApprovalResolved: () => {},
      onChatEvent: (event, payload) => {
        const p = payload as Record<string, unknown>
        const evtSession = (p.sessionKey as string) ?? (p.session as string) ?? null
        const { sessionKey: tSession } = useTerminalStore.getState()

        // Cron/subagent runs execute on a per-run child lane of the session
        // being viewed (e.g. "agent:a:cron:<job>:run:<id>"); accept those too.
        const matchesTerminalSession =
          !evtSession || !tSession || evtSession === tSession ||
          evtSession.startsWith(`${tSession}:run:`)
        if (!matchesTerminalSession) return

        useTerminalStore.getState().touchLastEvent()

        if (event === "agent") {
          const stream = p.stream as string | undefined
          const data = p.data as Record<string, unknown> | undefined
          if (!stream || !data) return

          if (stream === "assistant") {
            // data.text carries the full text snapshot for the current
            // assistant segment; deltas are a fallback for older gateways.
            const text = data.text as string | undefined
            const delta = data.delta as string | undefined
            if (text) {
              useTerminalStore.getState().updateStreamingText(() => text)
            } else if (delta) {
              useTerminalStore.getState().updateStreamingText((prev) => (prev ?? "") + delta)
            }
          } else if (stream === "thinking") {
            const text = data.text as string | undefined
            const delta = data.delta as string | undefined
            if (text) {
              useTerminalStore.getState().updateStreamingThinking(() => text)
            } else if (delta) {
              useTerminalStore.getState().updateStreamingThinking((prev) => (prev ?? "") + delta)
            }
          } else if (stream === "item") {
            // Activity feed items: commands, patches, searches. Reasoning
            // ("analysis") items are bare start/end markers — the reasoning
            // text itself only streams when the agent has reasoning streaming
            // enabled — so show them as a transient thinking indicator
            // instead of an empty card.
            if (data.kind === "analysis") {
              useTerminalStore
                .getState()
                .updateStreamingThinking(() => (data.phase === "end" ? "" : "…"))
              return
            }
            // Preamble items carry the agent's commentary ("thoughts") before
            // it acts; keep them in the flow as regular assistant text.
            if (data.kind === "preamble") {
              const text = (data.progressText as string) ?? ""
              if (text) {
                useTerminalStore.getState().upsertAssistantText(`preamble-${data.itemId}`, text)
              }
              return
            }
            const phase = data.phase as string | undefined
            const itemId = (data.toolCallId as string) ?? (data.itemId as string) ?? uuid()
            const name =
              (data.name as string) ?? (data.title as string) ?? (data.kind as string) ?? "activity"
            if (phase === "start" || phase === "update") {
              useTerminalStore.getState().updateStreamingToolCall({
                id: itemId,
                name,
                args: data.meta ?? data.progressText,
                status: "running",
              })
            } else if (phase === "end") {
              useTerminalStore.getState().completeToolCall({
                id: itemId,
                name,
                args: data.meta,
                result: data.summary ?? data.error ?? data.progressText,
                status: data.status === "failed" || data.error ? "error" : "success",
              })
            }
          } else if (stream === "text" || stream === "content") {
            if (data.type === "thinking") return
            const text =
              (data.text as string) ?? (data.content as string) ?? (data.delta as string) ?? ""
            if (text) {
              useTerminalStore.getState().updateStreamingText((prev) => (prev ?? "") + text)
            }
          } else if (stream === "tool" || stream === "tool_use") {
            // Tool events carry the raw call (args.command) and its result;
            // they describe the same calls as "item" events, so they share
            // ids and merge into one card via completeToolCall.
            const phase =
              (data.phase as string) ?? (data.status as string) ?? (data.state as string) ?? ""
            const id =
              (data.toolCallId as string) ??
              (data.itemId as string) ??
              (data.id as string) ??
              uuid()
            const name = (data.name as string) ?? (data.tool as string) ?? "unknown"
            if (phase === "start" || phase === "running") {
              useTerminalStore.getState().updateStreamingToolCall({
                id,
                name,
                args: data.args ?? data.input,
                status: "running",
              })
            } else if (
              phase === "result" ||
              phase === "end" ||
              phase === "done" ||
              phase === "success" ||
              phase === "error"
            ) {
              useTerminalStore.getState().completeToolCall({
                id,
                name,
                args: data.args ?? data.input,
                result: data.result ?? data.output ?? data.text,
                status: phase === "error" || data.isError === true ? "error" : "success",
                durationMs: data.durationMs as number | undefined,
              })
            }
          } else if (stream === "lifecycle") {
            const status =
              (data.status as string) ?? (data.state as string) ?? (data.phase as string) ?? ""
            if (status === "done" || status === "end" || status === "complete") {
              useTerminalStore.getState().finalizeStreaming()
            } else if (status === "error" || status === "failed") {
              useTerminalStore.getState().setRunState("error")
              useTerminalStore.getState().appendMessage({
                id: uuid(),
                role: "system",
                content: (data.message as string) ?? (data.error as string) ?? "An error occurred.",
                timestamp: Date.now(),
                isError: true,
              })
            }
          }
          return
        }

        if (event === "chat.delta" || event === "session.delta") {
          const text = (p.text as string) ?? (p.content as string) ?? ""
          useTerminalStore.getState().updateStreamingText((prev) => (prev ?? "") + text)
        } else if (
          event === "chat.end" ||
          event === "session.end" ||
          event === "chat.message.end"
        ) {
          useTerminalStore.getState().finalizeStreaming()
        } else if (event === "chat.error" || event === "session.error") {
          useTerminalStore.getState().setRunState("error")
          useTerminalStore.getState().appendMessage({
            id: uuid(),
            role: "system",
            content: (p.message as string) ?? (p.error as string) ?? "An error occurred.",
            timestamp: Date.now(),
            isError: true,
          })
        }
      },
    })
    gatewayWs.setStatusChangeHandler((status, error) => {
      setConnectionStatus(status, error)
      if (status === "connected") {
        const { runState, sessionKey } = useTerminalStore.getState()
        if ((runState === "waiting" || runState === "streaming") && sessionKey) {
          gatewayWs
            .chatHistory(sessionKey)
            .then((resp) => {
              const serverMsgs = parseChatHistory(resp)
              if (!serverMsgs) return
              const { runState: rs, messages } = useTerminalStore.getState()
              if (rs !== "waiting" && rs !== "streaming") return
              if (!serverHasNewerMessages(serverMsgs, messages)) return
              useTerminalStore.getState().setMessages(serverMsgs)
              useTerminalStore.getState().resetStreaming()
            })
            .catch((err) => {
              console.warn("Reconnect chat history poll failed:", err)
            })
        }
      }
    })
    return () => {
      cleanupDispatch()
      gatewayWs.setStatusChangeHandler(null)
    }
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
