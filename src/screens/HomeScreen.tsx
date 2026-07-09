import StreakBadge from '../components/ui/StreakBadge'
import ScoreBadge from '../components/ui/ScoreBadge'
import { getProfile, getStreak } from '../services/storage'
import type { Screen } from '../App'

interface Props {
  navigate: (screen: Screen) => void
}

export default function HomeScreen({ navigate }: Props) {
  const profile = getProfile()
  const streak = getStreak()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '48px 24px 32px',
      minHeight: '100%',
      gap: 0,
    }}>
      {/* Logo + tagline */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          fontSize: '4rem',
          fontWeight: 900,
          letterSpacing: '-0.04em',
          background: 'linear-gradient(135deg, #219e24, #ffb703)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
          marginBottom: 10,
        }}>
          Quanto
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', fontWeight: 500 }}>
          Guess the number. Beat the curve.
        </p>
      </div>

      {/* Profile strip */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 44,
        flexWrap: 'wrap',
      }}>
        <ScoreBadge score={profile.totalScore} size="md" />
        <StreakBadge count={streak.count} size="md" />
      </div>

      {/* Nav */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <button className="btn btn-primary" onClick={() => navigate('game')} style={{ fontSize: '1.15rem', minHeight: 60 }}>
          Start Game
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('daily')}>
          📅 Daily Challenge
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('leaderboard')}>
          🏆 Leaderboard
        </button>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Footer links */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => navigate('history')}>
          My History
        </button>
        <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => navigate('tournament')}>
          Tournaments
        </button>
        <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => navigate('questionlab')}>
          Question Lab
        </button>
      </div>

      <p style={{ marginTop: 16, fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        Hello, {profile.displayName} · Quanto MVP
      </p>
    </div>
  )
}
