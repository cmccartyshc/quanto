import type { VercelRequest, VercelResponse } from '@vercel/node'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT = `You generate numerical estimation questions for a game called Quanto.

Return a JSON array of exactly 5 questions. Each question must follow this exact shape:
{
  "prompt": "string — the estimation question",
  "answer": number — the correct numeric answer,
  "units": "string — unit of measurement (e.g. 'people', 'km²', 'USD', 'meters')",
  "category": one of: "everyday-life" | "geography" | "business" | "food" | "human-body" | "construction" | "sports" | "science" | "objects-volume" | "ratios-density" | "pop-culture",
  "difficulty": "beginner" | "normal" | "hard",
  "explanation": "string — 1-2 sentences explaining the answer",
  "sourceName": "string — where the answer comes from",
  "sourceUrl": "string — a real URL to verify the answer"
}

Rules:
- Questions must have a single definitive numeric answer
- Answers should be verifiable facts, not estimates
- Mix categories and difficulties
- beginner: everyday intuitive numbers (e.g. "How many keys on a piano?")
- normal: geography, business, sports stats
- hard: scientific quantities, large-scale economics
- Return ONLY the JSON array, no other text`

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' })
  }

  try {
    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: 'Generate 5 diverse estimation questions.' },
        ],
        temperature: 0.8,
        max_tokens: 2048,
      }),
    })

    if (!groqRes.ok) {
      const err = await groqRes.text()
      return res.status(502).json({ error: 'Groq API error', detail: err })
    }

    const data = await groqRes.json()
    const content = data.choices?.[0]?.message?.content ?? ''

    // Parse the JSON array out of the response
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      return res.status(502).json({ error: 'Could not parse questions from Groq response' })
    }

    const questions = JSON.parse(jsonMatch[0])
    return res.status(200).json({ questions, source: 'groq' })
  } catch (err) {
    return res.status(500).json({ error: 'Internal error', detail: String(err) })
  }
}
