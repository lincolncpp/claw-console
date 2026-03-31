import { useNavStore } from "@/stores/nav-store"
import { Link, useLocation, useNavigate } from "react-router-dom"
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

const navItems: { path: string; label: string; icon: typeof LayoutDashboard }[] = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/sessions", label: "Sessions", icon: MessageSquare },
  { path: "/agents", label: "Agents", icon: Bot },
  { path: "/nodes", label: "Nodes", icon: Server },
  { path: "/cron", label: "Cron Jobs", icon: Timer },
  { path: "/logs", label: "Logs", icon: ScrollText },
  { path: "/approvals", label: "Approvals", icon: ShieldCheck },
]

export function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const collapsed = useNavStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useNavStore((s) => s.toggleSidebar)

  return (
    <TooltipProvider delay={0}>
      <aside
        className="flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out"
        style={{ width: collapsed ? "3rem" : "13.75rem" }}
      >
        {/* Logo / Title */}
        <div className="flex h-14 items-center border-b border-sidebar-border px-3">
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight truncate">OpenClaw</span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-2 space-y-0.5 px-2">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active =
              path === "/" ? location.pathname === "/" : location.pathname.startsWith(path)

            if (collapsed) {
              return (
                <Tooltip key={path}>
                  <TooltipTrigger
                    onClick={() => navigate(path)}
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

            return (
              <Link
                key={path}
                to={path}
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
                <span className="truncate">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="flex h-12 items-center border-t border-sidebar-border px-2">
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
