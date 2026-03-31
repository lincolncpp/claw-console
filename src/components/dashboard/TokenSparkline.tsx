import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatTokensCompact } from "@/lib/format"
import { useCronStore } from "@/stores/cron-store"

const DAYS = 30
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

function dayKey(ms: number) {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function formatDayLabel(key: string) {
  const [, m, d] = key.split("-")
  return `${parseInt(m)}/${parseInt(d)}`
}

export function TokenHistogram() {
  const jobs = useCronStore((s) => s.jobs)
  const runs = useCronStore((s) => s.runs)

  const { data, jobNames, chartConfig } = useMemo(() => {
    const cutoff = Date.now() - DAYS * 86_400_000
    const jobNameMap = new Map<string, string>()
    for (const job of jobs) {
      jobNameMap.set(job.id, job.name || job.id)
    }

    // Build day -> jobId -> tokens map
    const dayMap = new Map<string, Record<string, number>>()
    const jobIds = new Set<string>()

    for (const [jobId, jobRuns] of Object.entries(runs)) {
      for (const run of jobRuns) {
        if (run.runAtMs < cutoff || !run.usage?.total_tokens) continue
        const day = dayKey(run.runAtMs)
        jobIds.add(jobId)
        let dayEntry = dayMap.get(day)
        if (!dayEntry) {
          dayEntry = {}
          dayMap.set(day, dayEntry)
        }
        dayEntry[jobId] = (dayEntry[jobId] ?? 0) + run.usage.total_tokens
      }
    }

    // Generate all 30 days
    const sortedJobIds = [...jobIds].sort()
    const rows: Record<string, unknown>[] = []
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000)
      const key = dayKey(d.getTime())
      const entry: Record<string, unknown> = { day: formatDayLabel(key) }
      const dayData = dayMap.get(key)
      for (const jid of sortedJobIds) {
        entry[jid] = dayData?.[jid] ?? 0
      }
      rows.push(entry)
    }

    // Build chart config
    const config: ChartConfig = {}
    const names: Record<string, string> = {}
    sortedJobIds.forEach((jid, i) => {
      const name = jobNameMap.get(jid) ?? jid
      names[jid] = name
      config[jid] = { label: name, color: getColor(i) }
    })

    return { data: rows, jobNames: names, jobIds: sortedJobIds, chartConfig: config }
  }, [jobs, runs])

  if (data.length === 0) return null

  const jobIdKeys = Object.keys(jobNames)
  if (jobIdKeys.length === 0) return null

  return (
    <ChartContainer config={chartConfig} className="h-[220px] w-full">
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => formatTokensCompact(v)} />
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
                    <span className="text-muted-foreground">{jobNames[p.dataKey as string]}</span>
                    <span className="ml-auto font-mono">{formatTokensCompact(p.value as number)}</span>
                  </div>
                ))}
              </div>
            )
          }}
        />
        {jobIdKeys.map((jid) => (
          <Bar
            key={jid}
            dataKey={jid}
            stackId="tokens"
            fill={chartConfig[jid]?.color}
            radius={0}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}
