import { useState, useRef, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Breadcrumb } from "@/components/shared/Breadcrumb"
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog"
import { useCronStore } from "@/stores/cron-store"
import { useCronRuns } from "@/hooks/use-cron-runs"
import { useCronRunNow, useCronToggle, useCronUpdateInstructions } from "@/hooks/use-cron-actions"
import { useCronDelete } from "@/hooks/use-cron-mutations"
import { formatSchedule } from "@/lib/format"
import { CronRunHistory } from "./CronRunHistory"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Play, Pencil, Check, X, Trash2 } from "lucide-react"

export function CronJobDetail() {
  const { jobId } = useParams<{ jobId: string }>()
  const jobs = useCronStore((s) => s.jobs)
  const { runs } = useCronRuns(jobId)
  const { runNow, running } = useCronRunNow()
  const { toggle } = useCronToggle()
  const { update: updateInstructions, saving } = useCronUpdateInstructions()
  const { remove: deleteJob } = useCronDelete()
  const navigate = useNavigate()

  const job = jobs.find((j) => j.id === jobId)

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [deleteOpen, setDeleteOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [editing])

  if (!jobId) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No job selected.</p>
  }

  if (!job) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={[{ label: "Cron Jobs", to: "/cron" }, { label: jobId }]} />
        <p className="py-8 text-center text-sm text-muted-foreground">Job not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={[{ label: "Cron Jobs", to: "/cron" }, { label: job.name || jobId }]} />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{job.name || jobId}</CardTitle>
            {job.agentId && <p className="text-sm text-muted-foreground">Agent: {job.agentId}</p>}
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                toggle(job.id, job.enabled)
              }}
            >
              <Switch checked={job.enabled} size="sm" className="pointer-events-none" />
              <span className="text-xs text-muted-foreground">
                {job.enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runNow(jobId)}
              disabled={running || !job.enabled}
            >
              <Play className="h-3 w-3 mr-1" />
              {running ? "Running..." : "Run Now"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Target: {job.sessionTarget}</span>
              <span className="font-mono">{formatSchedule(job.schedule)}</span>
            </div>
            {job.payload?.message != null && (
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-muted-foreground">Instructions</p>
                  {!editing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      onClick={() => {
                        setDraft(job.payload!.message as string)
                        setEditing(true)
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                {editing ? (
                  <div className="space-y-2">
                    <textarea
                      ref={textareaRef}
                      className="w-full rounded-md border border-border bg-background p-2 text-xs font-mono leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value)
                        e.target.style.height = "auto"
                        e.target.style.height = e.target.scrollHeight + "px"
                      }}
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs px-2"
                        disabled={saving}
                        onClick={async () => {
                          await updateInstructions(job.id, job.payload!, draft)
                          setEditing(false)
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        {saving ? "Saving..." : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs px-2"
                        disabled={saving}
                        onClick={() => setEditing(false)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-foreground leading-relaxed max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ul]:pl-4 [&_ul]:list-disc [&_ol]:my-1 [&_ol]:pl-4 [&_ol]:list-decimal [&_li]:my-0.5 [&_pre]:my-2 [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2 [&_pre]:text-xs [&_code]:text-xs [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:my-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:my-1.5 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:my-1 [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_hr]:my-2 [&_hr]:border-border [&_table]:text-xs [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {job.payload.message as string}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <CronRunHistory jobId={jobId} runs={runs} />

      <DeleteConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          await deleteJob(jobId)
          navigate("/cron")
        }}
        targetLabel={job.name || jobId}
        title="Delete Cron Job"
        description="Permanently delete this cron job? This cannot be undone."
      />
    </div>
  )
}
