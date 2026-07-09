interface Props {
  count: number
  size?: 'sm' | 'md'
}

export default function StreakBadge({ count, size = 'md' }: Props) {
  if (count === 0) return null
  const sm = size === 'sm'

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: sm ? 3 : 5,
      background: 'rgba(255, 171, 0, 0.12)',
      border: '1px solid rgba(255, 171, 0, 0.25)',
      borderRadius: 100,
      padding: sm ? '3px 8px' : '5px 12px',
      color: 'var(--accent-high)',
      fontWeight: 700,
      fontSize: sm ? '0.7rem' : '0.85rem',
    }}>
      <span style={{ fontSize: sm ? '0.85rem' : '1.1rem' }}>🔥</span>
      <span>{count} day streak</span>
    </div>
  )
}
