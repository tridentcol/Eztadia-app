/**
 * Chip de selección del onboarding. Radio o toggle según el caller. Focus ring
 * lavanda accent-ai/40 (mandato), radius 4 (chips). Sin color de relleno: el
 * seleccionado se distingue por borde + surface-elevated.
 */
export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={[
        'rounded-[4px] border px-3 py-2 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-ai)]/40',
        selected
          ? 'border-border-emphasis bg-surface-elevated text-text'
          : 'border-border-default text-text-secondary hover:border-border-emphasis hover:bg-surface-hover/40 hover:text-text',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
