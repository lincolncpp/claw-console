import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useSkills } from "@/hooks/use-agents"
import { PageLoading } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { PageContent } from "@/components/shared/PageContent"
import { PageHeader } from "@/components/shared/PageHeader"

function statusBadge(skill: { eligible?: boolean; disabled?: boolean }) {
  if (skill.disabled)
    return <Badge variant="secondary" className="text-[0.625rem] px-1.5 py-0">disabled</Badge>
  if (skill.eligible)
    return <Badge variant="default" className="text-[0.625rem] px-1.5 py-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">ready</Badge>
  return <Badge variant="outline" className="text-[0.625rem] px-1.5 py-0 text-muted-foreground">needs setup</Badge>
}

export function SkillsPage() {
  const navigate = useNavigate()
  const { skills: rawSkills, isLoading, scopeError } = useSkills()
  const skills = [...rawSkills].sort((a, b) => {
    if (a.eligible === b.eligible) return 0
    return a.eligible ? -1 : 1
  })

  if (scopeError) return <EmptyState scope="operator.read" icon={Sparkles} title="" />
  if (isLoading) return <PageLoading />

  return (
    <PageContent>
      <PageHeader
        breadcrumbs={[{ label: "Skills" }]}
        subtitle={skills.length > 0 ? `${skills.length} loaded` : undefined}
      />

      <Card>
        <CardContent>
          {skills.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No skills found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skills.map((skill) => (
                  <TableRow
                    key={skill.skillKey ?? skill.name}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/skills/${skill.skillKey ?? skill.name}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {skill.emoji && <span className="text-sm">{skill.emoji}</span>}
                        <span className="font-medium text-sm">{skill.name}</span>
                        {skill.always && (
                          <Badge variant="secondary" className="text-[0.625rem] px-1.5 py-0">always</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[400px] truncate">
                      {skill.description ?? "--"}
                    </TableCell>
                    <TableCell>
                      {skill.source ? (
                        <Badge variant="outline" className="text-[0.625rem] px-1.5 py-0">
                          {skill.source}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">--</span>
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(skill)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageContent>
  )
}
