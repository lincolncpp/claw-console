import { useMemo } from "react"
import { useRpc } from "./use-rpc"
import { useConfig } from "./use-config"
import { gatewayWs } from "@/services/gateway-ws"
import type { AgentEntry, GlobalConfig } from "@/types/agent"

export function useAgents() {
  const {
    data,
    isLoading,
    error,
    scopeError,
    refetch: refetchAgents,
  } = useRpc(() => gatewayWs.agentsList(), [])
  const { parsed, configHash, refetch: refetchConfig } = useConfig()

  const refetch = () => {
    refetchAgents()
    refetchConfig()
  }

  const agents = useMemo(() => {
    const base = data?.agents ?? []

    const configList = parsed?.agents?.list ?? []
    const defaults = parsed?.agents?.defaults
    const bindings = parsed?.bindings ?? []

    // Normalize model field — gateway may return it as {primary, fallbacks} object
    const normalizeModel = (model: unknown): string | undefined => {
      if (!model) return undefined
      if (typeof model === "string") return model
      if (typeof model === "object" && model !== null && "primary" in model) {
        return (model as { primary?: string }).primary
      }
      return undefined
    }

    return base.map((agent): AgentEntry => {
      const cfg = configList.find((c) => c.id === agent.id)
      const agentBindings = bindings
        .filter((b) => b.agentId === agent.id && b.match?.channel)
        .map((b) => b.match!.channel!)
      const uniqueChannels = [...new Set(agentBindings)]

      const cfgModelFallbacks =
        typeof cfg?.model === "object" && cfg.model !== null
          ? (cfg.model as { fallbacks?: string[] }).fallbacks
          : undefined

      return {
        ...agent,
        workspace: cfg?.workspace ?? defaults?.workspace,
        model:
          normalizeModel(cfg?.model) ?? defaults?.model?.primary ?? normalizeModel(agent.model),
        channels: uniqueChannels.length > 0 ? uniqueChannels : undefined,
        thinkingDefault: cfg?.thinkingDefault ?? defaults?.thinkingDefault,
        timeoutSeconds: defaults?.timeoutSeconds,
        maxConcurrent: defaults?.maxConcurrent,
        memorySearchEnabled: cfg?.memorySearch?.enabled ?? defaults?.memorySearch?.enabled,
        fallbacks: cfgModelFallbacks ?? defaults?.model?.fallbacks,
        compactionMode: defaults?.compaction?.mode,
        subagentsMaxConcurrent: defaults?.subagents?.maxConcurrent,
        subagentsModel: cfg?.subagents?.model ?? defaults?.subagents?.model,
      }
    })
  }, [data, parsed])

  const globalConfig = useMemo((): GlobalConfig | undefined => {
    if (!parsed) return undefined
    return {
      cronMaxConcurrentRuns: parsed.cron?.maxConcurrentRuns,
      defaultTimeoutSeconds: parsed.agents?.defaults?.timeoutSeconds,
      defaultMaxConcurrent: parsed.agents?.defaults?.maxConcurrent,
      defaultMemorySearch:
        parsed.agents?.defaults?.memorySearch?.enabled != null
          ? parsed.agents.defaults.memorySearch.enabled
            ? "enabled"
            : "disabled"
          : undefined,
      defaultCompaction: parsed.agents?.defaults?.compaction?.mode,
      defaultSubagentModel: parsed.agents?.defaults?.subagents?.model,
      defaultSubagentConcurrency: parsed.agents?.defaults?.subagents?.maxConcurrent,
    }
  }, [parsed])

  return {
    agents,
    defaultId: data?.defaultId,
    globalConfig,
    configHash,
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

export function useTools(agentId?: string) {
  const { data, isLoading, error, scopeError, refetch } = useRpc(
    () => gatewayWs.toolsCatalog(agentId),
    [agentId],
  )
  const groups = Array.isArray(data?.groups) ? data.groups : []
  return { groups, profiles: data?.profiles ?? [], isLoading, error, scopeError, refetch }
}

export function useSkills() {
  const { data, isLoading, error, scopeError } = useRpc(() => gatewayWs.skillsStatus(), [])
  const skills = Array.isArray(data?.skills) ? data.skills : Array.isArray(data) ? data : []
  return { skills, isLoading, error, scopeError }
}
