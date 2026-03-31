import { Badge } from "@/components/ui/badge"
import { formatTokensCompact } from "@/lib/format"
import { classifyTokenConsumption, tokenLevelBadgeProps } from "@/lib/status"

interface TokenBadgeProps {
  tokens: number | undefined
}

export function TokenBadge({ tokens }: TokenBadgeProps) {
  if (tokens == null) {
    return <span className="text-sm text-muted-foreground">--</span>
  }

  const level = classifyTokenConsumption(tokens)
  const props = tokenLevelBadgeProps[level]

  return (
    <span className="flex items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">{formatTokensCompact(tokens)}</span>
      <Badge variant={props.variant} className={props.className}>
        {props.label}
      </Badge>
    </span>
  )
}
