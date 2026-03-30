import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCronStore } from "@/stores/cron-store"
import { CronJobRow } from "./CronJobRow"
import { Timer } from "lucide-react"

export function CronJobList() {
  const jobs = useCronStore((s) => s.jobs)
  const selectJob = useCronStore((s) => s.selectJob)

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
              {jobs.map((job) => (
                <CronJobRow key={job.jobId} job={job} onClick={() => selectJob(job.jobId)} />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
