/**
 * Scoring module.
 *
 * Score = percentile rank of your guess against peer guesses.
 * A score of 82 means you guessed closer to the answer than 82% of players.
 *
 * SWAP POINT FOR REAL DATA:
 * `calculateScore` takes a `peerGuesses` array. Right now callers pass
 * `generateSimulatedPeerGuesses(answer, questionId)`. When real stored guesses
 * exist, pass those instead — this function and everything downstream stays
 * identical.
 */

export function calculatePercentError(guess: number, answer: number): number {
  if (answer === 0) return guess === 0 ? 0 : 100
  return Math.abs((guess - answer) / answer) * 100
}

// Score = percentile rank against peer guesses (0–100).
// To use real peer data: pass actual stored guesses instead of simulated ones.
export function calculateScore(guess: number, peerGuesses: number[]): number {
  return getPercentileRank(guess, peerGuesses)
}

/**
 * Generate a simulated bell curve of peer guesses around the accepted answer.
 * Uses Box-Muller transform with a seeded PRNG for deterministic output per question.
 */
export function generateSimulatedPeerGuesses(answer: number, questionId: string, count = 200): number[] {
  const seed = hashCode(questionId)
  const rng = seededRandom(seed)

  // Simulate log-normal distribution since estimation errors are multiplicative
  const logAnswer = Math.log(Math.max(answer, 1))
  const sigma = 0.8 // ~80% log-error spread — realistic for estimation tasks

  const guesses: number[] = []
  for (let i = 0; i < count; i++) {
    const u1 = rng()
    const u2 = rng()
    const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2)
    const logGuess = logAnswer + z * sigma
    guesses.push(Math.round(Math.exp(logGuess)))
  }
  return guesses
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

export function getPercentileRank(value: number, dataset: number[]): number {
  const sorted = [...dataset].sort((a, b) => a - b)
  const below = sorted.filter((v) => v < value).length
  return Math.round((below / sorted.length) * 100)
}

export interface BellCurveData {
  bins: { x: number; count: number; label: string }[]
  playerGuess: number
  answer: number
  playerPercentile: number
}

export function buildBellCurveData(
  playerGuess: number,
  answer: number,
  peerGuesses: number[]
): BellCurveData {
  const all = [...peerGuesses, playerGuess]
  const min = Math.min(...all)
  const max = Math.max(...all)
  const BIN_COUNT = 20

  const binSize = (max - min) / BIN_COUNT || 1
  const bins = Array.from({ length: BIN_COUNT }, (_, i) => {
    const lo = min + i * binSize
    const hi = lo + binSize
    const count = peerGuesses.filter((g) => g >= lo && g < hi).length
    return {
      x: Math.round(lo + binSize / 2),
      count,
      label: formatNumber(Math.round(lo + binSize / 2)),
    }
  })

  return {
    bins,
    playerGuess,
    answer,
    playerPercentile: getPercentileRank(playerGuess, peerGuesses),
  }
}

export function formatNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toLocaleString()
}
