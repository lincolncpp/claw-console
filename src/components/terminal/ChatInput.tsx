import { useState, useRef } from "react"

interface ChatInputProps {
  onSend: (text: string) => void
  disabled: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue("")
  }

  return (
    <div className="flex items-center gap-2 border-t border-border px-3 h-9 shrink-0 bg-transparent">
      <span className="text-violet-400 text-sm font-mono">❯</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            handleSubmit()
          }
        }}
        disabled={disabled}
        placeholder={disabled ? "Disconnected..." : "Type a message... (Enter to send)"}
        className="flex-1 bg-transparent text-[13px] font-mono text-foreground outline-none placeholder:text-muted-foreground/50"
      />
    </div>
  )
}
