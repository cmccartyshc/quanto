interface Props {
  score: number
  total?: number
  size?: 'sm' | 'md' | 'lg'
}

export default function ScoreBadge({ score, total, size = 'md' }: Props) {
  const sm = size === 'sm'
  const lg = size === 'lg'
  const fontSize = lg ? '2rem' : sm ? '0.8rem' : '1rem'
  const padding = lg ? '8px 20px' : sm ? '3px 8px' : '5px 14px'

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      background: 'rgba(33,158,36,0.12)',
      border: '1px solid rgba(33,158,36,0.25)',
      borderRadius: 100,
      padding,
      color: 'var(--primary)',
      fontWeight: 800,
      fontSize,
      fontVariantNumeric: 'tabular-nums',
    }}>
      ⭐ {score.toLocaleString()}{total != null ? ` / ${total.toLocaleString()}` : ''}
    </div>
  )
}
