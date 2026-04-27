import { useState, useRef } from "react"

interface ChatInputProps {
  onSend: (text: string) => void
  disabled: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder }: ChatInputProps) {
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
      <span className="text-primary text-sm font-mono">❯</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          // isComposing skips the Enter that confirms an IME candidate (CJK input).
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault()
            handleSubmit()
          }
        }}
        disabled={disabled}
        placeholder={
          placeholder ?? (disabled ? "Disconnected..." : "Type a message... (Enter to send)")
        }
        className="flex-1 bg-transparent text-[0.8125rem] font-mono text-foreground outline-none placeholder:text-muted-foreground/50"
      />
    </div>
  )
}
