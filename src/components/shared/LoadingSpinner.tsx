import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const sizeClasses = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-8 w-8" } as const

interface LoadingSpinnerProps {
  className?: string
  size?: keyof typeof sizeClasses
}

export function LoadingSpinner({ className, size = "md" }: LoadingSpinnerProps) {
  return (
    <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size], className)} />
  )
}

export function LoadingBlock({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <LoadingSpinner />
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <LoadingSpinner size="lg" />
    </div>
  )
}
