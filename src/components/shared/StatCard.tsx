import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatCardProps {
  icon: LucideIcon
  label: string
  children: ReactNode
}

export function StatCard({ icon: Icon, label, children }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
