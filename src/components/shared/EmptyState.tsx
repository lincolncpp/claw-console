import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  scope?: string
}

export function EmptyState({ icon: Icon, title, description, scope }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Icon className="h-8 w-8 mb-3 opacity-50" />
      {scope ? (
        <>
          <p className="text-sm">
            Requires <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{scope}</code> scope
          </p>
          <p className="text-xs mt-1 opacity-70">
            Update your gateway token configuration to enable this section.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm">{title}</p>
          {description && <p className="text-xs mt-1 opacity-70">{description}</p>}
        </>
      )}
    </div>
  )
}
