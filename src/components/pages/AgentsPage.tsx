import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAgents, useModels, useTools, useSkills } from "@/hooks/use-agents"
import { useSystemStore } from "@/stores/system-store"
import { LoadingBlock } from "@/components/shared/LoadingSpinner"
import { ScopeMessage } from "@/components/shared/ScopeMessage"
import { Link } from "react-router-dom"
import { Bot, Cpu, Wrench, Sparkles } from "lucide-react"

function AgentCards() {
  const snapshotAgents = useSystemStore((s) => s.agents)
  const { agents: rpcAgents, defaultId } = useAgents()

  const agents =
    rpcAgents.length > 0
      ? rpcAgents
      : snapshotAgents.map((a) => ({
          id: a.agentId,
          name: a.name,
          isDefault: a.isDefault,
        }))

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {agents.map((agent) => {
        const snapshot = snapshotAgents.find((a) => a.agentId === agent.id)
        return (
          <Link to={`/agents/${agent.id}`} key={agent.id} className="block group">
            <Card className="transition-colors group-hover:border-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Bot className="h-4 w-4 text-muted-foreground" />
                  <span>{agent.name ?? agent.id}</span>
                  {(agent.isDefault || agent.id === defaultId) && (
                    <Badge variant="default" className="text-[0.625rem] px-1.5 py-0">
                      default
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-mono">{agent.id}</p>
                  {snapshot && <p>{snapshot.sessions.count.toLocaleString()} sessions</p>}
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

function ModelsList() {
  const { models, isLoading, scopeError } = useModels()

  if (scopeError) return <ScopeMessage scope="operator.read" icon={Cpu} />
  if (isLoading) return <LoadingBlock />

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Model</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Context</TableHead>
          <TableHead>Capabilities</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {models.map((m) => (
          <TableRow key={m.id}>
            <TableCell className="font-medium">{m.name}</TableCell>
            <TableCell>
              <Badge variant="outline" className="text-[0.625rem]">
                {m.provider}
              </Badge>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}k` : "--"}
            </TableCell>
            <TableCell>
              <div className="flex gap-1">
                {m.reasoning && (
                  <Badge variant="secondary" className="text-[0.625rem] px-1.5 py-0">
                    reasoning
                  </Badge>
                )}
                {m.input?.map((i) => (
                  <Badge key={i} variant="secondary" className="text-[0.625rem] px-1.5 py-0">
                    {i}
                  </Badge>
                ))}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function ToolsList() {
  const { tools, isLoading, scopeError } = useTools()

  if (scopeError) return <ScopeMessage scope="operator.read" icon={Wrench} />
  if (isLoading) return <LoadingBlock />

  return (
    <div className="space-y-2">
      {tools.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No tools registered</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tool</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tools.slice(0, 50).map((t: Record<string, unknown>, i: number) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-xs font-medium">
                  {String(t.name ?? t.id ?? "unknown")}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground truncate max-w-[400px]">
                  {String(t.description ?? "")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

function SkillsList() {
  const { skills, isLoading, scopeError } = useSkills()

  if (scopeError) return <ScopeMessage scope="operator.read" icon={Sparkles} />
  if (isLoading) return <LoadingBlock />

  return (
    <div className="space-y-2">
      {skills.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No skills installed</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Skill</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {skills.map((s, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium text-sm">{s.name ?? s.id ?? "unknown"}</TableCell>
                <TableCell>
                  <Badge
                    variant={s.status === "active" ? "default" : "secondary"}
                    className="text-[0.625rem]"
                  >
                    {s.status ?? "unknown"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.version ?? "--"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export function AgentsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold tracking-tight">Agents & Tools</h2>

      <Tabs defaultValue="agents">
        <TabsList variant="line">
          <TabsTrigger value="agents">
            <Bot className="h-3.5 w-3.5 mr-1.5" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="models">
            <Cpu className="h-3.5 w-3.5 mr-1.5" />
            Models
          </TabsTrigger>
          <TabsTrigger value="tools">
            <Wrench className="h-3.5 w-3.5 mr-1.5" />
            Tools
          </TabsTrigger>
          <TabsTrigger value="skills">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Skills
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agents">
          <AgentCards />
        </TabsContent>
        <TabsContent value="models">
          <ModelsList />
        </TabsContent>
        <TabsContent value="tools">
          <ToolsList />
        </TabsContent>
        <TabsContent value="skills">
          <SkillsList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
