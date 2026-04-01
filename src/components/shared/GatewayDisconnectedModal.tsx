import { useGatewayStore } from "@/stores/gateway-store"

function SpinningLobster({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Body */}
      <ellipse cx="50" cy="52" rx="12" ry="18" fill="currentColor" opacity="0.9" />
      {/* Tail segments */}
      <ellipse cx="50" cy="72" rx="10" ry="5" fill="currentColor" opacity="0.8" />
      <ellipse cx="50" cy="79" rx="8" ry="4" fill="currentColor" opacity="0.7" />
      <ellipse cx="50" cy="85" rx="6" ry="3" fill="currentColor" opacity="0.6" />
      {/* Tail fan */}
      <path d="M44 88 Q50 96 56 88" stroke="currentColor" strokeWidth="2.5" fill="none" />
      <path
        d="M41 87 Q50 98 59 87"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        opacity="0.5"
      />
      {/* Head */}
      <ellipse cx="50" cy="36" rx="10" ry="8" fill="currentColor" opacity="0.85" />
      {/* Eyes */}
      <circle cx="44" cy="30" r="3" fill="currentColor" />
      <circle cx="56" cy="30" r="3" fill="currentColor" />
      <circle cx="44" cy="29.5" r="1.2" fill="var(--popover, #1a1a2e)" />
      <circle cx="56" cy="29.5" r="1.2" fill="var(--popover, #1a1a2e)" />
      {/* Eye stalks */}
      <line x1="44" y1="33" x2="44" y2="28" stroke="currentColor" strokeWidth="2" />
      <line x1="56" y1="33" x2="56" y2="28" stroke="currentColor" strokeWidth="2" />
      {/* Antennae */}
      <path
        d="M46 32 Q38 18 28 12"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M54 32 Q62 18 72 12"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M45 33 Q34 22 22 20"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M55 33 Q66 22 78 20"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      {/* Left claw arm */}
      <path
        d="M38 44 Q28 40 22 36"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {/* Left claw */}
      <path
        d="M22 36 Q16 30 14 26"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M22 36 Q18 32 20 26"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {/* Right claw arm */}
      <path
        d="M62 44 Q72 40 78 36"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {/* Right claw */}
      <path
        d="M78 36 Q84 30 86 26"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M78 36 Q82 32 80 26"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {/* Legs */}
      <line
        x1="40"
        y1="50"
        x2="28"
        y2="54"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="39"
        y1="56"
        x2="27"
        y2="62"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="40"
        y1="62"
        x2="28"
        y2="70"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="60"
        y1="50"
        x2="72"
        y2="54"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="61"
        y1="56"
        x2="73"
        y2="62"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="60"
        y1="62"
        x2="72"
        y2="70"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function GatewayDisconnectedModal() {
  const connectionStatus = useGatewayStore((s) => s.connectionStatus)
  const errorMessage = useGatewayStore((s) => s.errorMessage)

  if (connectionStatus === "connected") return null

  const isError = connectionStatus === "error"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-md bg-black/40">
      <div className="flex flex-col items-center gap-5 rounded-xl bg-popover p-8 ring-1 ring-foreground/10 shadow-xl max-w-sm text-center">
        <SpinningLobster className="h-20 w-20 text-destructive animate-spin [animation-duration:3s]" />
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-base font-medium text-foreground">
            {isError ? "Connection Lost" : "Connecting to Gateway..."}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isError
              ? (errorMessage ?? "Unable to reach the gateway. Attempting to reconnect...")
              : "Establishing connection to the gateway..."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
          </span>
          Reconnecting...
        </div>
      </div>
    </div>
  )
}
