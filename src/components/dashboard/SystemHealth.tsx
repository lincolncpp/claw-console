import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSystemStore } from "@/stores/system-store"
import { Activity, Radio, Users } from "lucide-react"

export function SystemHealth() {
  const { healthOk, healthCheckMs, channels, agents, totalSessions } = useSystemStore()

  const configuredChannels = channels.length
  const runningChannels = channels.filter((c) => c.health.running).length
  const probeOk = channels.every((c) => c.health.probe?.ok !== false)

  const totalAgents = agents.length
  const activeAgents = agents.filter((a) => a.sessions.count > 0).length

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Gateway Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Gateway</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {healthOk != null ? (
            <>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${healthOk ? "bg-emerald-500" : "bg-red-500"}`}
                />
                <span className="text-2xl font-bold">{healthOk ? "Healthy" : "Unhealthy"}</span>
              </div>
              {healthCheckMs != null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Health check: {healthCheckMs}ms
                </p>
              )}
            </>
          ) : (
            <div className="text-2xl font-bold">--</div>
          )}
        </CardContent>
      </Card>

      {/* Channels */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Channels</CardTitle>
          <Radio className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {configuredChannels > 0 ? (
            <>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full ${probeOk ? "bg-emerald-500" : "bg-red-500"}`}
                />
                <span className="text-2xl font-bold">
                  {runningChannels}/{configuredChannels}
                </span>
              </div>
              <div className="mt-1 space-y-0.5">
                {channels.map((ch) => (
                  <p
                    key={ch.key}
                    className="text-xs text-muted-foreground flex items-center gap-1.5"
                  >
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${ch.health.probe?.ok ? "bg-emerald-500" : "bg-zinc-400"}`}
                    />
                    {ch.label}
                    {ch.health.running ? " (running)" : ""}
                  </p>
                ))}
              </div>
            </>
          ) : (
            <div className="text-2xl font-bold">--</div>
          )}
        </CardContent>
      </Card>

      {/* Agents / Sessions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Agents</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {totalAgents > 0 ? (
            <>
              <div className="text-2xl font-bold">
                {activeAgents}/{totalAgents}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalSessions != null ? `${totalSessions.toLocaleString()} sessions` : ""}
              </p>
            </>
          ) : (
            <div className="text-2xl font-bold">--</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
