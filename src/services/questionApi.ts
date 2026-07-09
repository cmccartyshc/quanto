/**
 * Question Lab: fetches candidate numeric facts from free APIs
 * Priority order: World Bank → Wikidata → Wikipedia → Open Trivia DB
 */
import type { GeneratedQuestion, Category } from '../types'

let idCounter = Date.now()
function nextId(): string {
  return `gen_${++idCounter}`
}

// ── World Bank ──────────────────────────────────────────────────
const WB_INDICATORS: { code: string; prompt: (country: string) => string; units: string; category: Category }[] = [
  { code: 'SP.POP.TOTL', prompt: (c) => `What is the total population of ${c}?`, units: 'people', category: 'geography' },
  { code: 'NY.GDP.MKTP.CD', prompt: (c) => `What is the GDP of ${c} in US dollars?`, units: 'USD', category: 'business' },
  { code: 'AG.LND.TOTL.K2', prompt: (c) => `What is the total land area of ${c} in square kilometers?`, units: 'square km', category: 'geography' },
  { code: 'EN.POP.DNST', prompt: (c) => `What is the population density of ${c} (people per sq km)?`, units: 'people per sq km', category: 'ratios-density' },
]

const COUNTRIES = [
  { name: 'Brazil', code: 'BRA' },
  { name: 'India', code: 'IND' },
  { name: 'Germany', code: 'DEU' },
  { name: 'Japan', code: 'JPN' },
  { name: 'Mexico', code: 'MEX' },
  { name: 'South Africa', code: 'ZAF' },
  { name: 'Australia', code: 'AUS' },
  { name: 'Canada', code: 'CAN' },
]

export async function fetchWorldBankQuestions(): Promise<GeneratedQuestion[]> {
  const results: GeneratedQuestion[] = []
  const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)]
  const indicator = WB_INDICATORS[Math.floor(Math.random() * WB_INDICATORS.length)]

  try {
    const res = await fetch(
      `https://api.worldbank.org/v2/country/${country.code}/indicator/${indicator.code}?format=json&mrv=1`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    const value = data?.[1]?.[0]?.value
    if (!value || typeof value !== 'number') return []

    results.push({
      id: nextId(),
      prompt: indicator.prompt(country.name),
      category: indicator.category,
      answer: Math.round(value),
      answerType: 'estimated',
      sourceName: `World Bank — ${country.name}`,
      sourceUrl: `https://data.worldbank.org/country/${country.code}`,
      difficulty: 'normal',
      explanation: `According to the World Bank, the ${indicator.units} for ${country.name} is approximately ${Math.round(value).toLocaleString()} ${indicator.units}.`,
      units: indicator.units,
      createdAt: new Date().toISOString().slice(0, 10),
      needsReview: true,
      generatedBy: 'api',
    })
  } catch {
    // Silently fall through
  }

  return results
}

// ── Wikidata SPARQL ─────────────────────────────────────────────
const WIKIDATA_QUERIES = [
  {
    sparql: `SELECT ?label ?value WHERE {
      ?country wdt:P31 wd:Q6256; wdt:P1082 ?value; rdfs:label ?label.
      FILTER(LANG(?label) = 'en' && ?value > 1000000 && ?value < 500000000)
    } LIMIT 5`,
    prompt: (label: string) => `What is the population of ${label}?`,
    units: 'people',
    category: 'geography' as Category,
  },
  {
    sparql: `SELECT ?label ?value WHERE {
      ?mountain wdt:P31 wd:Q8502; wdt:P2044 ?value; rdfs:label ?label.
      FILTER(LANG(?label) = 'en' && ?value > 1000 && ?value < 9000)
    } LIMIT 5`,
    prompt: (label: string) => `How tall is ${label} in meters?`,
    units: 'meters',
    category: 'geography' as Category,
  },
]

export async function fetchWikidataQuestions(): Promise<GeneratedQuestion[]> {
  const results: GeneratedQuestion[] = []
  const q = WIKIDATA_QUERIES[Math.floor(Math.random() * WIKIDATA_QUERIES.length)]

  try {
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(q.sparql)}&format=json`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return []
    const data = await res.json()
    const bindings = data?.results?.bindings ?? []

    for (const b of bindings.slice(0, 3)) {
      const label = b.label?.value
      const value = parseFloat(b.value?.value)
      if (!label || isNaN(value)) continue

      results.push({
        id: nextId(),
        prompt: q.prompt(label),
        category: q.category,
        answer: Math.round(value),
        answerType: 'estimated',
        sourceName: 'Wikidata',
        sourceUrl: `https://www.wikidata.org/wiki/Special:Search/${encodeURIComponent(label)}`,
        difficulty: 'normal',
        explanation: `According to Wikidata, ${label} has a value of approximately ${Math.round(value).toLocaleString()} ${q.units}.`,
        units: q.units,
        createdAt: new Date().toISOString().slice(0, 10),
        needsReview: true,
        generatedBy: 'api',
      })
    }
  } catch {
    // Silently fall through
  }

  return results
}

// ── Wikipedia ───────────────────────────────────────────────────
const WIKI_ARTICLES = [
  'Mount_Everest',
  'Pacific_Ocean',
  'Great_Wall_of_China',
  'Amazon_rainforest',
  'Burj_Khalifa',
]

export async function fetchWikipediaQuestions(): Promise<GeneratedQuestion[]> {
  const article = WIKI_ARTICLES[Math.floor(Math.random() * WIKI_ARTICLES.length)]
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${article}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    const extract: string = data?.extract ?? ''
    // Pull first number from summary
    const match = extract.match(/[\d,]+(?:\.\d+)?/)
    if (!match) return []
    const value = parseFloat(match[0].replace(/,/g, ''))
    if (isNaN(value) || value <= 0) return []

    return [
      {
        id: nextId(),
        prompt: `Based on this topic: "${data?.title}" — can you estimate the primary numeric fact mentioned?`,
        category: 'science',
        answer: Math.round(value),
        answerType: 'estimated',
        sourceName: 'Wikipedia',
        sourceUrl: data?.content_urls?.desktop?.page ?? 'https://www.wikipedia.org',
        difficulty: 'normal',
        explanation: extract.slice(0, 300),
        units: 'units',
        createdAt: new Date().toISOString().slice(0, 10),
        needsReview: true,
        generatedBy: 'api',
      },
    ]
  } catch {
    return []
  }
}

// ── Open Trivia DB (fallback) ───────────────────────────────────
export async function fetchOpenTriviaQuestions(): Promise<GeneratedQuestion[]> {
  try {
    const res = await fetch(
      'https://opentdb.com/api.php?amount=5&category=19&type=multiple',
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return []
    const data = await res.json()
    const questions = data?.results ?? []
    const results: GeneratedQuestion[] = []

    for (const q of questions) {
      const allAnswers = [q.correct_answer, ...q.incorrect_answers]
      const nums = allAnswers.map((a: string) => parseFloat(a.replace(/[^0-9.]/g, ''))).filter((n: number) => !isNaN(n) && n > 0)
      if (nums.length === 0) continue
      const correctNum = parseFloat(q.correct_answer.replace(/[^0-9.]/g, ''))
      if (isNaN(correctNum)) continue

      results.push({
        id: nextId(),
        prompt: `(Estimation framing required) ${q.question}`,
        category: 'science',
        answer: Math.round(correctNum),
        answerType: 'exact',
        sourceName: 'Open Trivia DB',
        sourceUrl: 'https://opentdb.com',
        difficulty: 'normal',
        explanation: `The correct answer is ${q.correct_answer}. This was sourced from Open Trivia DB and may need reframing as an estimation question.`,
        units: 'units',
        createdAt: new Date().toISOString().slice(0, 10),
        needsReview: true,
        generatedBy: 'api',
      })
    }

    return results
  } catch {
    return []
  }
}

// ── Main orchestrator ───────────────────────────────────────────
export async function fetchNewQuestions(): Promise<{ questions: GeneratedQuestion[]; source: string }> {
  const fetchers = [
    { fn: fetchWorldBankQuestions, name: 'World Bank' },
    { fn: fetchWikidataQuestions, name: 'Wikidata' },
    { fn: fetchWikipediaQuestions, name: 'Wikipedia' },
    { fn: fetchOpenTriviaQuestions, name: 'Open Trivia DB' },
  ]

  for (const { fn, name } of fetchers) {
    try {
      const questions = await fn()
      if (questions.length > 0) {
        return { questions, source: name }
      }
    } catch {
      // Try next
    }
  }

  return { questions: [], source: 'none' }
}
