# Quanto

**Guess the number. Beat the curve.**

A mobile-first, real-time number estimation game. Players are shown numerical estimation questions, submit guesses, and receive structured analysis on how close they were.

---

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Mobile-first — use your browser's mobile emulation (iPhone 14 Pro size works well) or just use it on your phone.

---

## Architecture

```
src/
├── types/          # Shared TypeScript types (Question, GuessRecord, etc.)
├── data/           # 100 seed questions + question selection utilities
├── lib/            # Pure logic: scoring engine, analysis engine
├── services/       # Storage abstraction (all localStorage access here)
│                   # Also: questionApi.ts — free API integration
├── components/ui/  # Reusable: BellCurve, Timer, StreakBadge, ScoreBadge
└── screens/        # One file per screen
```

---

## Storage

All persistence goes through `src/services/storage.ts` — no component calls `localStorage` directly. Swap that module's implementations to migrate to Supabase, Firebase, or Postgres without touching any screen code.

| Key | Contents |
|-----|----------|
| `quanto_profile` | Display name, total score, streak count |
| `quanto_seen_ids` | Array of question IDs already shown to this user |
| `quanto_guesses` | Array of all GuessRecord objects |
| `quanto_streak` | Current streak count and last completed daily date |
| `quanto_daily_YYYY-MM-DD` | Daily challenge result for that date |
| `quanto_generated_questions` | Questions created via Question Lab |

---

## Scoring

**MVP formula:** `score = max(0, 100 - percentError)`

A guess with 15% error earns 85 points. Scores are clamped at 0.

**Long-term intent (z-score based):** When real peer guesses exist, scoring will shift to z-score position relative to the peer distribution. A guess within 1 standard deviation of the accepted answer scores ~85+; within 0.5 std dev scores 95+. This creates competitive tension and rewards being *more accurate than your peers*, not just accurate in absolute terms. See the comment block in `src/lib/scoring.ts`.

---

## Bell Curve

The bell curve shown after each guess is **simulated** using a seeded log-normal distribution around the accepted answer. This is clearly labeled in the UI as "Simulated — real curve unlocks with more players."

The simulation uses a deterministic seeded PRNG keyed to the question ID, so the same question always generates the same simulated peer distribution. When real player data exists, pass the actual guess array to `buildBellCurveData()` — the visualization code doesn't change.

---

## Analysis Engine

`src/lib/analysis.ts` provides a local deterministic feedback engine. It produces four sections:

1. **Your Math** — restates the player's guess and reasoning
2. **Missing Factors** — detects common errors (unit confusion, missing 365x, scale errors)
3. **Corrected Assumptions** — compares guess to answer, surfaces the explanation
4. **What to Learn Next** — category-specific mental model tip

**To wire to an LLM:** Replace the body of `generateAIFeedback()` in `src/lib/analysis.ts`. The function signature and return type stay identical — no callers change.

---

## Question Lab (Free API Integration)

Accessible from Home → Question Lab. Fetches candidate numeric facts from:

1. **World Bank Indicators API** — population, GDP, land area, density
2. **Wikidata SPARQL** — structured factual numeric data
3. **Wikipedia REST API** — article summaries and context
4. **Open Trivia DB** — fallback, estimation framing required

Generated questions are saved to `quanto_generated_questions` and flagged `needsReview: true`. A human must approve them before they enter the main game pool. The approve/reject UI is built into the Question Lab screen.

If all APIs fail, the app falls back silently to the seed question bank.

---

## What's Simulated vs Real

| Feature | MVP State |
|---------|-----------|
| Bell curve peer distribution | Simulated (seeded log-normal) |
| Leaderboard scores | Simulated fake players |
| Daily challenge leaderboard | Simulated fake players |
| Streak tracking | Real (localStorage) |
| Score persistence | Real (localStorage) |
| No-repeat questions | Real (localStorage) |
| Analysis feedback | Real (local deterministic engine) |
| Timer countdown | Real |
| API question fetching | Real (free public APIs) |

---

## Question Bank

100 seed questions across 11 categories, distributed:
- **50% beginner** — anchoring questions, everyday facts
- **35% normal** — geography, business, sports, science
- **15% hard** — large-scale estimates, scientific quantities

All questions include: source name, source URL, explanation, units, and difficulty.

---

## Next Recommended Build Steps

1. **Supabase backend** — swap `storage.ts` implementations; add `user_id` to all records
2. **Real peer scores** — collect guesses server-side; replace simulated bell curve with real distribution
3. **LLM analysis** — wire `generateAIFeedback()` to Claude or OpenAI for richer feedback
4. **Live tournaments** — WebSocket room, real-time guess stream, elimination logic
5. **Social sharing** — shareable result cards (score + bell curve position)
6. **Push notifications** — daily challenge reminder
7. **Onboarding flow** — name entry, difficulty selection, tutorial question
8. **More questions** — automated pipeline: Question Lab → human review → approved pool
