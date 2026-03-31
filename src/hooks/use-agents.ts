import { useMemo } from "react"
import { useRpc } from "./use-rpc"
import { gatewayWs } from "@/services/gateway-ws"
import type { AgentEntry, GlobalConfig, ParsedConfig } from "@/types/agent"

export function useAgents() {
  const { data, isLoading, error, scopeError, refetch } = useRpc(() => gatewayWs.agentsList(), [])
  const { data: configData } = useRpc(() => gatewayWs.configGet(), [])

  const parsed: ParsedConfig | undefined = configData?.parsed

  const agents = useMemo(() => {
    const base = data?.agents ?? []
    if (!parsed) return base

    const configList = parsed.agents?.list ?? []
    const defaults = parsed.agents?.defaults
    const bindings = parsed.bindings ?? []

    return base.map((agent): AgentEntry => {
      const cfg = configList.find((c) => c.id === agent.id)
      const agentBindings = bindings
        .filter((b) => b.agentId === agent.id && b.match?.channel)
        .map((b) => b.match!.channel!)
      const uniqueChannels = [...new Set(agentBindings)]

      return {
        ...agent,
        workspace: cfg?.workspace ?? defaults?.workspace,
        model: cfg?.model ?? defaults?.model?.primary,
        channels: uniqueChannels.length > 0 ? uniqueChannels : undefined,
        thinkingDefault: cfg?.thinkingDefault ?? defaults?.thinkingDefault,
        timeoutSeconds: cfg?.timeoutSeconds ?? defaults?.timeoutSeconds,
        maxConcurrent: cfg?.maxConcurrent ?? defaults?.maxConcurrent,
        memorySearchEnabled: cfg?.memorySearch?.enabled ?? defaults?.memorySearch?.enabled,
        fallbacks: defaults?.model?.fallbacks,
        compactionMode: defaults?.compaction?.mode,
        subagentsMaxConcurrent: defaults?.subagents?.maxConcurrent,
        subagentsModel: defaults?.subagents?.model,
      }
    })
  }, [data, parsed])

  const globalConfig = useMemo((): GlobalConfig | undefined => {
    if (!parsed) return undefined
    return {
      toolExecSecurity: parsed.tools?.exec?.security,
      toolAskMode: parsed.tools?.exec?.ask,
      cronMaxConcurrentRuns: parsed.cron?.maxConcurrentRuns,
    }
  }, [parsed])

  return {
    agents,
    defaultId: data?.defaultId,
    globalConfig,
    isLoading,
    error,
    scopeError,
    refetch,
  }
}

export function useModels() {
  const { data, isLoading, error, scopeError } = useRpc(() => gatewayWs.modelsList(), [])
  return { models: data?.models ?? [], isLoading, error, scopeError }
}

export function useTools() {
  const { data, isLoading, error, scopeError } = useRpc(() => gatewayWs.toolsCatalog(), [])
  const tools = Array.isArray(data?.tools) ? data.tools : Array.isArray(data) ? data : []
  return { tools, isLoading, error, scopeError }
}

export function useSkills() {
  const { data, isLoading, error, scopeError } = useRpc(() => gatewayWs.skillsStatus(), [])
  const skills = Array.isArray(data?.skills) ? data.skills : Array.isArray(data) ? data : []
  return { skills, isLoading, error, scopeError }
}
