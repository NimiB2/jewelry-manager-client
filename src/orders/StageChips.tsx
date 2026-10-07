type StageChipsProps = {
  stages: string[]
  current: string | null
  disabled?: boolean
  onPick: (stage: string) => void
}

// Every preparation stage as a chip, the current one highlighted: one tap jumps to any stage.
export function StageChips({ stages, current, disabled, onPick }: StageChipsProps) {
  // A stage that was renamed or removed in settings still shows, so she can see where the order is.
  const all = current && !stages.includes(current) ? [current, ...stages] : stages

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="group" aria-label="שלב הכנה">
      {all.map((stage) => {
        const active = stage === current
        return (
          <button
            key={stage}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => !active && onPick(stage)}
            style={{
              minHeight: 32,
              padding: '0 12px',
              borderRadius: 16,
              fontSize: 13,
              cursor: active ? 'default' : 'pointer',
              fontWeight: active ? 700 : 400,
              border: `1px solid ${active ? 'var(--warning)' : 'var(--border)'}`,
              background: active ? 'var(--warning-bg)' : 'var(--surface)',
              color: active ? 'var(--warning)' : 'var(--text)',
            }}
          >
            {stage}
          </button>
        )
      })}
    </div>
  )
}
