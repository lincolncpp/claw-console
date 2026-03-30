import { useNavStore, type Page } from "@/stores/nav-store"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  LayoutDashboard,
  MessageSquare,
  Server,
  ScrollText,
  ShieldCheck,
  Bot,
  Timer,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"

const navItems: { page: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { page: "overview", label: "Overview", icon: LayoutDashboard },
  { page: "sessions", label: "Sessions", icon: MessageSquare },
  { page: "agents", label: "Agents", icon: Bot },
  { page: "nodes", label: "Nodes", icon: Server },
  { page: "cron", label: "Cron Jobs", icon: Timer },
  { page: "logs", label: "Logs", icon: ScrollText },
  { page: "approvals", label: "Approvals", icon: ShieldCheck },
]

export function Sidebar() {
  const activePage = useNavStore((s) => s.activePage)
  const collapsed = useNavStore((s) => s.sidebarCollapsed)
  const setPage = useNavStore((s) => s.setPage)
  const toggleSidebar = useNavStore((s) => s.toggleSidebar)

  return (
    <TooltipProvider delay={0}>
      <aside
        className="flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out"
        style={{ width: collapsed ? 48 : 220 }}
      >
        {/* Logo / Title */}
        <div className="flex h-14 items-center border-b border-sidebar-border px-3">
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight truncate">OpenClaw</span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-2 space-y-0.5 px-2">
          {navItems.map(({ page, label, icon: Icon }) => {
            const active = activePage === page
            const button = (
              <button
                key={page}
                onClick={() => setPage(page)}
                className={`
                  group relative flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors
                  ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  }
                `}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-sidebar-primary" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </button>
            )

            if (collapsed) {
              return (
                <Tooltip key={page}>
                  <TooltipTrigger
                    onClick={() => setPage(page)}
                    className={`
                      group relative flex w-full items-center justify-center rounded-md p-2 text-sm transition-colors
                      ${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      }
                    `}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[3px] rounded-full bg-sidebar-primary" />
                    )}
                    <Icon className="h-4 w-4 shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              )
            }
            return button
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-sidebar-border p-2">
          <div
            role="button"
            tabIndex={0}
            onClick={toggleSidebar}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") toggleSidebar()
            }}
            className="flex w-full items-center justify-center rounded-md p-2 text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors cursor-pointer"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
