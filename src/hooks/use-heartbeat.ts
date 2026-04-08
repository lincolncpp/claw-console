import { useMemo, useCallback } from "react"
import { useSystemStore } from "@/stores/system-store"
import { useConfig } from "./use-config"
import { useRpc } from "./use-rpc"
import { gatewayWs } from "@/services/gateway-ws"
import { useErrorToastStore } from "@/stores/error-toast-store"
import { formatRpcError } from "@/lib/errors"
import type { HeartbeatAgentEntry, HeartbeatConfig } from "@/types/heartbeat"

export function useHeartbeatAgents() {
  const agents = useSystemStore((s) => s.agents)
  const isLoading = useSystemStore((s) => s.lastUpdated === null)

  const heartbeatAgents: HeartbeatAgentEntry[] = useMemo(
    () =>
      agents
        .filter((a) => a.heartbeat != null)
        .map((a) => ({
          agentId: a.agentId,
          name: a.name,
          isDefault: a.isDefault,
          heartbeat: a.heartbeat!,
        })),
    [agents],
  )

  return { agents: heartbeatAgents, isLoading }
}

export function useHeartbeatDefaults() {
  const { parsed, configHash, isLoading, refetch } = useConfig()
  const addToast = useErrorToastStore((s) => s.addToast)

  const defaults: HeartbeatConfig = parsed?.agents?.defaults?.heartbeat ?? {}

  const updateDefaults = useCallback(
    async (patch: Partial<HeartbeatConfig>) => {
      try {
        await gatewayWs.configPatch(
          { agents: { defaults: { heartbeat: { ...patch } } } },
          configHash,
        )
        refetch()
      } catch (err) {
        addToast(`Failed to update heartbeat defaults: ${formatRpcError(err)}`)
        throw err
      }
    },
    [configHash, refetch, addToast],
  )

  return { defaults, configHash, isLoading, updateDefaults, refetch }
}

export function useHeartbeatConfig(agentId: string) {
  const { parsed, configHash, isLoading, refetch } = useConfig()
  const addToast = useErrorToastStore((s) => s.addToast)

  const agentConfig: HeartbeatConfig = useMemo(() => {
    const agentList = parsed?.agents?.list ?? []
    const entry = agentList.find(
      (a: { id?: string }) => a.id === agentId,
    ) as Record<string, unknown> | undefined
    return (entry?.heartbeat as HeartbeatConfig) ?? {}
  }, [parsed, agentId])

  const updateConfig = useCallback(
    async (patch: Partial<HeartbeatConfig>) => {
      try {
        await gatewayWs.configPatch(
          { agents: { list: [{ id: agentId, heartbeat: { ...patch } }] } },
          configHash,
        )
        refetch()
      } catch (err) {
        addToast(`Failed to update heartbeat config: ${formatRpcError(err)}`)
        throw err
      }
    },
    [agentId, configHash, refetch, addToast],
  )

  return { config: agentConfig, configHash, isLoading, updateConfig, refetch }
}

export function useLastHeartbeat(agentId?: string) {
  return useRpc(() => gatewayWs.lastHeartbeat(agentId), [agentId])
}

export function useGlobalHeartbeatToggle() {
  const addToast = useErrorToastStore((s) => s.addToast)

  const toggle = useCallback(
    async (enabled: boolean) => {
      try {
        await gatewayWs.setHeartbeats(enabled)
      } catch (err) {
        addToast(`Failed to toggle heartbeats: ${formatRpcError(err)}`)
        throw err
      }
    },
    [addToast],
  )

  return { toggle }
}
