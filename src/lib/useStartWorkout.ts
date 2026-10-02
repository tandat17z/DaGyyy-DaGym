import { useNavigate } from 'react-router-dom'
import { useI18n } from '../locales'
import { todayIso } from './date'
import { useExercises } from './exercises'
import { newWorkout } from './plan'
import { useSession } from './session'
import type { PlanItem } from './types'

/**
 * Starts a workout from plan items and opens `to` (the live overview by default, null = stay);
 * asks before replacing one in progress.
 */
export function useStartWorkout() {
  const { t } = useI18n()
  const session = useSession()
  const { byId } = useExercises()
  const navigate = useNavigate()
  return (opts: { date?: string; name: string; templateId?: string | null; items: PlanItem[] }, to: string | null = '/workout') => {
    if (session.workout && !window.confirm(t('session.replaceConfirm'))) return false
    session.start(newWorkout({ date: opts.date ?? todayIso(), name: opts.name, templateId: opts.templateId, items: opts.items, byId }))
    if (to) navigate(to, { replace: to.startsWith('/workout/') })
    return true
  }
}
