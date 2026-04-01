import { useMemo } from "react"
import { PieChart, Pie, Cell, Tooltip } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { Card, CardContent } from "@/components/ui/card"
import { useCronStore } from "@/stores/cron-store"

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "hsl(280 65% 60%)",
  "hsl(340 65% 55%)",
  "hsl(160 50% 45%)",
]

export function CronRunsByAgentChart() {
  const jobs = useCronStore((s) => s.jobs)
  const runTotals = useCronStore((s) => s.runTotals)

  const { data, chartConfig } = useMemo(() => {
    const agentTotals = new Map<string, number>()

    for (const job of jobs) {
      const agent = job.agentId ?? "unknown"
      const total = runTotals[job.id] ?? 0
      agentTotals.set(agent, (agentTotals.get(agent) ?? 0) + total)
    }

    const entries = [...agentTotals.entries()]
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])

    const config: ChartConfig = {}
    entries.forEach(([agent], i) => {
      config[agent] = { label: agent, color: COLORS[i % COLORS.length] }
    })

    return {
      data: entries.map(([agent, count]) => ({ agent, count })),
      chartConfig: config,
    }
  }, [jobs, runTotals])

  if (data.length === 0) {
    return (
      <Card className="flex-1">
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">Runs by Agent</p>
          <p className="py-8 text-center text-sm text-muted-foreground">No run data available.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="flex-1">
      <CardContent>
        <p className="text-xs text-muted-foreground mb-3">Runs by Agent</p>
        <div className="flex items-center gap-4">
          <ChartContainer config={chartConfig} className="h-[140px] w-[140px] shrink-0">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="agent"
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={60}
                strokeWidth={2}
                isAnimationActive={false}
              >
                {data.map((entry, i) => (
                  <Cell key={entry.agent} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0]
                  return (
                    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="ml-2 font-mono font-medium">
                        {(item.value as number).toLocaleString()} runs
                      </span>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ChartContainer>
          <div className="space-y-1.5 text-xs">
            {data.map((entry, i) => (
              <div key={entry.agent} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                <span className="text-muted-foreground">{entry.agent}</span>
                <span className="ml-auto font-mono tabular-nums">
                  {entry.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
