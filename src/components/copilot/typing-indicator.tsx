/** Tres dots Noir con opacity 0.3→1→0.3 escalonada. Sin shimmer. */
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Escribiendo" role="status">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="copilot-typing-dot bg-text-tertiary size-1.5 rounded-full"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  )
}
