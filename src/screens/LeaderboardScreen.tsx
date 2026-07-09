import { useMemo } from 'react'
import { getGuesses, getProfile } from '../services/storage'
import { formatNumber } from '../lib/scoring'
import { getQuestionById } from '../data/questions'
import BellCurve from '../components/ui/BellCurve'
import { generateSimulatedPeerGuesses, buildBellCurveData } from '../lib/scoring'
import type { Screen } from '../App'

interface Props {
  navigate: (s: Screen) => void
}

// Simulated global leaderboard entries
const FAKE_PLAYERS = [
  { name: 'NoviceNora', totalScore: 4820, guesses: 61 },
  { name: 'GeoGuru', totalScore: 4200, guesses: 55 },
  { name: 'SciSam', totalScore: 3890, guesses: 50 },
  { name: 'QuickQuinn', totalScore: 3640, guesses: 48 },
  { name: 'DataDave', totalScore: 3120, guesses: 42 },
  { name: 'BizBea', totalScore: 2870, guesses: 38 },
  { name: 'FoodFrank', totalScore: 2450, guesses: 35 },
  { name: 'SportSam', totalScore: 2100, guesses: 31 },
]

export default function LeaderboardScreen({ navigate }: Props) {
  const profile = getProfile()
  const guesses = getGuesses()
  const myTotal = profile.totalScore
  const myGuessCount = guesses.length

  const leaderboard = useMemo(() => {
    const me = { name: profile.displayName + ' (you)', totalScore: myTotal, guesses: myGuessCount, isMe: true }
    const combined = [...FAKE_PLAYERS, me].sort((a, b) => b.totalScore - a.totalScore)
    return combined.map((p, i) => ({ ...p, rank: i + 1 }))
  }, [myTotal, myGuessCount, profile.displayName])

  // Most recent guess for bell curve preview
  const latestGuess = guesses[guesses.length - 1]
  const latestQuestion = latestGuess ? getQuestionById(latestGuess.questionId) : undefined
  const bellData = useMemo(() => {
    if (!latestGuess || !latestQuestion) return null
    const peers = generateSimulatedPeerGuesses(latestQuestion.answer, latestQuestion.id)
    return buildBellCurveData(latestGuess.guess, latestQuestion.answer, peers)
  }, [latestGuess, latestQuestion])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 20px 32px', minHeight: '100%', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('home')}>← Back</button>
        <h2 style={{ fontSize: '1.1rem' }}>🏆 Leaderboard</h2>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ display: 'flex', gap: 6, fontSize: '0.7rem', color: 'var(--text-muted)', justifyContent: 'center' }}>
        <span>Simulated global scores — real multiplayer coming soon</span>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {leaderboard.map((row, i) => (
          <div key={row.name} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 4px',
            borderBottom: i < leaderboard.length - 1 ? '1px solid rgba(35,38,41,0.08)' : 'none',
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1 }}>
              <span style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: row.rank <= 3 ? ['#ffd700','#c0c0c0','#cd7f32'][row.rank - 1] : 'rgba(35,38,41,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.7rem',
                fontWeight: 700,
                color: row.rank <= 3 ? '#000' : 'var(--text-muted)',
                flexShrink: 0,
              }}>
                {row.rank}
              </span>
              <div>
                <div style={{
                  fontWeight: (row as any).isMe ? 700 : 400,
                  color: (row as any).isMe ? 'var(--primary)' : 'var(--text-primary)',
                  fontSize: '0.9rem',
                }}>
                  {row.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {row.guesses} guesses
                </div>
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: (row as any).isMe ? 'var(--primary)' : 'var(--text-primary)' }}>
              {formatNumber(row.totalScore)}
            </div>
          </div>
        ))}
      </div>

      {bellData && latestQuestion && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4, letterSpacing: '0.06em' }}>
            YOUR LAST GUESS — DISTRIBUTION
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            {latestQuestion.prompt}
          </div>
          <BellCurve data={bellData} simulated compact />
        </div>
      )}

      <button className="btn btn-primary" onClick={() => navigate('game')}>
        Play to Climb the Board →
      </button>
    </div>
  )
}
