import { useMemo } from 'react'
import BellCurve from '../components/ui/BellCurve'
import { buildBellCurveData, generateSimulatedPeerGuesses } from '../lib/scoring'
import type { Screen } from '../App'

interface Props {
  navigate: (s: Screen) => void
}

const ROUNDS = [
  { label: 'Round 1', detail: '32 players → 16 advance (closest 50%)', emoji: '⚡' },
  { label: 'Round 2', detail: '16 players → 8 advance (closest 50%)', emoji: '🔥' },
  { label: 'Round 3', detail: '8 players → 4 advance (closest 50%)', emoji: '💥' },
  { label: 'Final', detail: '4 players — closest guess wins', emoji: '🏆' },
]

export default function TournamentScreen({ navigate }: Props) {
  const exampleBellData = useMemo(() => {
    const answer = 6514
    const peers = generateSimulatedPeerGuesses(answer, 'tournament-demo')
    return buildBellCurveData(5200, answer, peers)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 20px 32px', minHeight: '100%', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('home')}>← Back</button>
        <h2 style={{ fontSize: '1.1rem' }}>⚡ Tournaments</h2>
        <div style={{ width: 60 }} />
      </div>

      {/* Coming soon banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(33,158,36,0.08), rgba(76,201,240,0.08))',
        border: '1px solid rgba(33,158,36,0.2)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 24px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏟️</div>
        <h2 style={{ marginBottom: 8 }}>Live Elimination Tournaments</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Coming soon. Real-time elimination rounds where the closest guess advances.
          Watch the full curve of guesses live and spot outliers as they happen.
        </p>
      </div>

      {/* Round format */}
      <div className="card">
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 14, letterSpacing: '0.06em' }}>
          TOURNAMENT FORMAT
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {ROUNDS.map((r, i) => (
            <div key={r.label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 0',
              borderBottom: i < ROUNDS.length - 1 ? '1px solid rgba(35,38,41,0.08)' : 'none',
            }}>
              <span style={{ fontSize: '1.4rem' }}>{r.emoji}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{r.label}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{r.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Spectator note */}
      <div className="card" style={{ background: 'rgba(64,196,255,0.06)', borderColor: 'rgba(64,196,255,0.15)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.3rem', marginTop: 2 }}>👁️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--accent-low)', marginBottom: 4 }}>Spectator Mode</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Spectators will be able to watch live, see the full curve of guesses, and spot outliers in real time.
            </p>
          </div>
        </div>
      </div>

      {/* Example curve */}
      <div className="card">
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, letterSpacing: '0.06em' }}>
          EXAMPLE LIVE CURVE
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 14 }}>
          "How many windows are on the Empire State Building?" · Answer: 6,514
        </div>
        <BellCurve data={exampleBellData} simulated />
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>
          This is example output — real tournaments show live player guesses as they come in
        </p>
      </div>

      <button className="btn btn-secondary" onClick={() => navigate('game')}>
        Practice Now While You Wait →
      </button>
    </div>
  )
}
