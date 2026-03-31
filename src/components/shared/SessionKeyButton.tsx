import { useTerminalStore } from "@/stores/terminal-store"

interface SessionKeyButtonProps {
  agentId: string
  sessionKey: string
}

export function SessionKeyButton({ agentId, sessionKey }: SessionKeyButtonProps) {
  return (
    <button
      className="font-mono text-xs text-muted-foreground truncate block max-w-[400px] hover:text-foreground hover:underline cursor-pointer text-left"
      onClick={() => {
        const store = useTerminalStore.getState()
        store.setSession(agentId, sessionKey)
        store.open()
      }}
    >
      {sessionKey}
    </button>
  )
}
