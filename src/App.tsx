import { useState, useCallback } from 'react'
import './index.css'
import HomeScreen from './screens/HomeScreen'
import GameScreen from './screens/GameScreen'
import DailyScreen from './screens/DailyScreen'
import LeaderboardScreen from './screens/LeaderboardScreen'
import HistoryScreen from './screens/HistoryScreen'
import TournamentScreen from './screens/TournamentScreen'
import QuestionLabScreen from './screens/QuestionLabScreen'
import { SEED_QUESTIONS, getShuffledQueueForSession } from './data/questions'
import { getSeenIds } from './services/storage'

export type Screen = 'home' | 'game' | 'daily' | 'leaderboard' | 'history' | 'tournament' | 'questionlab'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [sessionScore, setSessionScore] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)
  const [questionQueue, setQuestionQueue] = useState(() =>
    getShuffledQueueForSession(getSeenIds(), SEED_QUESTIONS)
  )

  const navigate = useCallback((s: Screen) => {
    if (s === 'game' && screen !== 'game') {
      // Refresh queue on each game entry so newly seen questions are excluded
      setQuestionQueue(getShuffledQueueForSession(getSeenIds(), SEED_QUESTIONS))
      setSessionScore(0)
      setSessionCount(0)
    }
    setScreen(s)
  }, [screen])

  const onScoreUpdate = useCallback((delta: number) => {
    setSessionScore((s) => s + delta)
  }, [])

  const onSessionCount = useCallback(() => {
    setSessionCount((c) => c + 1)
  }, [])

  return (
    <div className="app-shell">
      {screen === 'home' && <HomeScreen navigate={navigate} />}
      {screen === 'game' && (
        <GameScreen
          questions={questionQueue}
          navigate={navigate}
          sessionScore={sessionScore}
          onScoreUpdate={onScoreUpdate}
          sessionCount={sessionCount}
          onSessionCount={onSessionCount}
        />
      )}
      {screen === 'daily' && <DailyScreen navigate={navigate} />}
      {screen === 'leaderboard' && <LeaderboardScreen navigate={navigate} />}
      {screen === 'history' && <HistoryScreen navigate={navigate} />}
      {screen === 'tournament' && <TournamentScreen navigate={navigate} />}
      {screen === 'questionlab' && <QuestionLabScreen navigate={navigate} />}
    </div>
  )
}
