import type { ReactNode } from "react"

interface PageContentProps {
  children: ReactNode
  className?: string
}

export function PageContent({ children, className }: PageContentProps) {
  return <div className={`flex flex-col gap-4${className ? ` ${className}` : ""}`}>{children}</div>
}
