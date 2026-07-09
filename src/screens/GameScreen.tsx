import { useState, useCallback, useRef, useEffect } from 'react'
import type { Question, GuessRecord, AnalysisFeedback } from '../types'
import type { BellCurveData } from '../lib/scoring'
import {
  calculatePercentError,
  calculateScore,
  generateSimulatedPeerGuesses,
  buildBellCurveData,
  formatNumber,
} from '../lib/scoring'
import { generateAIFeedback } from '../lib/analysis'
import { markQuestionSeen, saveGuess } from '../services/storage'
import Timer from '../components/ui/Timer'
import BellCurve from '../components/ui/BellCurve'
import ScoreBadge from '../components/ui/ScoreBadge'
import type { Screen } from '../App'

interface Props {
  questions: Question[]
  navigate: (s: Screen) => void
  sessionScore: number
  onScoreUpdate: (delta: number) => void
  sessionCount: number
  onSessionCount: () => void
}

type Phase = 'question' | 'result'

const DIFFICULTY_SECONDS: Record<Question['difficulty'], number> = {
  beginner: 60,
  normal: 90,
  hard: 120,
}

export default function GameScreen({ questions, navigate, sessionScore, onScoreUpdate, sessionCount, onSessionCount }: Props) {
  const [qIndex, setQIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('question')
  const [guessStr, setGuessStr] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [timedOut, setTimedOut] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisFeedback | null>(null)
  const [bellData, setBellData] = useState<BellCurveData | null>(null)
  const [lastRecord, setLastRecord] = useState<GuessRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)
  const timerKey = useRef(0)

  const question = questions[qIndex]

  const allDone = qIndex >= questions.length

  const handleSubmit = useCallback(async (auto = false) => {
    if (!question) return
    const guess = parseFloat(guessStr.replace(/[,\s]/g, ''))
    const finalGuess = auto || isNaN(guess) ? 0 : guess
    const wasTimedOut = auto

    const percentError = calculatePercentError(finalGuess, question.answer)
    const score = calculateScore(percentError)
    const peerGuesses = generateSimulatedPeerGuesses(question.answer, question.id)
    const bd = buildBellCurveData(finalGuess, question.answer, peerGuesses)

    const record: GuessRecord = {
      questionId: question.id,
      guess: finalGuess,
      actualAnswer: question.answer,
      percentError,
      reasoningText: reasoning || undefined,
      timestamp: new Date().toISOString(),
      score,
      wasTimedOut,
    }

    setLoading(true)
    const fb = await generateAIFeedback(question, finalGuess, reasoning || undefined)
    setLoading(false)

    markQuestionSeen(question.id)
    saveGuess(record)
    onScoreUpdate(score)
    onSessionCount()

    setTimedOut(wasTimedOut)
    setAnalysis(fb)
    setBellData(bd)
    setLastRecord(record)
    setPhase('result')
  }, [question, guessStr, reasoning, onScoreUpdate, onSessionCount])

  const handleNext = useCallback(() => {
    setQIndex((i) => i + 1)
    setPhase('question')
    setGuessStr('')
    setReasoning('')
    setAnalysis(null)
    setBellData(null)
    setLastRecord(null)
    setShowReasoning(false)
    timerKey.current++
  }, [])

  if (allDone) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100%', padding: 24, textAlign: 'center', gap: 20 }}>
        <div style={{ fontSize: '3rem' }}>🎉</div>
        <h2>You've conquered every question!</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Reset your history to play again.</p>
        <ScoreBadge score={sessionScore} size="lg" />
        <button className="btn btn-primary" onClick={() => navigate('home')}>Back to Home</button>
      </div>
    )
  }

  if (phase === 'question') {
    return (
      <QuestionPhase
        question={question}
        qIndex={qIndex}
        total={questions.length}
        guessStr={guessStr}
        setGuessStr={setGuessStr}
        reasoning={reasoning}
        setReasoning={setReasoning}
        showReasoning={showReasoning}
        setShowReasoning={setShowReasoning}
        onSubmit={() => handleSubmit(false)}
        onTimeout={() => handleSubmit(true)}
        timerKey={timerKey.current}
        sessionScore={sessionScore}
        sessionCount={sessionCount}
        loading={loading}
      />
    )
  }

  return (
    <ResultPhase
      question={question}
      record={lastRecord!}
      analysis={analysis!}
      bellData={bellData!}
      timedOut={timedOut}
      onNext={handleNext}
      navigate={navigate}
    />
  )
}

// ── Question Phase ─────────────────────────────────────────────
interface QPhaseProps {
  question: Question
  qIndex: number
  total: number
  guessStr: string
  setGuessStr: (v: string) => void
  reasoning: string
  setReasoning: (v: string) => void
  showReasoning: boolean
  setShowReasoning: (v: boolean) => void
  onSubmit: () => void
  onTimeout: () => void
  timerKey: number
  sessionScore: number
  sessionCount: number
  loading: boolean
}

function QuestionPhase({
  question, qIndex, total, guessStr, setGuessStr, reasoning, setReasoning,
  showReasoning, setShowReasoning, onSubmit, onTimeout, timerKey, sessionScore, sessionCount, loading,
}: QPhaseProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [qIndex])

  const timerSeconds = DIFFICULTY_SECONDS[question.difficulty]
  const hasGuess = guessStr.trim().length > 0 && !isNaN(parseFloat(guessStr.replace(/[,\s]/g, '')))

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && hasGuess) onSubmit()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 20px 32px', minHeight: '100%', gap: 0 }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {qIndex + 1} / {Math.min(total, qIndex + 10)} questions
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 700 }}>
            ⭐ {sessionScore}
          </span>
          <Timer key={timerKey} durationSeconds={timerSeconds} onExpire={onTimeout} />
        </div>
      </div>

      {/* Difficulty + category */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <span className={`badge badge-${question.difficulty === 'beginner' ? 'primary' : question.difficulty === 'normal' ? 'amber' : 'danger'}`}>
          {question.difficulty}
        </span>
        <span className="category-chip">{question.category.replace(/-/g, ' ')}</span>
      </div>

      {/* Question */}
      <div className="card-dark" style={{ marginBottom: 24 }}>
        <p style={{ fontSize: '1.2rem', fontWeight: 600, lineHeight: 1.45, color: '#fff' }}>
          {question.prompt}
        </p>
        <p style={{ marginTop: 10, fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
          Units: {question.units}
        </p>
      </div>

      {/* Guess input */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
          YOUR GUESS
        </label>
        <input
          ref={inputRef}
          className="input-field"
          type="number"
          inputMode="decimal"
          placeholder="Enter a number..."
          value={guessStr}
          onChange={(e) => setGuessStr(e.target.value)}
          onKeyDown={handleKey}
          style={{ fontSize: '1.8rem' }}
        />
      </div>

      {/* Optional reasoning */}
      {showReasoning ? (
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
            LOGIC IT OUT (optional — improves feedback)
          </label>
          <textarea
            className="input-textarea"
            rows={3}
            placeholder="e.g. 'I think ~7M people × $50k avg salary = $350B'"
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
          />
        </div>
      ) : (
        <button
          className="btn btn-ghost"
          style={{ fontSize: '0.8rem', alignSelf: 'flex-start', marginBottom: 16 }}
          onClick={() => setShowReasoning(true)}
        >
          + Logic it out
        </button>
      )}

      <div style={{ flex: 1 }} />

      <button
        className="btn btn-primary"
        disabled={!hasGuess || loading}
        onClick={onSubmit}
        style={{ marginTop: 'auto' }}
      >
        {loading ? 'Analyzing...' : 'Submit Guess'}
      </button>

      {sessionCount >= 10 && (
        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--primary)', marginTop: 12 }}>
          🎯 {sessionCount} guesses this session — great session!
        </p>
      )}
    </div>
  )
}

// ── Result Phase ───────────────────────────────────────────────
interface RPhaseProps {
  question: Question
  record: GuessRecord
  analysis: AnalysisFeedback
  bellData: BellCurveData
  timedOut: boolean
  onNext: () => void
  navigate: (s: Screen) => void
}

function ResultPhase({ question, record, analysis, bellData, timedOut, onNext, navigate }: RPhaseProps) {
  const isHigh = record.guess > record.actualAnswer
  const errorPct = Math.round(record.percentError)
  const direction = record.guess === 0 ? 'timed out' : isHigh ? '↑ too high' : '↓ too low'
  const dirColor = record.guess === 0 ? 'var(--text-muted)' : isHigh ? 'var(--accent-high)' : 'var(--accent-low)'

  return (
    <div className="animate-fadeIn" style={{ padding: '20px 20px 32px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: '100%' }}>
      {timedOut && (
        <div style={{ background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.2)', borderRadius: 12, padding: '10px 16px', fontSize: '0.85rem', color: 'var(--danger)' }}>
          ⏱ Time expired — auto-submitted
        </div>
      )}

      {/* Score reveal */}
      <div className="card-elevated" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.08em', fontWeight: 600 }}>ROUND SCORE</div>
        <div className="animate-scaleIn" style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--accent-high)', lineHeight: 1 }}>
          {record.score}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6 }}>
          out of 100 points
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'Your Guess', value: formatNumber(record.guess), sub: record.guess === 0 ? 'timed out' : question.units },
          { label: 'Answer', value: formatNumber(record.actualAnswer), sub: question.units },
          { label: 'Error', value: `${errorPct}%`, sub: <span style={{ color: dirColor }}>{direction}</span> },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', marginBottom: 4 }}>
              {s.label.toUpperCase()}
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Bell curve */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 12, letterSpacing: '0.06em' }}>
          GUESS DISTRIBUTION
        </div>
        <BellCurve data={bellData} simulated />
      </div>

      {/* AI Analysis */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.06em' }}>
          ANALYSIS
        </div>
        <AnalysisSection icon="🧮" title="Your Math" text={analysis.yourMath} />
        <hr className="divider" />
        <AnalysisSection
          icon="⚠️"
          title="Missing Factors"
          items={analysis.missingFactors}
        />
        <hr className="divider" />
        <AnalysisSection
          icon="✅"
          title="Corrected Assumptions"
          items={analysis.correctedAssumptions}
        />
        <hr className="divider" />
        <AnalysisSection icon="💡" title="What to Learn Next" text={analysis.whatToLearnNext} />
      </div>

      {/* Source */}
      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', padding: '0 4px' }}>
        <span>Source: {question.sourceName}</span>
        <a href={question.sourceUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
          Verify →
        </a>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
        <button className="btn btn-primary" onClick={onNext}>
          Next Question →
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('home')} style={{ width: '100%' }}>
          Back to Home
        </button>
      </div>
    </div>
  )
}

function AnalysisSection({ icon, title, text, items }: { icon: string; title: string; text?: string; items?: string[] }) {
  return (
    <div>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, display: 'flex', gap: 6, alignItems: 'center' }}>
        {icon} {title}
      </div>
      {text && <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{text}</p>}
      {items && (
        <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item, i) => (
            <li key={i} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
