import { useMemo, useState } from 'react'
import { getGuesses, resetSeenIds } from '../services/storage'
import { getQuestionById } from '../data/questions'
import { formatNumber, generateSimulatedPeerGuesses, buildBellCurveData } from '../lib/scoring'
import BellCurve from '../components/ui/BellCurve'
import type { GuessRecord } from '../types'
import type { Screen } from '../App'

interface Props {
  navigate: (s: Screen) => void
}

export default function HistoryScreen({ navigate }: Props) {
  const guesses = getGuesses()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [resetConfirm, setResetConfirm] = useState(false)

  const sorted = useMemo(() => [...guesses].reverse(), [guesses])

  const avgScore = guesses.length > 0
    ? Math.round(guesses.reduce((s, g) => s + g.score, 0) / guesses.length)
    : 0

  const avgError = guesses.length > 0
    ? Math.round(guesses.reduce((s, g) => s + g.percentError, 0) / guesses.length)
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 20px 32px', minHeight: '100%', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('home')}>← Back</button>
        <h2 style={{ fontSize: '1.1rem' }}>📊 My History</h2>
        <div style={{ width: 60 }} />
      </div>

      {guesses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎯</div>
          <p>No guesses yet. Start playing to build your history!</p>
          <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => navigate('game')}>
            Start Playing
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'Total Guesses', value: guesses.length },
              { label: 'Avg Score', value: avgScore },
              { label: 'Avg Error', value: `${avgError}%` },
            ].map((s) => (
              <div key={s.label} className="card" style={{ padding: 14, textAlign: 'center' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>{s.label.toUpperCase()}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sorted.map((g) => (
              <GuessRow
                key={g.questionId + g.timestamp}
                record={g}
                expanded={expandedId === g.questionId + g.timestamp}
                onToggle={() => setExpandedId(expandedId === g.questionId + g.timestamp ? null : g.questionId + g.timestamp)}
              />
            ))}
          </div>

          <div style={{ marginTop: 8 }}>
            {!resetConfirm ? (
              <button className="btn btn-ghost" style={{ width: '100%', color: 'var(--danger)' }} onClick={() => setResetConfirm(true)}>
                Reset Question History
              </button>
            ) : (
              <div className="card" style={{ textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 14, fontSize: '0.9rem' }}>
                  This will let you see questions again — scores are kept.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setResetConfirm(false)}>Cancel</button>
                  <button className="btn btn-primary" style={{ flex: 1, background: 'var(--danger)' }} onClick={() => { resetSeenIds(); setResetConfirm(false) }}>
                    Reset
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function GuessRow({ record, expanded, onToggle }: { record: GuessRecord; expanded: boolean; onToggle: () => void }) {
  const question = getQuestionById(record.questionId)
  const isHigh = record.guess > record.actualAnswer
  const dirColor = record.guess === 0 ? 'var(--text-muted)' : isHigh ? 'var(--accent-high)' : 'var(--accent-low)'

  const bellData = useMemo(() => {
    if (!question) return null
    const peers = generateSimulatedPeerGuesses(question.answer, question.id)
    return buildBellCurveData(record.guess, question.answer, peers)
  }, [question, record])

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '14px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          textAlign: 'left',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {question?.prompt ?? `Question ${record.questionId}`}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {new Date(record.timestamp).toLocaleDateString()}
            </span>
            {record.wasTimedOut && (
              <span style={{ fontSize: '0.7rem', color: 'var(--danger)' }}>timed out</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '0.8rem', color: dirColor, fontWeight: 600 }}>
            {Math.round(record.percentError)}% off
          </span>
          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>
            {record.score}pts
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {expanded && bellData && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid rgba(35,38,41,0.08)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, margin: '14px 0' }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>YOUR GUESS</div>
              <div style={{ fontWeight: 700 }}>{formatNumber(record.guess)} {question?.units}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>ANSWER</div>
              <div style={{ fontWeight: 700 }}>{formatNumber(record.actualAnswer)} {question?.units}</div>
            </div>
          </div>
          <BellCurve data={bellData} simulated compact />
        </div>
      )}
    </div>
  )
}
