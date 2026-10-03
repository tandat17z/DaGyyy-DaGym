import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AccountGate } from './components/AccountGate'
import { Layout } from './components/Layout'
import { ExercisesProvider } from './components/ExercisesProvider'
import { SessionProvider } from './components/SessionProvider'
import { Dashboard } from './pages/Dashboard'
import { LiveDay, LiveExercise, TemplateDay, TemplateExercise } from './pages/Day'
import { ExerciseDetail, Exercises } from './pages/Exercises'
import { History, WorkoutDetail } from './pages/History'
import { Stats } from './pages/Stats'
import { ProgramDetail, Programs, TemplateEdit } from './pages/Programs'

export default function App() {
  return (
    <BrowserRouter>
      <AccountGate>
        <ExercisesProvider>
          <SessionProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="day/:templateId" element={<TemplateDay />} />
                <Route path="day/:templateId/:index" element={<TemplateExercise />} />
                <Route path="workout" element={<LiveDay />} />
                <Route path="workout/:index" element={<LiveExercise />} />
                <Route path="programs" element={<Programs />} />
                <Route path="programs/:id" element={<ProgramDetail />} />
                <Route path="templates" element={<Navigate to="/programs" replace />} />
                <Route path="templates/:id" element={<TemplateEdit />} />
                <Route path="history" element={<History />} />
                <Route path="history/:id" element={<WorkoutDetail />} />
                <Route path="stats" element={<Stats />} />
                <Route path="exercises" element={<Exercises />} />
                <Route path="exercises/:id" element={<ExerciseDetail />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </SessionProvider>
        </ExercisesProvider>
      </AccountGate>
    </BrowserRouter>
  )
}
