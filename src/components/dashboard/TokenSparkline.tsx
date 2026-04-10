import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"
import { formatTokensCompact } from "@/lib/format"
import { useCronStore } from "@/stores/cron-store"
import { extractAgentId, extractSessionType } from "@/lib/session-utils"
import type { SessionEntry } from "@/types/session"

const HOURS = 7 * 24
const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "hsl(280 65% 60%)",
  "hsl(340 65% 55%)",
  "hsl(160 50% 45%)",
  "hsl(30 80% 55%)",
  "hsl(200 70% 50%)",
]

function getColor(index: number) {
  return COLORS[index % COLORS.length]
}

function hourKey(ms: number) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}`
}

function formatHourLabel(key: string) {
  const [datePart, hour] = key.split("T")
  const [, m, d] = datePart.split("-")
  return `${parseInt(m)}/${parseInt(d)} ${hour}:00`
}

export function TokenHistogram({ tokenSessions }: { tokenSessions?: SessionEntry[] }) {
  const jobs = useCronStore((s) => s.jobs)
  const runs = useCronStore((s) => s.runs)
  // eslint-disable-next-line react-hooks/purity -- cutoff for 7-day chart window; harmless impurity
  const now = Date.now()

  const { data, seriesNames, chartConfig } = useMemo(() => {
    const cutoff = now - HOURS * 3_600_000
    const jobNameMap = new Map<string, string>()
    for (const job of jobs) {
      jobNameMap.set(job.id, job.name || job.id)
    }

    // Build hour -> seriesKey -> tokens map
    const hourMap = new Map<string, Record<string, number>>()
    const seriesKeys = new Set<string>()

    for (const [jobId, jobRuns] of Object.entries(runs)) {
      for (const run of jobRuns) {
        if (run.runAtMs < cutoff || !run.usage?.total_tokens) continue
        const hour = hourKey(run.runAtMs)
        seriesKeys.add(jobId)
        let hourEntry = hourMap.get(hour)
        if (!hourEntry) {
          hourEntry = {}
          hourMap.set(hour, hourEntry)
        }
        hourEntry[jobId] = (hourEntry[jobId] ?? 0) + run.usage.total_tokens
      }
    }

    // Add session tokens grouped by agent and type
    if (tokenSessions) {
      for (const session of tokenSessions) {
        if (!session.updatedAt || !session.totalTokens || session.updatedAt < cutoff) continue
        const sessionType = extractSessionType(session.key)
        const agentId = extractAgentId(session.key)
        const seriesKey = `session::${sessionType}::${agentId}`
        const hour = hourKey(session.updatedAt)
        seriesKeys.add(seriesKey)
        let hourEntry = hourMap.get(hour)
        if (!hourEntry) {
          hourEntry = {}
          hourMap.set(hour, hourEntry)
        }
        hourEntry[seriesKey] = (hourEntry[seriesKey] ?? 0) + session.totalTokens
      }
    }

    // Generate all 168 hours (7 days)
    const sortedKeys = [...seriesKeys].sort()
    const rows: Record<string, unknown>[] = []
    for (let i = HOURS - 1; i >= 0; i--) {
      const d = new Date(now - i * 3_600_000)
      const key = hourKey(d.getTime())
      const entry: Record<string, unknown> = { day: formatHourLabel(key) }
      const hourData = hourMap.get(key)
      for (const sk of sortedKeys) {
        entry[sk] = hourData?.[sk] ?? 0
      }
      rows.push(entry)
    }

    // Build chart config
    const config: ChartConfig = {}
    const names: Record<string, string> = {}
    sortedKeys.forEach((sk, i) => {
      let name: string
      if (sk.startsWith("session::")) {
        const parts = sk.split("::")
        const sessionType = parts[1]
        const agentId = parts[2]
        name = `${agentId} ${sessionType}`
      } else {
        name = jobNameMap.get(sk) ?? sk
      }
      names[sk] = name
      config[sk] = { label: name, color: getColor(i) }
    })

    return { data: rows, seriesNames: names, chartConfig: config }
  }, [jobs, runs, tokenSessions, now])

  if (data.length === 0) return null

  const seriesIdKeys = Object.keys(seriesNames)
  if (seriesIdKeys.length === 0) return null

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatTokensCompact(v)}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const items = payload.filter((p) => (p.value as number) > 0)
            if (items.length === 0) return null
            const total = items.reduce((s, p) => s + (p.value as number), 0)
            return (
              <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">{label}</p>
                  <span className="font-mono font-medium ml-4">{formatTokensCompact(total)}</span>
                </div>
                {items.map((p) => (
                  <div key={p.dataKey as string} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-muted-foreground">
                      {seriesNames[p.dataKey as string]}
                    </span>
                    <span className="ml-auto font-mono">
                      {formatTokensCompact(p.value as number)}
                    </span>
                  </div>
                ))}
              </div>
            )
          }}
        />
        {seriesIdKeys.map((sk) => (
          <Bar
            key={sk}
            dataKey={sk}
            stackId="tokens"
            fill={chartConfig[sk]?.color}
            radius={0}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}
