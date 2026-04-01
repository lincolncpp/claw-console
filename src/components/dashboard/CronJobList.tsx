import { Fragment, useMemo } from "react"
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { useCronStore } from "@/stores/cron-store"
import { CronJobRow } from "./CronJobRow"
import { useCronTokens } from "@/hooks/use-all-cron-runs"
import { useNavigate } from "react-router-dom"

export function CronJobList() {
  const jobs = useCronStore((s) => s.jobs)
  const runs = useCronStore((s) => s.runs)
  const navigate = useNavigate()
  const { avgByJob } = useCronTokens()

  const grouped = useMemo(() => {
    const map = new Map<string, typeof jobs>()
    for (const job of jobs) {
      const agent = job.agentId ?? "unknown"
      const list = map.get(agent)
      if (list) list.push(job)
      else map.set(agent, [job])
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([agent, agentJobs]) =>
          [
            agent,
            [...agentJobs].sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id)),
          ] as const,
      )
  }, [jobs])

  return (
    <Card>
      <CardContent>
        {jobs.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No cron jobs found. Connect to a gateway to see jobs.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Last Run Time</TableHead>
                <TableHead>Last 5 Runs</TableHead>
                <TableHead className="text-right">Avg. Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map(([agentId, agentJobs]) => (
                <Fragment key={agentId}>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableCell
                      colSpan={8}
                      className="py-1.5 text-xs font-semibold text-muted-foreground"
                    >
                      {agentId}
                    </TableCell>
                  </TableRow>
                  {agentJobs.map((job) => (
                    <CronJobRow
                      key={job.id}
                      job={job}
                      recentStatuses={(runs[job.id] ?? [])
                        .sort((a, b) => b.runAtMs - a.runAtMs)
                        .slice(0, 5)
                        .map((r) => r.status)
                        .reverse()}
                      avgTokens={avgByJob[job.id]}
                      onClick={() => navigate(`/cron/${job.id}`)}
                    />
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
