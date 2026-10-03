import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiNotice } from '../components/ApiNotice'
import { IconCheck, IconChevronLeft, IconChevronRight, IconCopy, IconDown, IconEdit, IconPlus, IconTrash, IconUp } from '../components/icons'
import { PageHeader, SectionHeader } from '../components/Layout'
import { PlanEditor } from '../components/PlanEditor'
import { Button, Card, Empty, Label, Sheet, Skeleton } from '../components/ui'
import { COLOR_KEYS, colorOf } from '../config/colors'
import { type ApiError, toApiError } from '../lib/api'
import { cn } from '../lib/cn'
import { useExercises } from '../lib/exercises'
import { moveItem } from '../lib/plan'
import { daysOf, useCurrentProgram } from '../lib/programs'
import { deleteProgram, deleteTemplate, saveProgram, saveTemplate, usePrograms, useTemplates, useWorkouts } from '../lib/storage'
import type { ColorKey, Program, Template } from '../lib/types'
import { useI18n } from '../locales'

// Programs (named lists of workout days) and the workout days (templates) inside them.

function useRun() {
  const [error, setError] = useState<ApiError | null>(null)
  const run = async (fn: () => Promise<void>) => {
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(toApiError(e))
    }
  }
  return { error, run }
}

function ColorPicker({ value, onChange }: { value: ColorKey; onChange: (c: ColorKey) => void }) {
  const { t } = useI18n()
  return (
    <div className="grid gap-1.5 text-xs text-muted">
      {t('templates.color')}
      <div className="flex flex-wrap gap-2">
        {COLOR_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            aria-label={k}
            aria-pressed={value === k}
            onClick={() => onChange(k)}
            className={cn('size-7 rounded-full border-2 transition-transform', colorOf(k).dot, value === k ? 'scale-110 border-fg' : 'border-transparent')}
          />
        ))}
      </div>
    </div>
  )
}

/** Create (no `existing`) or rename / recolour / delete a program. */
function ProgramSheet({ open, onClose, existing, position }: { open: boolean; onClose: () => void; existing?: Program; position: number }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Program>(() => existing ?? { id: crypto.randomUUID(), name: '', note: '', color: COLOR_KEYS[position % COLOR_KEYS.length] ?? 'c1', position })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { error, run } = useRun()
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={existing ? t('programs.edit') : t('programs.new')}
      footer={
        <>
          {existing && (
            <Button
              variant="danger"
              className="mr-auto"
              onClick={() => {
                if (!confirmDelete) return setConfirmDelete(true)
                void run(async () => {
                  await deleteProgram(existing.id)
                  navigate('/programs', { replace: true })
                })
              }}
            >
              <IconTrash className="size-4" />
              {confirmDelete ? t('programs.deleteConfirm') : t('programs.delete')}
            </Button>
          )}
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="primary"
            onClick={() =>
              void run(async () => {
                await saveProgram({ ...draft, name: draft.name.trim() || t('programs.untitled') })
                onClose()
                if (!existing) navigate(`/programs/${draft.id}`)
              })
            }
          >
            {t('common.save')}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {error && <ApiNotice error={error} />}
        <Label text={t('templates.name')}>
          <input data-autofocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value.slice(0, 100) })} placeholder={t('programs.namePlaceholder')} className="field" />
        </Label>
        <ColorPicker value={draft.color} onChange={(color) => setDraft({ ...draft, color })} />
        <Label text={t('templates.note')}>
          <textarea value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value.slice(0, 1000) })} rows={3} className="field resize-none" placeholder={t('programs.notePlaceholder')} />
        </Label>
        {existing && <p className="text-xs text-subtle">{t('programs.deleteHint')}</p>}
      </div>
    </Sheet>
  )
}

export function Programs() {
  const { t } = useI18n()
  const { programs, templates, current, setCurrent } = useCurrentProgram()
  const done = useWorkouts({ status: 'done', limit: 500 })
  const [creating, setCreating] = useState(false)
  const list = programs.data ?? []
  const programOf = new Map((templates.data ?? []).map((x) => [x.id, x.programId]))
  const count = (id: string) => (done.data ?? []).filter((w) => w.templateId && programOf.get(w.templateId) === id).length

  return (
    <>
      <SectionHeader
        section="train"
        sub={t('programs.hint')}
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <IconPlus className="size-4" />
            {t('programs.new')}
          </Button>
        }
      />
      {(programs.error ?? templates.error) && <ApiNotice error={(programs.error ?? templates.error) as ApiError} onRetry={() => [programs, templates].forEach((r) => r.reload())} />}
      {programs.loading && !programs.data ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : !list.length ? (
        <Empty action={<Button onClick={() => setCreating(true)}>{t('programs.new')}</Button>}>{t('programs.empty')}</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => {
            const c = colorOf(p.color)
            const days = daysOf(templates.data, p.id)
            const isCurrent = current?.id === p.id
            return (
              <section key={p.id} className={cn('flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-surface', isCurrent ? c.border : 'border-border')}>
                <Link to={`/programs/${p.id}`} className={cn('block flex-1 p-4 hover:bg-surface-2/50', c.soft)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className={cn('font-mono text-[11px] tracking-wider uppercase', c.text)}>{t('programs.days', { count: days.length })}</div>
                      <h2 className="mt-0.5 truncate text-lg font-semibold">{p.name}</h2>
                    </div>
                    {isCurrent && <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-medium text-accent">{t('programs.current')}</span>}
                  </div>
                  <p className="mt-1 text-xs text-muted">{t('programs.workoutsDone', { count: count(p.id) })}</p>
                  <ol className="mt-3 grid gap-0.5 text-sm text-muted">
                    {days.slice(0, 5).map((d, i) => (
                      <li key={d.id} className="flex min-w-0 gap-2">
                        <span className="w-5 shrink-0 font-mono text-xs text-subtle">{i + 1}</span>
                        <span className="truncate">{d.name}</span>
                      </li>
                    ))}
                    {days.length > 5 && <li className="pl-7 text-xs text-subtle">+{days.length - 5}</li>}
                  </ol>
                </Link>
                <div className="flex gap-1 border-t border-border p-2">
                  <Button variant="plain" className="flex-1" disabled={isCurrent} onClick={() => setCurrent(p.id)}>
                    <IconCheck className="size-4" />
                    {isCurrent ? t('programs.current') : t('programs.makeCurrent')}
                  </Button>
                  <Link to={`/programs/${p.id}`} aria-label={t('common.edit')} title={t('common.edit')} className="inline-grid place-items-center rounded-lg px-3 text-muted hover:bg-surface-2 hover:text-fg">
                    <IconChevronRight className="size-4" />
                  </Link>
                </div>
              </section>
            )
          })}
        </div>
      )}
      {creating && <ProgramSheet open onClose={() => setCreating(false)} position={list.length} />}
    </>
  )
}

export function ProgramDetail() {
  const { id } = useParams()
  const { t } = useI18n()
  const { byId } = useExercises()
  const navigate = useNavigate()
  const { programs, templates, current, setCurrent } = useCurrentProgram()
  const [editing, setEditing] = useState(false)
  const { error, run } = useRun()
  const program = programs.data?.find((p) => p.id === id)
  if (!program) return programs.loading ? <Skeleton className="h-64" /> : <Empty action={<Link to="/programs" className="text-sm text-accent">{t('programs.title')}</Link>}>{t('programs.notFound')}</Empty>

  const c = colorOf(program.color)
  const days = daysOf(templates.data, program.id)
  // Saves the new order as positions 0…n-1.
  const reorder = (i: number, delta: number) =>
    void run(async () => {
      const next = moveItem(days, i, delta)
      await Promise.all(next.map((d, k) => (d.position === k ? null : saveTemplate({ ...d, position: k }))))
    })
  const duplicate = (d: Template) =>
    void run(async () => {
      const copy = crypto.randomUUID()
      await saveTemplate({ ...d, id: copy, name: t('templates.copyName', { name: d.name }), position: days.length })
      navigate(`/templates/${copy}`)
    })

  return (
    <>
      <Link to="/programs" className="inline-flex items-center gap-1 justify-self-start text-sm text-muted hover:text-fg">
        <IconChevronLeft className="size-4" />
        {t('programs.title')}
      </Link>
      <section className={cn('rounded-2xl border p-5', c.border, c.soft)}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={cn('font-mono text-[11px] tracking-wider uppercase', c.text)}>{t('programs.days', { count: days.length })}</div>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{program.name}</h1>
            {program.note && <p className="mt-1 text-sm whitespace-pre-wrap text-muted">{program.note}</p>}
          </div>
          <div className="flex gap-2">
            {current?.id === program.id ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-accent/15 px-3 py-2 text-sm font-medium text-accent">
                <IconCheck className="size-4" />
                {t('programs.current')}
              </span>
            ) : (
              <Button variant="primary" onClick={() => setCurrent(program.id)}>
                {t('programs.makeCurrent')}
              </Button>
            )}
            <Button onClick={() => setEditing(true)} aria-label={t('common.edit')}>
              <IconEdit className="size-4" />
            </Button>
          </div>
        </div>
      </section>
      {error && <ApiNotice error={error} />}

      {!days.length ? (
        <Empty>{t('programs.noDays')}</Empty>
      ) : (
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {days.map((d, i) => {
            const items = d.items.slice(0, 3).map((it) => byId.get(it.exerciseId)?.name ?? it.exerciseId)
            return (
              <li key={d.id} className="flex items-center gap-1 rounded-xl border border-border bg-surface pr-1">
                <Link to={`/day/${d.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-l-xl p-3 hover:bg-surface-2/50">
                  <span className={cn('grid size-10 shrink-0 place-items-center rounded-full font-mono text-sm font-semibold', colorOf(d.color).soft, colorOf(d.color).text)}>{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{d.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {t('today.summary', { count: d.items.length, sets: d.items.reduce((n, it) => n + it.sets.length, 0) })}
                      {items.length > 0 && ` · ${items.join(', ')}`}
                    </span>
                  </span>
                </Link>
                <div className="flex shrink-0 flex-col">
                  <button type="button" disabled={i === 0} onClick={() => reorder(i, -1)} aria-label={t('block.moveUp')} className="grid size-7 place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-fg disabled:opacity-30">
                    <IconUp className="size-4" />
                  </button>
                  <button type="button" disabled={i === days.length - 1} onClick={() => reorder(i, 1)} aria-label={t('block.moveDown')} className="grid size-7 place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-fg disabled:opacity-30">
                    <IconDown className="size-4" />
                  </button>
                </div>
                <button type="button" onClick={() => duplicate(d)} aria-label={t('templates.duplicate')} title={t('templates.duplicate')} className="grid size-9 place-items-center rounded-md text-subtle hover:bg-surface-2 hover:text-fg">
                  <IconCopy className="size-4" />
                </button>
              </li>
            )
          })}
        </ol>
      )}
      <Link to={`/templates/new?program=${program.id}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border-strong px-4 py-3 text-sm font-medium text-muted hover:border-accent hover:text-fg">
        <IconPlus className="size-4" />
        {t('templates.new')}
      </Link>
      {editing && <ProgramSheet open onClose={() => setEditing(false)} existing={program} position={program.position} />}
    </>
  )
}

/** Name, colour, program, note and exercises of one workout day. `/templates/new?program=…` creates one. */
export function TemplateEdit() {
  const { id = 'new' } = useParams()
  const { t } = useI18n()
  const [params] = useSearchParams()
  const templates = useTemplates()
  const programs = usePrograms()
  if ((templates.loading && !templates.data) || (programs.loading && !programs.data)) return <Skeleton className="h-64" />
  const existing = templates.data?.find((x) => x.id === id)
  if (id !== 'new' && !existing) return <Empty action={<Link to="/programs" className="text-sm text-accent">{t('programs.title')}</Link>}>{t('templates.notFound')}</Empty>
  const programId = existing?.programId ?? params.get('program') ?? programs.data?.[0]?.id ?? null
  if (!existing && !programId) return <Navigate to="/programs" replace />
  return <TemplateForm key={existing?.id ?? id} existing={existing} programs={programs.data ?? []} programId={programId} position={daysOf(templates.data, programId ?? undefined).length} />
}

function TemplateForm({ existing, programs, programId, position }: { existing: Template | undefined; programs: Program[]; programId: string | null; position: number }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Template>(() => existing ?? { id: crypto.randomUUID(), programId, name: '', note: '', color: COLOR_KEYS[position % COLOR_KEYS.length] ?? 'c1', items: [], position })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { error, run } = useRun()
  const back = draft.programId ? `/programs/${draft.programId}` : '/programs'

  const save = () =>
    void run(async () => {
      setSaving(true)
      try {
        await saveTemplate({ ...draft, name: draft.name.trim() || t('templates.untitled') })
        navigate(`/day/${draft.id}`, { replace: true })
      } finally {
        setSaving(false)
      }
    })

  return (
    <>
      <Link to={back} className="inline-flex items-center gap-1 justify-self-start text-sm text-muted hover:text-fg">
        <IconChevronLeft className="size-4" />
        {programs.find((p) => p.id === draft.programId)?.name ?? t('programs.title')}
      </Link>
      <PageHeader title={existing ? t('templates.edit') : t('templates.new')} />
      {error && <ApiNotice error={error} />}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Card className="grid gap-4 lg:sticky lg:top-20">
          <Label text={t('templates.name')}>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value.slice(0, 100) })} placeholder={t('templates.namePlaceholder')} className="field" autoFocus={!existing} />
          </Label>
          <Label text={t('programs.program')}>
            <select value={draft.programId ?? ''} onChange={(e) => setDraft({ ...draft, programId: e.target.value || null })} className="field">
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Label>
          <ColorPicker value={draft.color} onChange={(color) => setDraft({ ...draft, color })} />
          <Label text={t('templates.note')}>
            <textarea value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value.slice(0, 1000) })} rows={3} className="field resize-none" />
          </Label>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={save} disabled={saving} className="flex-1">
              {saving ? t('common.saving') : t('common.save')}
            </Button>
            <Button onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
          </div>
          {existing && (
            <Button
              variant="danger"
              onClick={() => {
                if (!confirmDelete) return setConfirmDelete(true)
                void run(async () => {
                  await deleteTemplate(existing.id)
                  navigate(back, { replace: true })
                })
              }}
            >
              <IconTrash className="size-4" />
              {confirmDelete ? t('templates.deleteConfirm') : t('templates.delete')}
            </Button>
          )}
        </Card>
        <PlanEditor items={draft.items} onChange={(items) => setDraft((d) => ({ ...d, items }))} />
      </div>
    </>
  )
}
