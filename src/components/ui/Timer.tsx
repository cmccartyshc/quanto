import { useEffect, useState, useCallback } from 'react'

interface Props {
  durationSeconds: number
  onExpire: () => void
  paused?: boolean
}

export default function Timer({ durationSeconds, onExpire, paused = false }: Props) {
  const [remaining, setRemaining] = useState(durationSeconds)

  const expire = useCallback(() => onExpire(), [onExpire])

  useEffect(() => {
    setRemaining(durationSeconds)
  }, [durationSeconds])

  useEffect(() => {
    if (paused) return
    if (remaining <= 0) {
      expire()
      return
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [remaining, paused, expire])

  const pct = remaining / durationSeconds
  const isUrgent = remaining <= 10
  const color = isUrgent ? 'var(--danger)' : remaining <= 20 ? 'var(--accent-high)' : 'var(--primary)'

  const circumference = 2 * Math.PI * 20
  const dashOffset = circumference * (1 - pct)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={52} height={52} viewBox="0 0 52 52">
        <circle cx={26} cy={26} r={20} fill="none" stroke="rgba(35,38,41,0.12)" strokeWidth={3} />
        <circle
          cx={26} cy={26} r={20}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
          style={{ transition: 'stroke-dashoffset 0.9s linear, stroke 0.3s ease' }}
        />
        <text
          x={26} y={26}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontSize={isUrgent ? 14 : 12}
          fontWeight={700}
          fontFamily="var(--font)"
          style={{ animation: isUrgent ? 'countdown-pulse 1s ease infinite' : 'none' }}
        >
          {remaining}
        </text>
      </svg>
      <style>{`
        @keyframes countdown-pulse {
          0%,100%{opacity:1} 50%{opacity:0.5}
        }
      `}</style>
    </div>
  )
}
