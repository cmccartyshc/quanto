import type { Question, AnalysisFeedback } from '../types'
import { formatNumber } from './scoring'

/**
 * Local deterministic analysis engine.
 * Returns structured feedback without any paid API.
 *
 * Drop-in replacement: wire `generateAIFeedback` to OpenAI/Claude by replacing
 * the function body — the return type stays identical.
 */
export async function generateAIFeedback(
  question: Question,
  guess: number,
  reasoning?: string
): Promise<AnalysisFeedback> {
  return generateLocalFeedback(question, guess, reasoning)
}

function generateLocalFeedback(
  question: Question,
  guess: number,
  reasoning?: string
): AnalysisFeedback {
  const answer = question.answer
  const ratio = guess / Math.max(answer, 1)
  const percentError = Math.abs((guess - answer) / answer) * 100
  const isHigh = guess > answer
  const orderOfMagnitudeOff = ratio > 10 || ratio < 0.1

  // --- Your Math ---
  let yourMath = reasoning
    ? `You wrote: "${reasoning}". Your final guess was ${formatNumber(guess)} ${question.units}.`
    : `You guessed ${formatNumber(guess)} ${question.units} — no reasoning was provided.`

  if (percentError < 5) {
    yourMath += ' Excellent instinct — you were extremely close.'
  } else if (percentError < 20) {
    yourMath += ' Your estimate was in the right ballpark.'
  } else if (orderOfMagnitudeOff) {
    yourMath += ` That's about ${ratio > 1 ? formatNumber(Math.round(ratio)) + 'x too high' : formatNumber(Math.round(1 / ratio)) + 'x too low'} — an order-of-magnitude gap.`
  } else {
    yourMath += ` You were ${isHigh ? 'above' : 'below'} the accepted answer by ${Math.round(percentError)}%.`
  }

  // --- Missing Factors ---
  const missingFactors: string[] = []

  const prompt = question.prompt.toLowerCase()

  if (orderOfMagnitudeOff) {
    if (ratio < 0.1) {
      missingFactors.push(
        `You may have underestimated scale. The accepted answer is ${formatNumber(answer)} — try anchoring to a familiar reference point first.`
      )
    } else {
      missingFactors.push(
        `Your estimate was far above the accepted answer. Check whether you confused units (e.g., thousands vs. millions) or stacked too many multipliers.`
      )
    }
  }

  if (prompt.includes('year') || prompt.includes('annual')) {
    if (!reasoning || (!reasoning.includes('365') && !reasoning.includes('year'))) {
      missingFactors.push('Did you account for 365 days per year? Annual figures are a common stumbling block.')
    }
  }

  if (prompt.includes('per day') || prompt.includes('daily')) {
    missingFactors.push('Daily figures should be multiplied by 365 to get annual totals — easy to miss.')
  }

  if (
    (prompt.includes('million') || answer > 1_000_000) &&
    guess < 1_000_000 &&
    guess > 0
  ) {
    missingFactors.push(
      `The accepted answer is in the millions. A common error is forgetting to scale up from a smaller reference.`
    )
  }

  if (
    (prompt.includes('billion') || answer > 1_000_000_000) &&
    guess < 1_000_000_000 &&
    guess > 0
  ) {
    missingFactors.push(`The accepted answer is in the billions — that's 1,000 millions. Easy to lose track of zeros.`)
  }

  if (question.category === 'geography' && prompt.includes('density')) {
    missingFactors.push(
      'Population density = total population ÷ area. Both inputs have wide ranges across regions.'
    )
  }

  if (question.category === 'business' && !reasoning?.includes('billion') && answer > 1e9) {
    missingFactors.push(
      'Government and corporate figures often run into the trillions. Anchoring on "millions" is a systematic underestimation.'
    )
  }

  if (missingFactors.length === 0) {
    if (percentError < 15) {
      missingFactors.push('No major structural gaps detected — your approach was sound.')
    } else {
      missingFactors.push(
        `Your estimate was off by ${Math.round(percentError)}%. Without a reasoning trace, it's hard to pinpoint exactly where — try using the reasoning box next time.`
      )
    }
  }

  // --- Corrected Assumptions ---
  const correctedAssumptions: string[] = []

  if (percentError > 5) {
    correctedAssumptions.push(
      `Accepted answer: ${formatNumber(answer)} ${question.units}. Your guess: ${formatNumber(guess)} ${question.units}. Error: ${Math.round(percentError)}% ${isHigh ? 'too high' : 'too low'}.`
    )
  }

  correctedAssumptions.push(question.explanation)

  if (ratio > 2) {
    correctedAssumptions.push(
      `A useful check: if your estimate feels large, try halving it and see if it still makes intuitive sense.`
    )
  } else if (ratio < 0.5) {
    correctedAssumptions.push(
      `A useful check: if your estimate feels small, try doubling it and see if it still makes intuitive sense.`
    )
  }

  // --- What to Learn Next ---
  const whatToLearnNext = getLearnNext(question, percentError, isHigh)

  return { yourMath, missingFactors, correctedAssumptions, whatToLearnNext }
}

function getLearnNext(question: Question, percentError: number, isHigh: boolean): string {
  if (percentError < 5) {
    return `You nailed it. For your next question in the "${categoryLabel(question.category)}" category, try tackling a harder difficulty to push your calibration further.`
  }

  const tips: Record<string, string> = {
    'everyday-life':
      'For everyday quantities, build a mental anchor library: a car weighs ~4,000 lbs, a gallon of water weighs ~8 lbs, a dollar bill weighs ~1 gram. Anchors compound.',
    geography:
      'For geography questions, memorize a few key comparisons: Texas is ~268K sq miles, the US is ~3.8M sq miles, Earth is ~197M sq miles. Scale from there.',
    business:
      'For economic figures, anchor to US GDP (~$25 trillion). Most national budgets and corporate revenues are fractions of that number.',
    food:
      'For food quantities, anchor to per-person daily intake (~2,000 calories, ~3 lbs of food) and multiply by population or time.',
    'human-body':
      'For body stats, remember: average adult heart beats ~100,000 times/day, lungs take ~22,000 breaths/day. These compound fast.',
    construction:
      'For construction quantities, think in layers: a typical floor is ~10 feet, a city block is ~400 feet. Build up from there.',
    sports:
      'For sports stats, anchor to game counts (NFL: 17 games, MLB: 162) and typical per-game figures, then multiply.',
    science:
      'For scientific quantities, practice orders of magnitude: atoms in a cell (~10 trillion), cells in a human (~37 trillion), stars in the Milky Way (~200 billion).',
    'objects-volume':
      'For volume questions, anchor to known containers: a standard bathtub holds ~40 gallons, an Olympic pool holds ~660,000 gallons.',
    'ratios-density':
      'For density/ratio questions, always identify numerator and denominator separately, then combine. Most errors happen in one of the two inputs.',
    'pop-culture':
      'Pop culture numbers are often surprisngly large. Social media follower counts and streaming numbers tend to be much bigger than intuition suggests.',
  }

  const categoryTip = tips[question.category] || 'Practice Fermi estimation: break the unknown into components you can estimate, then multiply.'

  if (isHigh) {
    return `You guessed high on this one. ${categoryTip}`
  }
  return `You guessed low on this one. ${categoryTip}`
}

function categoryLabel(cat: string): string {
  return cat.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
