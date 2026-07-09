export type Category =
  | 'everyday-life'
  | 'geography'
  | 'business'
  | 'food'
  | 'human-body'
  | 'construction'
  | 'sports'
  | 'science'
  | 'objects-volume'
  | 'ratios-density'
  | 'pop-culture'

export type Difficulty = 'beginner' | 'normal' | 'hard'
export type AnswerType = 'exact' | 'estimated' | 'range'

export interface Question {
  id: string
  prompt: string
  category: Category
  answer: number
  answerType: AnswerType
  minAnswer?: number
  maxAnswer?: number
  sourceName: string
  sourceUrl: string
  difficulty: Difficulty
  explanation: string
  units: string
  createdAt: string
  needsReview?: boolean
  generatedBy?: 'seed' | 'api' | 'ai'
}

export interface GuessRecord {
  questionId: string
  guess: number
  actualAnswer: number
  percentError: number
  reasoningText?: string
  timestamp: string
  score: number
  wasTimedOut: boolean
}

export interface UserProfile {
  displayName: string
  totalScore: number
  streak: number
}

export interface StreakData {
  count: number
  lastDailyDate: string | null
}

export interface DailyResult {
  date: string
  questionId: string
  guess: number
  score: number
  percentError: number
  timestamp: string
}

export interface AnalysisFeedback {
  yourMath: string
  missingFactors: string[]
  correctedAssumptions: string[]
  whatToLearnNext: string
}

export interface GeneratedQuestion extends Question {
  needsReview: true
  generatedBy: 'api' | 'ai'
  approved?: boolean
}
