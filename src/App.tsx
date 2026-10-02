import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ExercisesProvider } from './components/ExercisesProvider'
import { SessionProvider } from './components/SessionProvider'
import { ExerciseDetail, Exercises } from './pages/Exercises'
import { History, WorkoutDetail } from './pages/History'
import { Plan } from './pages/Plan'
import { Stats } from './pages/Stats'
import { DayEdit, TemplateEdit, Templates } from './pages/Templates'
import { Today } from './pages/Today'
import { Workout } from './pages/Workout'

export default function App() {
  return (
    <BrowserRouter>
      <ExercisesProvider>
        <SessionProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Today />} />
              <Route path="plan" element={<Plan />} />
              <Route path="plan/:date" element={<DayEdit />} />
              <Route path="templates" element={<Templates />} />
              <Route path="templates/:id" element={<TemplateEdit />} />
              <Route path="workout" element={<Workout />} />
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
    </BrowserRouter>
  )
}
