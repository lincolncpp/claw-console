import { Fragment } from "react"
import { useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sparkles, ExternalLink } from "lucide-react"
import { Breadcrumb } from "@/components/shared/Breadcrumb"
import { PageContent } from "@/components/shared/PageContent"
import { PageLoading } from "@/components/shared/LoadingSpinner"
import { EmptyState } from "@/components/shared/EmptyState"
import { useSkills } from "@/hooks/use-agents"
import type { SkillInstallOption, SkillRequirements } from "@/types/agent"

function hasRequirements(reqs?: SkillRequirements): boolean {
  if (!reqs) return false
  return (
    reqs.bins.length > 0 ||
    reqs.anyBins.length > 0 ||
    reqs.env.length > 0 ||
    reqs.config.length > 0 ||
    reqs.os.length > 0
  )
}

function RequirementRow({
  label,
  items,
  missing,
}: {
  label: string
  items: string[]
  missing: string[]
}) {
  if (items.length === 0) return null
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex gap-1 flex-wrap">
        {items.map((item) => (
          <Badge
            key={item}
            variant={missing.includes(item) ? "destructive" : "outline"}
            className="text-[0.625rem] px-1.5 py-0"
          >
            {item}
            {missing.includes(item) ? " (missing)" : ""}
          </Badge>
        ))}
      </dd>
    </>
  )
}

export function SkillDetailPage() {
  const { skillName } = useParams<{ skillName: string }>()
  const { skills, isLoading } = useSkills()
  const skill = skills.find((s) => (s.skillKey ?? s.name) === skillName)

  if (isLoading) return <PageLoading />

  if (!skill) {
    return (
      <PageContent>
        <Breadcrumb
          items={[{ label: "Skills", to: "/skills" }, { label: skillName ?? "Unknown" }]}
        />
        <EmptyState icon={Sparkles} title={`Skill "${skillName}" not found`} />
      </PageContent>
    )
  }

  const showRequirements = hasRequirements(skill.requirements) || hasRequirements(skill.missing)
  const showInstall = (skill.install?.length ?? 0) > 0

  return (
    <PageContent>
      <Breadcrumb items={[{ label: "Skills", to: "/skills" }, { label: skill.name }]} />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>
              {skill.emoji && <span className="mr-2">{skill.emoji}</span>}
              {skill.name}
            </CardTitle>
            {skill.description && (
              <p className="text-sm text-muted-foreground mt-1">{skill.description}</p>
            )}
          </div>
          {skill.homepage && (
            <Button
              size="sm"
              variant="outline"
              render={<a href={skill.homepage} target="_blank" rel="noopener noreferrer" />}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Homepage
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Source</dt>
            <dd>
              {skill.source ? (
                <Badge variant="outline" className="text-[0.625rem] px-1.5 py-0">
                  {skill.source}
                </Badge>
              ) : (
                "--"
              )}
            </dd>

            <dt className="text-muted-foreground">Skill Key</dt>
            <dd className="font-mono">{skill.skillKey ?? skill.name}</dd>

            <dt className="text-muted-foreground">Status</dt>
            <dd>
              {skill.disabled ? (
                <Badge variant="secondary" className="text-[0.625rem] px-1.5 py-0">
                  disabled
                </Badge>
              ) : skill.eligible ? (
                <Badge
                  variant="default"
                  className="text-[0.625rem] px-1.5 py-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                >
                  ready
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[0.625rem] px-1.5 py-0 text-muted-foreground"
                >
                  needs setup
                </Badge>
              )}
            </dd>

            <dt className="text-muted-foreground">Bundled</dt>
            <dd>
              {skill.bundled ? (
                <Badge variant="secondary" className="text-[0.625rem] px-1.5 py-0">
                  yes
                </Badge>
              ) : (
                "no"
              )}
            </dd>

            <dt className="text-muted-foreground">Always Active</dt>
            <dd>{skill.always ? "yes" : "no"}</dd>

            {skill.filePath && (
              <>
                <dt className="text-muted-foreground">File Path</dt>
                <dd className="font-mono break-all text-xs">{skill.filePath}</dd>
              </>
            )}

            {skill.baseDir && (
              <>
                <dt className="text-muted-foreground">Base Directory</dt>
                <dd className="font-mono break-all text-xs">{skill.baseDir}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>

      {showRequirements && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium">Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <RequirementRow
                label="Binaries"
                items={skill.requirements?.bins ?? []}
                missing={skill.missing?.bins ?? []}
              />
              <RequirementRow
                label="Any Binary"
                items={skill.requirements?.anyBins ?? []}
                missing={skill.missing?.anyBins ?? []}
              />
              <RequirementRow
                label="Environment"
                items={skill.requirements?.env ?? []}
                missing={skill.missing?.env ?? []}
              />
              <RequirementRow
                label="Config"
                items={skill.requirements?.config ?? []}
                missing={skill.missing?.config ?? []}
              />
              <RequirementRow
                label="OS"
                items={skill.requirements?.os ?? []}
                missing={skill.missing?.os ?? []}
              />
            </dl>
          </CardContent>
        </Card>
      )}

      {showInstall && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm font-medium">Install Options</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              {skill.install!.map((opt: SkillInstallOption) => (
                <Fragment key={opt.id}>
                  <dt className="text-muted-foreground">
                    <Badge variant="outline" className="text-[0.625rem] px-1.5 py-0">
                      {opt.kind}
                    </Badge>
                  </dt>
                  <dd>{opt.label}</dd>
                </Fragment>
              ))}
            </dl>
          </CardContent>
        </Card>
      )}
    </PageContent>
  )
}
