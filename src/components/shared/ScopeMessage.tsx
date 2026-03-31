import type { LucideIcon } from "lucide-react"

interface ScopeMessageProps {
  scope: string
  icon: LucideIcon
}

export function ScopeMessage({ scope, icon: Icon }: ScopeMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Icon className="h-8 w-8 mb-3 opacity-50" />
      <p className="text-sm">
        Requires <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{scope}</code> scope
      </p>
      <p className="text-xs mt-1 opacity-70">
        Update your gateway token configuration to enable this section.
      </p>
    </div>
  )
}
