import { useState, useCallback } from 'react'
import type { Question, AnalysisFeedback, DailyResult } from '../types'
import type { BellCurveData } from '../lib/scoring'
import {
  calculatePercentError,
  calculateScore,
  generateSimulatedPeerGuesses,
  buildBellCurveData,
  formatNumber,
} from '../lib/scoring'
import { generateAIFeedback } from '../lib/analysis'
import {
  getDailyResult,
  saveDailyResult,
  hasDailyResult,
  updateStreak,
  getStreak,
} from '../services/storage'
import { getDailyQuestion, getTodayUtc, SEED_QUESTIONS } from '../data/questions'
import Timer from '../components/ui/Timer'
import BellCurve from '../components/ui/BellCurve'
import StreakBadge from '../components/ui/StreakBadge'
import type { Screen } from '../App'

interface Props {
  navigate: (s: Screen) => void
}

export default function DailyScreen({ navigate }: Props) {
  const todayUtc = getTodayUtc()
  const question = getDailyQuestion(todayUtc, SEED_QUESTIONS)
  const existingResult = getDailyResult(todayUtc)
  const streak = getStreak()

  const [guessStr, setGuessStr] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [submitted, setSubmitted] = useState(!!existingResult)
  const [timedOut, setTimedOut] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisFeedback | null>(null)
  const [bellData, setBellData] = useState<BellCurveData | null>(null)
  const [result, setResult] = useState<DailyResult | null>(existingResult)
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async (auto = false) => {
    if (hasDailyResult(todayUtc)) return
    const guess = parseFloat(guessStr.replace(/[,\s]/g, ''))
    const finalGuess = auto || isNaN(guess) ? 0 : guess

    const percentError = calculatePercentError(finalGuess, question.answer)
    const score = calculateScore(percentError)
    const peerGuesses = generateSimulatedPeerGuesses(question.answer, question.id)
    const bd = buildBellCurveData(finalGuess, question.answer, peerGuesses)

    const dailyResult: DailyResult = {
      date: todayUtc,
      questionId: question.id,
      guess: finalGuess,
      score,
      percentError,
      timestamp: new Date().toISOString(),
    }

    setLoading(true)
    const fb = await generateAIFeedback(question, finalGuess, reasoning || undefined)
    setLoading(false)

    saveDailyResult(dailyResult)
    updateStreak(todayUtc)

    setTimedOut(auto)
    setAnalysis(fb)
    setBellData(bd)
    setResult(dailyResult)
    setSubmitted(true)
  }, [guessStr, reasoning, question, todayUtc])

  const hasGuess = guessStr.trim().length > 0 && !isNaN(parseFloat(guessStr.replace(/[,\s]/g, '')))

  if (submitted && result) {
    return <DailyResult
      question={question}
      result={result}
      analysis={analysis}
      bellData={bellData}
      timedOut={timedOut}
      streak={updateStreak(todayUtc).count}
      navigate={navigate}
      todayUtc={todayUtc}
    />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 20px 32px', minHeight: '100%', gap: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('home')}>← Back</button>
        <StreakBadge count={streak.count} size="sm" />
        <Timer durationSeconds={90} onExpire={() => handleSubmit(true)} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: '1.2rem' }}>📅</span>
          <h2 style={{ fontSize: '1.1rem' }}>Daily Challenge</h2>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          {' · '}UTC date: {todayUtc}
        </p>
      </div>

      <div className="card-elevated" style={{ marginBottom: 24 }}>
        <p style={{ fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.45 }}>{question.prompt}</p>
        <p style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Units: {question.units}</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
          YOUR GUESS
        </label>
        <input
          className="input-field"
          type="number"
          inputMode="decimal"
          placeholder="Enter a number..."
          value={guessStr}
          onChange={(e) => setGuessStr(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && hasGuess && handleSubmit(false)}
          style={{ fontSize: '1.8rem' }}
        />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
          REASONING (optional)
        </label>
        <textarea
          className="input-textarea"
          rows={3}
          placeholder="Show your work..."
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
        />
      </div>

      <div style={{ flex: 1 }} />

      <button className="btn btn-primary" disabled={!hasGuess || loading} onClick={() => handleSubmit(false)}>
        {loading ? 'Analyzing...' : 'Submit Daily Guess'}
      </button>
    </div>
  )
}

// ── Daily Result ────────────────────────────────────────────────
interface DRProps {
  question: Question
  result: DailyResult
  analysis: AnalysisFeedback | null
  bellData: BellCurveData | null
  timedOut: boolean
  streak: number
  navigate: (s: Screen) => void
  todayUtc: string
}

function DailyResult({ question, result, analysis, bellData, timedOut, streak, navigate }: DRProps) {
  const isHigh = result.guess > question.answer
  const errorPct = Math.round(result.percentError)
  const dirColor = result.guess === 0 ? 'var(--text-muted)' : isHigh ? 'var(--accent-high)' : 'var(--accent-low)'

  // Simulate leaderboard
  const fakeLeaderboard = [
    { name: 'Alex K.', score: 94, error: '3%' },
    { name: 'You', score: result.score, error: `${errorPct}%`, isYou: true },
    { name: 'Sam T.', score: 78, error: '22%' },
    { name: 'Jordan M.', score: 65, error: '35%' },
    { name: 'Riley P.', score: 51, error: '49%' },
  ].sort((a, b) => b.score - a.score)

  return (
    <div className="animate-fadeIn" style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('home')}>← Home</button>
        <StreakBadge count={streak} size="sm" />
      </div>

      {timedOut && (
        <div style={{ background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: '0.85rem', color: 'var(--danger)' }}>
          ⏱ Time expired — auto-submitted
        </div>
      )}

      <div className="card-elevated" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.08em', fontWeight: 600 }}>DAILY SCORE</div>
        <div className="animate-scaleIn" style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>
          {result.score}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6 }}>out of 100 points</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Your Guess', value: formatNumber(result.guess), sub: question.units },
          { label: 'Answer', value: formatNumber(question.answer), sub: question.units },
          { label: 'Error', value: `${errorPct}%`, sub: <span style={{ color: dirColor }}>{result.guess === 0 ? 'timed out' : isHigh ? '↑ high' : '↓ low'}</span> },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>{s.label.toUpperCase()}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{s.value}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {bellData && (
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 12, letterSpacing: '0.06em' }}>GUESS DISTRIBUTION</div>
          <BellCurve data={bellData} simulated />
        </div>
      )}

      {/* Simulated leaderboard */}
      <div className="card">
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 12, letterSpacing: '0.06em' }}>
          TODAY'S LEADERBOARD <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>(simulated)</span>
        </div>
        {fakeLeaderboard.map((row, i) => (
          <div key={row.name} style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 0',
            borderBottom: i < fakeLeaderboard.length - 1 ? '1px solid rgba(35,38,41,0.08)' : 'none',
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', width: 16 }}>{i + 1}</span>
              <span style={{ fontWeight: (row as any).isYou ? 700 : 400, color: (row as any).isYou ? 'var(--primary)' : 'var(--text-primary)', fontSize: '0.9rem' }}>
                {row.name}{(row as any).isYou ? ' (you)' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{row.error}</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{row.score}pts</span>
            </div>
          </div>
        ))}
      </div>

      {analysis && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.06em' }}>ANALYSIS</div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{analysis.yourMath}</p>
          <hr className="divider" />
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>💡 What to Learn Next</div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{analysis.whatToLearnNext}</p>
          </div>
        </div>
      )}

      <button className="btn btn-primary" onClick={() => navigate('game')}>
        Keep Playing →
      </button>
      <button className="btn btn-ghost" style={{ width: '100%' }} onClick={() => navigate('home')}>
        Back to Home
      </button>
    </div>
  )
}
