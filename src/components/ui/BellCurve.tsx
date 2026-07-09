import { useMemo } from 'react'
import type { BellCurveData } from '../../lib/scoring'
import { formatNumber } from '../../lib/scoring'

interface Props {
  data: BellCurveData
  simulated?: boolean
  compact?: boolean
}

export default function BellCurve({ data, simulated = true, compact = false }: Props) {
  const height = compact ? 80 : 120
  const width = 340

  const maxCount = useMemo(() => Math.max(...data.bins.map((b) => b.count), 1), [data.bins])

  const playerBinIdx = useMemo(() => {
    const sorted = [...data.bins].map((b, i) => ({ ...b, i }))
    // Find bin closest to player guess
    let closest = 0
    let minDist = Infinity
    for (const b of sorted) {
      const dist = Math.abs(b.x - data.playerGuess)
      if (dist < minDist) { minDist = dist; closest = b.i }
    }
    return closest
  }, [data])

  const answerBinIdx = useMemo(() => {
    let closest = 0
    let minDist = Infinity
    data.bins.forEach((b, i) => {
      const dist = Math.abs(b.x - data.answer)
      if (dist < minDist) { minDist = dist; closest = i }
    })
    return closest
  }, [data])

  const binWidth = width / data.bins.length

  return (
    <div style={{ width: '100%' }}>
      {simulated && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Simulated — real curve unlocks with more players
          </span>
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, marginBottom: 6, fontSize: '0.72rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--primary)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
          Your guess
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--accent-high)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-high)', display: 'inline-block' }} />
          Answer
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(35,38,41,0.2)', display: 'inline-block' }} />
          Peers
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height + 24}`}
        style={{ width: '100%', overflow: 'visible' }}
        aria-label="Bell curve of guesses"
      >
        {data.bins.map((bin, i) => {
          const barH = (bin.count / maxCount) * height
          const x = i * binWidth + 1
          const y = height - barH
          const isPlayer = i === playerBinIdx
          const isAnswer = i === answerBinIdx

          let fill = 'rgba(35,38,41,0.15)'
          if (isAnswer) fill = 'rgba(255,171,0,0.6)'
          if (isPlayer) fill = 'var(--primary)'

          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={Math.max(binWidth - 2, 1)}
              height={Math.max(barH, 1)}
              fill={fill}
              rx={2}
            />
          )
        })}
        {/* X-axis */}
        <line x1={0} y1={height} x2={width} y2={height} stroke="rgba(35,38,41,0.12)" strokeWidth={1} />
        {/* Labels */}
        {[0, Math.floor(data.bins.length / 2), data.bins.length - 1].map((i) => (
          <text
            key={i}
            x={i * binWidth + binWidth / 2}
            y={height + 16}
            textAnchor="middle"
            fill="var(--text-muted)"
            fontSize={9}
          >
            {formatNumber(data.bins[i]?.x ?? 0)}
          </text>
        ))}
      </svg>
      {!compact && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 8,
          fontSize: '0.8rem',
          color: 'var(--text-secondary)',
        }}>
          <span>Your guess: <strong style={{ color: 'var(--primary)' }}>{formatNumber(data.playerGuess)}</strong></span>
          <span>You beat <strong style={{ color: 'var(--text-primary)' }}>{data.playerPercentile}%</strong> of players</span>
        </div>
      )}
    </div>
  )
}
