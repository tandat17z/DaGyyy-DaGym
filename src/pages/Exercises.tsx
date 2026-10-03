import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiNotice } from '../components/ApiNotice'
import { BarChart } from '../components/charts'
import { ExerciseImage } from '../components/ExerciseImage'
import { IconChevronLeft, IconEdit, IconPlus, IconSearch, IconTrash } from '../components/icons'
import { SectionHeader } from '../components/Layout'
import { MuscleMap } from '../components/MuscleMap'
import { Button, Card, Chip, Empty, Label, Sheet, Skeleton, StatTile } from '../components/ui'
import { CATEGORIES, EQUIPMENT, LEVELS, MUSCLES, TRACKING_TYPES } from '../config/muscles'
import { type ApiError, toApiError } from '../lib/api'
import { cn } from '../lib/cn'
import { searchable, useExercises } from '../lib/exercises'
import { useFormat } from '../lib/format'
import { e1rm, loggedExerciseFor, planItemFor } from '../lib/plan'
import { useSession } from '../lib/session'
import { deleteCustomExercise, saveCustomExercise, saveTemplate, useExerciseHistory, usePrograms, useTemplates } from '../lib/storage'
import type { CustomExerciseInput, Exercise, TrackingType } from '../lib/types'
import { useI18n } from '../locales'

const PAGE = 60

export function Exercises() {
  const { t } = useI18n()
  const { muscleName, equipmentName, levelName, categoryName } = useFormat()
  const { list, loading, catalogError, customError } = useExercises()
  const [params, setParams] = useSearchParams()
  const [limit, setLimit] = useState(PAGE)
  const [creating, setCreating] = useState(false)
  // The muscle map is big: open by default on wide screens only.
  const [showMap, setShowMap] = useState(() => matchMedia('(min-width: 1024px)').matches)
  const q = params.get('q') ?? ''
  const muscle = params.get('muscle')
  const equipment = params.get('equipment') ?? ''
  const level = params.get('level') ?? ''
  const category = params.get('category') ?? ''
  const mine = params.get('mine') === '1'

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
    setLimit(PAGE)
  }

  const matches = useMemo(() => {
    const needle = searchable(q.trim())
    return list.filter(
      (e) =>
        (!muscle || e.primaryMuscles.includes(muscle) || e.secondaryMuscles.includes(muscle)) &&
        (!equipment || e.equipment === equipment) &&
        (!level || e.level === level) &&
        (!category || e.category === category) &&
        (!mine || e.custom) &&
        (!needle || (searchable(e.name).includes(needle) || searchable(e.altName).includes(needle))),
    )
  }, [list, q, muscle, equipment, level, category, mine])
  // Exercises working the muscle as their main target first.
  const sorted = muscle ? [...matches].sort((a, b) => Number(b.primaryMuscles.includes(muscle)) - Number(a.primaryMuscles.includes(muscle))) : matches

  return (
    <>
      <SectionHeader
        section="train"
        sub={loading ? t('common.loading') : t('exercises.count', { count: matches.length })}
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <IconPlus className="size-4" />
            {t('exercises.create')}
          </Button>
        }
      />
      {catalogError && <p className="rounded-xl border border-expense/40 bg-expense/5 p-4 text-sm">{t('exercises.catalogError')}</p>}
      {customError && <ApiNotice error={customError} />}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="grid gap-3 lg:sticky lg:top-20">
          <label className="relative">
            <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
            <input type="search" value={q} onChange={(e) => setParam('q', e.target.value)} placeholder={t('exercises.search')} aria-label={t('exercises.search')} className="field pl-9" />
          </label>
          <div className="rounded-xl border border-border bg-surface p-3">
            <button type="button" onClick={() => setShowMap(!showMap)} className="flex w-full items-center justify-between text-xs text-muted">
              <span>{muscle ? muscleName(muscle) : t('exercises.pickMuscle')}</span>
              <span className="text-subtle">{showMap ? '−' : '+'}</span>
            </button>
            {showMap && <MuscleMap selected={muscle} onSelect={(m) => setParam('muscle', m)} className="mx-auto mt-2 w-full max-w-60" />}
          </div>
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0">
            <Chip active={!muscle} onClick={() => setParam('muscle', null)}>
              {t('exercises.allMuscles')}
            </Chip>
            {MUSCLES.map((m) => (
              <Chip key={m} active={muscle === m} onClick={() => setParam('muscle', muscle === m ? null : m)}>
                {muscleName(m)}
              </Chip>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
            <select value={equipment} onChange={(e) => setParam('equipment', e.target.value)} className="field py-1.5" aria-label={t('exercises.equipment')}>
              <option value="">{t('exercises.allEquipment')}</option>
              {EQUIPMENT.map((x) => (
                <option key={x} value={x}>
                  {equipmentName(x)}
                </option>
              ))}
            </select>
            <select value={level} onChange={(e) => setParam('level', e.target.value)} className="field py-1.5" aria-label={t('exercises.level')}>
              <option value="">{t('exercises.allLevels')}</option>
              {LEVELS.map((x) => (
                <option key={x} value={x}>
                  {levelName(x)}
                </option>
              ))}
            </select>
            <select value={category} onChange={(e) => setParam('category', e.target.value)} className="field py-1.5" aria-label={t('exercises.category')}>
              <option value="">{t('exercises.allCategories')}</option>
              {CATEGORIES.map((x) => (
                <option key={x} value={x}>
                  {categoryName(x)}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={mine} onChange={(e) => setParam('mine', e.target.checked ? '1' : null)} className="accent-[var(--accent)]" />
            {t('exercises.onlyCustom')}
          </label>
        </aside>

        <div className="min-w-0">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="aspect-[4/5]" />
              ))}
            </div>
          ) : !sorted.length ? (
            <Empty>{t('exercises.none')}</Empty>
          ) : (
            <>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {sorted.slice(0, limit).map((e) => (
                  <li key={e.id}>
                    <Link to={`/exercises/${encodeURIComponent(e.id)}`} className="group block overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-border-strong">
                      <ExerciseImage exercise={e} className="aspect-[4/3] w-full" />
                      <div className="p-2.5">
                        <div className="line-clamp-2 min-h-10 text-sm leading-5 font-medium group-hover:text-accent">{e.name}</div>
                        <div className="mt-1 truncate text-xs text-subtle">
                          {[muscleName(e.primaryMuscles[0] ?? ''), equipmentName(e.equipment)].filter(Boolean).join(' · ')}
                        </div>
                        {e.custom && <span className="mt-1.5 inline-block rounded-full bg-accent/15 px-2 py-px text-[10px] text-accent">{t('exercises.custom')}</span>}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              {sorted.length > limit && (
                <div className="mt-4 text-center">
                  <Button onClick={() => setLimit((l) => l + PAGE)}>{t('common.showMore', { count: sorted.length - limit })}</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {creating && <CustomExerciseForm onClose={() => setCreating(false)} />}
    </>
  )
}

/** Create or edit a custom exercise (stored in the API, shown with the catalog). */
function CustomExerciseForm({ existing, onClose }: { existing?: Exercise; onClose: () => void }) {
  const { t } = useI18n()
  const { muscleName, equipmentName, categoryName, trackingName } = useFormat()
  const navigate = useNavigate()
  const [f, setF] = useState<CustomExerciseInput>(() => ({
    name: existing?.name ?? '',
    category: existing?.category ?? 'strength',
    trackingType: existing?.trackingType ?? 'reps_weight',
    primaryMuscles: existing?.primaryMuscles ?? [],
    secondaryMuscles: existing?.secondaryMuscles ?? [],
    equipment: existing?.equipment ?? null,
    imageUrl: existing?.images[0] ?? null,
    instructions: existing?.instructions ?? [],
  }))
  const [steps, setSteps] = useState((existing?.instructions ?? []).join('\n'))
  const [error, setError] = useState<ApiError | null>(null)
  const [saving, setSaving] = useState(false)

  const toggleMuscle = (key: 'primaryMuscles' | 'secondaryMuscles', m: string) =>
    setF((x) => ({ ...x, [key]: x[key].includes(m) ? x[key].filter((y) => y !== m) : [...x[key], m] }))

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const id = existing?.id ?? crypto.randomUUID()
      await saveCustomExercise(id, {
        ...f,
        name: f.name.trim(),
        imageUrl: f.imageUrl?.trim() || null,
        instructions: steps
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 30),
      })
      onClose()
      if (!existing) navigate(`/exercises/${id}`)
    } catch (e) {
      setError(toApiError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={existing ? t('exercises.editCustom') : t('exercises.create')}
      wide
      footer={
        <>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" disabled={saving || !f.name.trim()} onClick={() => void save()}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error && <ApiNotice error={error} />}
        <Label text={t('exercises.name')}>
          <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value.slice(0, 120) })} className="field" data-autofocus placeholder={t('exercises.namePlaceholder')} />
        </Label>
        <div className="grid gap-3 sm:grid-cols-3">
          <Label text={t('block.tracking')}>
            <select value={f.trackingType} onChange={(e) => setF({ ...f, trackingType: e.target.value as TrackingType })} className="field">
              {TRACKING_TYPES.map((k) => (
                <option key={k} value={k}>
                  {trackingName(k)}
                </option>
              ))}
            </select>
          </Label>
          <Label text={t('exercises.equipment')}>
            <select value={f.equipment ?? ''} onChange={(e) => setF({ ...f, equipment: e.target.value || null })} className="field">
              <option value="">—</option>
              {EQUIPMENT.map((x) => (
                <option key={x} value={x}>
                  {equipmentName(x)}
                </option>
              ))}
            </select>
          </Label>
          <Label text={t('exercises.category')}>
            <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} className="field">
              {CATEGORIES.map((x) => (
                <option key={x} value={x}>
                  {categoryName(x)}
                </option>
              ))}
            </select>
          </Label>
        </div>
        {(['primaryMuscles', 'secondaryMuscles'] as const).map((key) => (
          <div key={key} className="grid gap-1.5 text-xs text-muted">
            {t(key === 'primaryMuscles' ? 'exercises.primary' : 'exercises.secondary')}
            <div className="flex flex-wrap gap-1.5">
              {MUSCLES.map((m) => (
                <Chip key={m} active={f[key].includes(m)} onClick={() => toggleMuscle(key, m)}>
                  {muscleName(m)}
                </Chip>
              ))}
            </div>
          </div>
        ))}
        <Label text={t('exercises.imageUrl')}>
          <input type="url" value={f.imageUrl ?? ''} onChange={(e) => setF({ ...f, imageUrl: e.target.value })} className="field" placeholder="https://…" />
        </Label>
        <Label text={t('exercises.instructions')}>
          <textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={4} className="field" placeholder={t('exercises.instructionsPlaceholder')} />
        </Label>
      </div>
    </Sheet>
  )
}

export function ExerciseDetail() {
  const { id = '' } = useParams()
  const { byId, loading } = useExercises()
  const { t } = useI18n()
  const exercise = byId.get(id)
  if (loading && !exercise) return <Skeleton className="h-96" />
  if (!exercise)
    return (
      <Empty action={<Link to="/exercises" className="text-sm text-accent hover:underline">{t('exercises.title')}</Link>}>
        {t('exercises.notFound')}
      </Empty>
    )
  return <Detail key={exercise.id} exercise={exercise} />
}

function Detail({ exercise: e }: { exercise: Exercise }) {
  const { t } = useI18n()
  const { muscleName, equipmentName, levelName, categoryName, trackingName, formatKg, formatSet, formatDayShort, formatSeconds, formatNumber, formatDate } = useFormat()
  const navigate = useNavigate()
  const history = useExerciseHistory(e.id)
  const templates = useTemplates()
  const programs = usePrograms()
  const session = useSession()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const rec = history.data?.records
  const sessions = history.data?.sessions ?? []
  const type = e.trackingType

  // Progress chart: best set per session, oldest → newest.
  const metricOf = (s: (typeof sessions)[number]) =>
    type === 'reps_weight' ? Math.max(0, ...s.sets.map((x) => e1rm(x.reps, x.weight))) : type === 'reps' ? s.records.maxReps : type === 'time' ? s.records.maxSeconds : s.records.maxDistance
  const metricText = (v: number) => (type === 'reps_weight' ? formatKg(v) : type === 'time' ? formatSeconds(v) : type === 'reps' ? t('unit.reps', { count: v }) : `${formatNumber(v)} km`)
  const bars = [...sessions].reverse().map((s) => ({ key: s.workoutId, label: formatDayShort(s.date), value: metricOf(s), title: `${formatDate(s.date)}: ${metricText(metricOf(s))}` }))

  const run = async (fn: () => Promise<void>) => {
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(toApiError(err))
    }
  }

  return (
    <>
      <Link to="/exercises" className="inline-flex items-center gap-1 justify-self-start text-sm text-muted hover:text-fg">
        <IconChevronLeft className="size-4" />
        {t('exercises.title')}
      </Link>
      {error && <ApiNotice error={error} />}
      {notice && <div role="status" className="rounded-xl border border-income/40 bg-income/10 px-4 py-2.5 text-sm">{notice}</div>}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="grid gap-4 lg:sticky lg:top-20">
          <ExerciseImage exercise={e} animate className="aspect-[4/3] w-full rounded-xl border border-border" />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" className="flex-1" onClick={() => setAdding(true)}>
              <IconPlus className="size-4" />
              {t('exercises.addTo')}
            </Button>
            {e.custom && (
              <>
                <Button onClick={() => setEditing(true)} aria-label={t('common.edit')}>
                  <IconEdit className="size-4" />
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (!confirmDelete) return setConfirmDelete(true)
                    void run(async () => {
                      await deleteCustomExercise(e.id)
                      navigate('/exercises')
                    })
                  }}
                >
                  <IconTrash className="size-4" />
                  {confirmDelete && t('exercises.deleteConfirm')}
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{e.name}</h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {e.primaryMuscles.map((m) => (
                <Chip key={m} active onClick={() => navigate(`/exercises?muscle=${encodeURIComponent(m)}`)}>
                  {muscleName(m)}
                </Chip>
              ))}
              {e.secondaryMuscles.map((m) => (
                <Chip key={m} onClick={() => navigate(`/exercises?muscle=${encodeURIComponent(m)}`)}>
                  {muscleName(m)}
                </Chip>
              ))}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              {[
                [t('exercises.equipment'), equipmentName(e.equipment) || '—'],
                [t('exercises.level'), levelName(e.level) || '—'],
                [t('exercises.category'), categoryName(e.category)],
                [t('block.tracking'), trackingName(type)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-mono text-[10px] tracking-wider text-subtle uppercase">{k}</dt>
                  <dd className="truncate">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <Card title={t('exercises.yourRecords')}>
            {history.loading && !history.data ? (
              <Skeleton className="h-20" />
            ) : !sessions.length ? (
              <p className="text-sm text-muted">{t('exercises.noHistory')}</p>
            ) : (
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {type === 'reps_weight' && (
                    <>
                      <StatTile label={t('records.maxWeight')} value={formatKg(rec?.maxWeight ?? 0)} />
                      <StatTile label={t('records.e1rm')} value={formatKg(rec?.bestE1rm ?? 0)} />
                      <StatTile label={t('records.maxSetVolume')} value={formatKg(rec?.maxSetVolume ?? 0)} />
                    </>
                  )}
                  {type === 'reps' && <StatTile label={t('records.maxReps')} value={rec?.maxReps ?? 0} />}
                  {type === 'time' && <StatTile label={t('records.maxSeconds')} value={formatSeconds(rec?.maxSeconds ?? 0)} />}
                  {type === 'distance_time' && <StatTile label={t('records.maxDistance')} value={`${formatNumber(rec?.maxDistance ?? 0)} km`} />}
                  <StatTile label={t('records.sessions')} value={sessions.length} />
                </div>
                {bars.length > 1 && (
                  <div>
                    <div className="mb-2 text-xs text-muted">{type === 'reps_weight' ? t('records.progressE1rm') : t('records.progress')}</div>
                    <BarChart bars={bars} height={120} />
                  </div>
                )}
                <ul className="grid gap-1.5">
                  {sessions.slice(0, 8).map((s) => (
                    <li key={s.workoutId}>
                      <Link to={`/history/${s.workoutId}`} className="flex gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                        <span className="w-12 shrink-0 text-subtle">{formatDayShort(s.date)}</span>
                        <span className="min-w-0 flex-1 truncate font-mono text-xs leading-5 text-muted tabular-nums">{s.sets.map((x) => formatSet(x, type)).join(' · ')}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {e.instructions.length > 0 && (
            <Card title={t('exercises.instructions')}>
              <ol className="grid list-decimal gap-2 pl-5 text-sm leading-relaxed text-muted marker:text-subtle">
                {e.instructions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              {!e.custom && <p className="mt-3 text-xs text-subtle">{t('exercises.source')}</p>}
            </Card>
          )}
        </div>
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title={t('exercises.addTo')}>
        <div className="grid gap-1.5">
          {session.workout && (
            <button
              type="button"
              onClick={() => {
                session.update((w) => ({ ...w, exercises: [...w.exercises, loggedExerciseFor(planItemFor(e), e)] }))
                setAdding(false)
                navigate('/workout')
              }}
              className="rounded-lg border border-accent/60 bg-accent/10 px-3 py-2.5 text-left text-sm hover:bg-accent/15"
            >
              {t('exercises.addToWorkout')}
            </button>
          )}
          {(templates.data ?? []).map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() =>
                void run(async () => {
                  await saveTemplate({ ...tpl, items: [...tpl.items, planItemFor(e)] })
                  setAdding(false)
                  setNotice(t('exercises.addedTo', { name: tpl.name }))
                })
              }
              className={cn('rounded-lg border border-border px-3 py-2.5 text-left text-sm hover:border-border-strong')}
            >
              {(programs.data?.length ?? 0) > 1 && <span className="text-subtle">{programs.data?.find((p) => p.id === tpl.programId)?.name} · </span>}
              {tpl.name}
              <span className="ml-2 text-xs text-subtle">{t('today.summary', { count: tpl.items.length, sets: tpl.items.reduce((n, i) => n + i.sets.length, 0) })}</span>
            </button>
          ))}
          {!templates.data?.length && !session.workout && <p className="text-sm text-muted">{t('templates.empty')}</p>}
        </div>
      </Sheet>
      {editing && <CustomExerciseForm existing={e} onClose={() => setEditing(false)} />}
    </>
  )
}
