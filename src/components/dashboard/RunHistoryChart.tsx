import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type { CronRun } from "@/types/cron"

const chartConfig = {
  duration: {
    label: "Duration (s)",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

interface RunHistoryChartProps {
  runs: CronRun[]
}

export function RunHistoryChart({ runs }: RunHistoryChartProps) {
  const data = runs
    .filter((r) => r.durationMs != null)
    .map((r) => ({
      time: new Date(r.runAtMs).toLocaleTimeString(),
      duration: (r.durationMs ?? 0) / 1000,
      status: r.status,
    }))
    .reverse()

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No run history with duration data.
      </p>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" fontSize={12} />
        <YAxis fontSize={12} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area
          type="monotone"
          dataKey="duration"
          stroke="var(--color-duration)"
          fill="var(--color-duration)"
          fillOpacity={0.2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
