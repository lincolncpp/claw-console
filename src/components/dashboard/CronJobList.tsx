import { useMemo } from "react"
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCronStore } from "@/stores/cron-store"
import { CronJobRow } from "./CronJobRow"
import { Timer } from "lucide-react"
import { useNavigate } from "react-router-dom"

export function CronJobList() {
  const jobs = useCronStore((s) => s.jobs)
  const navigate = useNavigate()

  const grouped = useMemo(() => {
    const map = new Map<string, typeof jobs>()
    for (const job of jobs) {
      const agent = job.agentId ?? "unknown"
      const list = map.get(agent)
      if (list) list.push(job)
      else map.set(agent, [job])
    }
    return [...map.entries()]
  }, [jobs])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Cron Jobs</CardTitle>
        </div>
        <span className="text-xs text-muted-foreground">
          {jobs.length} job{jobs.length !== 1 ? "s" : ""}
        </span>
      </CardHeader>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map(([agentId, agentJobs]) => (
                <>
                  <TableRow key={`agent-${agentId}`} className="bg-muted/30 hover:bg-muted/30">
                    <TableCell
                      colSpan={6}
                      className="py-1.5 text-xs font-semibold text-muted-foreground"
                    >
                      {agentId}
                    </TableCell>
                  </TableRow>
                  {agentJobs.map((job) => (
                    <CronJobRow
                      key={job.id}
                      job={job}
                      onClick={() => navigate(`/cron/${job.id}`)}
                    />
                  ))}
                </>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
