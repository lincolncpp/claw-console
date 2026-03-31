import { Badge } from "@/components/ui/badge"
import { statusVariants } from "@/lib/status"

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const variant = statusVariants[status] ?? "outline"
  const isSuccess = status === "ok" || status === "success"

  return (
    <Badge
      variant={variant}
      className={
        isSuccess
          ? `bg-status-success-muted text-status-success border-transparent ${className ?? ""}`
          : className
      }
    >
      {status}
    </Badge>
  )
}
