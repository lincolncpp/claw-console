import { cn } from "@/lib/utils"

export function TableFooter({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex items-center border-t bg-muted/50 rounded-b-xl p-4 -mx-4 -mb-4 mt-3",
        className,
      )}
    >
      {children}
    </div>
  )
}
