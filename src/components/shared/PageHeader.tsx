import type { ReactNode } from "react"
import { Breadcrumb, type BreadcrumbItem } from "./Breadcrumb"

interface PageHeaderProps {
  subtitle?: ReactNode
  actions?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
}

export function PageHeader({ subtitle, actions, breadcrumbs }: PageHeaderProps) {
  const hasSecondRow = subtitle || actions
  if (!hasSecondRow) {
    return breadcrumbs ? <Breadcrumb items={breadcrumbs} /> : null
  }
  return (
    <div className="flex flex-col gap-2">
      {breadcrumbs && <Breadcrumb items={breadcrumbs} />}
      <div className="flex items-center justify-between">
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
