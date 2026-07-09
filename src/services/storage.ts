/**
 * Central storage service — all localStorage access goes through here.
 * Swap out this module's implementations to migrate to Supabase/Firebase/Postgres
 * without touching any component code.
 */
import type { GuessRecord, UserProfile, StreakData, DailyResult, GeneratedQuestion } from '../types'

const KEYS = {
  PROFILE: 'quanto_profile',
  SEEN_IDS: 'quanto_seen_ids',
  GUESSES: 'quanto_guesses',
  STREAK: 'quanto_streak',
  DAILY: (date: string) => `quanto_daily_${date}`,
  GENERATED_QUESTIONS: 'quanto_generated_questions',
} as const

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value))
}

// Profile
export const getProfile = (): UserProfile =>
  read<UserProfile>(KEYS.PROFILE, { displayName: 'Player', totalScore: 0, streak: 0 })

export const saveProfile = (profile: UserProfile): void => write(KEYS.PROFILE, profile)

export const addToTotalScore = (points: number): void => {
  const p = getProfile()
  saveProfile({ ...p, totalScore: p.totalScore + points })
}

// Seen question IDs
export const getSeenIds = (): string[] => read<string[]>(KEYS.SEEN_IDS, [])

export const markQuestionSeen = (id: string): void => {
  const seen = getSeenIds()
  if (!seen.includes(id)) write(KEYS.SEEN_IDS, [...seen, id])
}

export const resetSeenIds = (): void => write(KEYS.SEEN_IDS, [])

// Guesses
export const getGuesses = (): GuessRecord[] => read<GuessRecord[]>(KEYS.GUESSES, [])

export const saveGuess = (record: GuessRecord): void => {
  const guesses = getGuesses()
  write(KEYS.GUESSES, [...guesses, record])
  addToTotalScore(record.score)
}

// Streak
export const getStreak = (): StreakData =>
  read<StreakData>(KEYS.STREAK, { count: 0, lastDailyDate: null })

export const updateStreak = (todayUtc: string): StreakData => {
  const streak = getStreak()
  const yesterday = getPreviousDate(todayUtc)
  let newCount: number

  if (streak.lastDailyDate === todayUtc) {
    // Already updated today
    return streak
  } else if (streak.lastDailyDate === yesterday || streak.lastDailyDate === null) {
    newCount = streak.count + 1
  } else {
    // Missed a day — reset
    newCount = 1
  }

  const updated: StreakData = { count: newCount, lastDailyDate: todayUtc }
  write(KEYS.STREAK, updated)
  const profile = getProfile()
  saveProfile({ ...profile, streak: newCount })
  return updated
}

function getPreviousDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

// Daily challenge
export const getDailyResult = (date: string): DailyResult | null =>
  read<DailyResult | null>(KEYS.DAILY(date), null)

export const saveDailyResult = (result: DailyResult): void =>
  write(KEYS.DAILY(result.date), result)

export const hasDailyResult = (date: string): boolean => getDailyResult(date) !== null

// Generated questions (Question Lab)
export const getGeneratedQuestions = (): GeneratedQuestion[] =>
  read<GeneratedQuestion[]>(KEYS.GENERATED_QUESTIONS, [])

export const saveGeneratedQuestion = (q: GeneratedQuestion): void => {
  const existing = getGeneratedQuestions()
  const idx = existing.findIndex((e) => e.id === q.id)
  if (idx >= 0) {
    existing[idx] = q
    write(KEYS.GENERATED_QUESTIONS, existing)
  } else {
    write(KEYS.GENERATED_QUESTIONS, [...existing, q])
  }
}

export const approveGeneratedQuestion = (id: string): void => {
  const existing = getGeneratedQuestions()
  const updated = existing.map((q) => (q.id === id ? { ...q, approved: true, needsReview: false } : q))
  write(KEYS.GENERATED_QUESTIONS, updated)
}

export const rejectGeneratedQuestion = (id: string): void => {
  const existing = getGeneratedQuestions()
  write(KEYS.GENERATED_QUESTIONS, existing.filter((q) => q.id !== id))
}
