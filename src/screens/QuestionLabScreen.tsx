import { useState } from 'react'
import {
  getGeneratedQuestions,
  saveGeneratedQuestion,
  approveGeneratedQuestion,
  rejectGeneratedQuestion,
} from '../services/storage'
import { fetchNewQuestions } from '../services/questionApi'
import type { GeneratedQuestion } from '../types'
import { formatNumber } from '../lib/scoring'
import type { Screen } from '../App'

interface Props {
  navigate: (s: Screen) => void
}

export default function QuestionLabScreen({ navigate }: Props) {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>(getGeneratedQuestions())
  const [fetching, setFetching] = useState(false)
  const [lastSource, setLastSource] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pending = questions.filter((q) => q.needsReview && !q.approved)
  const approved = questions.filter((q) => q.approved)

  const refresh = () => setQuestions(getGeneratedQuestions())

  const handleFetch = async () => {
    setFetching(true)
    setError(null)
    try {
      const { questions: fetched, source } = await fetchNewQuestions()
      if (fetched.length === 0) {
        setError('All APIs returned no results. Falling back to seed questions in the main game.')
      } else {
        for (const q of fetched) saveGeneratedQuestion(q)
        setLastSource(source)
        refresh()
      }
    } catch {
      setError('Fetch failed — main game will continue using seed questions.')
    }
    setFetching(false)
  }

  const handleApprove = (id: string) => {
    approveGeneratedQuestion(id)
    refresh()
  }

  const handleReject = (id: string) => {
    rejectGeneratedQuestion(id)
    refresh()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', padding: '20px 20px 32px', minHeight: '100%', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('home')}>← Back</button>
        <h2 style={{ fontSize: '1.1rem' }}>🔬 Question Lab</h2>
        <div style={{ width: 60 }} />
      </div>

      <div className="card" style={{ background: 'rgba(255,171,0,0.06)', borderColor: 'rgba(255,171,0,0.2)' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Fetch candidate questions from free public APIs (World Bank, Wikidata, Wikipedia, Open Trivia DB).
          Review and approve them before they enter the main question pool.
        </p>
      </div>

      {/* Fetch button */}
      <button className="btn btn-primary" disabled={fetching} onClick={handleFetch}>
        {fetching ? '⏳ Fetching...' : '⬇️ Fetch New Questions'}
      </button>

      {lastSource && (
        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', textAlign: 'center' }}>
          ✓ Fetched from: {lastSource}
        </div>
      )}
      {error && (
        <div style={{ fontSize: '0.8rem', color: 'var(--accent-high)', textAlign: 'center', background: 'rgba(255,171,0,0.08)', padding: '10px 14px', borderRadius: 10 }}>
          ⚠️ {error}
        </div>
      )}

      {/* Pending review */}
      {pending.length > 0 && (
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 12, letterSpacing: '0.06em' }}>
            PENDING REVIEW ({pending.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {pending.map((q) => (
              <QuestionCard key={q.id} q={q} onApprove={handleApprove} onReject={handleReject} />
            ))}
          </div>
        </div>
      )}

      {/* Approved */}
      {approved.length > 0 && (
        <div>
          <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginBottom: 12, letterSpacing: '0.06em' }}>
            APPROVED ({approved.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {approved.map((q) => (
              <div key={q.id} className="card" style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{q.prompt}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Answer: {formatNumber(q.answer)} {q.units} · Source: {q.sourceName}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {questions.length === 0 && !fetching && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>🧪</div>
          <p style={{ fontSize: '0.9rem' }}>No generated questions yet. Click "Fetch New Questions" to start.</p>
        </div>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid rgba(35,38,41,0.08)' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>API Priority Order:</strong><br />
          1. World Bank Indicators → 2. Wikidata SPARQL → 3. Wikipedia REST → 4. Open Trivia DB<br />
          Questions marked <span style={{ color: 'var(--accent-high)' }}>needsReview</span> require human approval before entering the main game.
        </div>
      </div>
    </div>
  )
}

function QuestionCard({ q, onApprove, onReject }: { q: GeneratedQuestion; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  return (
    <div className="card" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
        <span className="badge badge-amber">needs review</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{q.generatedBy} · {q.sourceName}</span>
      </div>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.5 }}>
        {q.prompt}
      </p>
      <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
        <span>Answer: <strong>{formatNumber(q.answer)} {q.units}</strong></span>
        <span>Category: {q.category}</span>
      </div>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
        {q.explanation.slice(0, 200)}{q.explanation.length > 200 ? '…' : ''}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn-primary btn-sm"
          style={{ flex: 1, minHeight: 36, background: 'var(--primary)' }}
          onClick={() => onApprove(q.id)}
        >
          ✓ Approve
        </button>
        <button
          className="btn btn-secondary btn-sm"
          style={{ flex: 1, minHeight: 36, color: 'var(--danger)', borderColor: 'rgba(255,82,82,0.2)' }}
          onClick={() => onReject(q.id)}
        >
          ✕ Reject
        </button>
      </div>
    </div>
  )
}
