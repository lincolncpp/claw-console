import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Icon className="h-8 w-8 mb-3 opacity-50" />
      <p className="text-sm">{title}</p>
      {description && <p className="text-xs mt-1 opacity-70">{description}</p>}
    </div>
  )
}
