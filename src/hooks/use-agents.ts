import { useRpc } from "./use-rpc"
import { gatewayWs } from "@/services/gateway-ws"

export function useAgents() {
  const { data, isLoading, error, scopeError, refetch } = useRpc(() => gatewayWs.agentsList(), [])
  return {
    agents: data?.agents ?? [],
    defaultId: data?.defaultId,
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
