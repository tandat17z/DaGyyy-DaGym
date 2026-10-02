import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiNotice } from '../components/ApiNotice'
import { IconChevronLeft, IconCopy, IconEdit, IconPlay, IconPlus, IconTrash } from '../components/icons'
import { PageHeader } from '../components/Layout'
import { PlanEditor } from '../components/PlanEditor'
import { Button, Card, Empty, Label, Skeleton } from '../components/ui'
import { COLOR_KEYS, colorOf } from '../config/colors'
import { type ApiError, toApiError } from '../lib/api'
import { cn } from '../lib/cn'
import { useExercises } from '../lib/exercises'
import { useFormat } from '../lib/format'
import { deleteTemplate, saveTemplate, useTemplates } from '../lib/storage'
import type { Template } from '../lib/types'
import { useStartWorkout } from '../lib/useStartWorkout'
import { useI18n } from '../locales'

export function Templates() {
  const { t } = useI18n()
  const { muscleName } = useFormat()
  const templates = useTemplates()
  const { byId } = useExercises()
  const start = useStartWorkout()
  const navigate = useNavigate()
  const [error, setError] = useState<ApiError | null>(null)

  const duplicate = async (tpl: Template) => {
    setError(null)
    try {
      const id = crypto.randomUUID()
      await saveTemplate({ ...tpl, id, name: t('templates.copyName', { name: tpl.name }), position: (templates.data?.length ?? 0) + 1 })
      navigate(`/templates/${id}`)
    } catch (e) {
      setError(toApiError(e))
    }
  }

  return (
    <>
      <PageHeader title={t('templates.title')} sub={t('templates.hint')} />
      {(error ?? templates.error) && <ApiNotice error={(error ?? templates.error) as ApiError} onRetry={templates.reload} />}
      <div className="flex justify-end">
        <Link to="/templates/new" className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-accent-fg hover:opacity-90">
          <IconPlus className="size-4" />
          {t('templates.new')}
        </Link>
      </div>
      {templates.loading && !templates.data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : !templates.data?.length ? (
        <Empty action={<Link to="/templates/new" className="text-sm text-accent hover:underline">{t('templates.new')}</Link>}>{t('templates.empty')}</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.data.map((tpl, index) => {
            const c = colorOf(tpl.color)
            const muscles = [...new Set(tpl.items.flatMap((i) => byId.get(i.exerciseId)?.primaryMuscles.slice(0, 1) ?? []))]
            return (
              <section key={tpl.id} className={cn('flex min-w-0 flex-col overflow-hidden rounded-xl border bg-surface', c.border)}>
                <Link to={`/day/${tpl.id}`} className={cn('block flex-1 p-4 hover:bg-surface-2/50', c.soft)}>
                  <div className={cn('font-mono text-[11px] tracking-wider uppercase', c.text)}>{t('day.number', { n: index + 1 })}</div>
                  <h2 className="mt-0.5 min-w-0 truncate text-base font-semibold">{tpl.name}</h2>
                  <p className="mt-1 text-sm text-muted">{t('today.summary', { count: tpl.items.length, sets: tpl.items.reduce((n, i) => n + i.sets.length, 0) })}</p>
                  {muscles.length > 0 && <p className="mt-1 truncate text-xs text-subtle">{muscles.map(muscleName).join(' · ')}</p>}
                  <ul className="mt-3 grid gap-0.5 text-xs text-muted">
                    {tpl.items.slice(0, 4).map((it, i) => (
                      <li key={i} className="truncate">
                        {it.sets.length} × {byId.get(it.exerciseId)?.name ?? it.exerciseId}
                      </li>
                    ))}
                    {tpl.items.length > 4 && <li className="text-subtle">+{tpl.items.length - 4}</li>}
                  </ul>
                </Link>
                <div className="flex gap-1 border-t border-border p-2">
                  <Button variant="plain" className="flex-1" onClick={() => start({ name: tpl.name, templateId: tpl.id, items: tpl.items })}>
                    <IconPlay className="size-4" />
                    {t('templates.start')}
                  </Button>
                  <Button variant="plain" onClick={() => void duplicate(tpl)} aria-label={t('templates.duplicate')} title={t('templates.duplicate')}>
                    <IconCopy className="size-4" />
                  </Button>
                  <Link to={`/templates/${tpl.id}`} aria-label={t('common.edit')} title={t('common.edit')} className="inline-grid place-items-center rounded-lg px-3 text-muted hover:bg-surface-2 hover:text-fg">
                    <IconEdit className="size-4" />
                  </Link>
                </div>
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}

/** Name, colour, note and exercises of one template. `/templates/new` creates one. */
export function TemplateEdit() {
  const { id = 'new' } = useParams()
  const templates = useTemplates()
  if (id !== 'new' && templates.loading && !templates.data) return <Skeleton className="h-64" />
  const existing = templates.data?.find((x) => x.id === id)
  return <TemplateForm key={existing?.id ?? id} existing={existing} position={templates.data?.length ?? 0} notFound={id !== 'new' && !!templates.data && !existing} />
}

function TemplateForm({ existing, position, notFound }: { existing: Template | undefined; position: number; notFound: boolean }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<Template>(() => existing ?? { id: crypto.randomUUID(), name: '', note: '', color: COLOR_KEYS[position % COLOR_KEYS.length] ?? 'c1', items: [], position })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (notFound) return <Empty action={<Link to="/templates" className="text-sm text-accent">{t('common.back')}</Link>}>{t('templates.notFound')}</Empty>

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      await saveTemplate({ ...draft, name: draft.name.trim() || t('templates.untitled') })
      navigate(`/day/${draft.id}`, { replace: true })
    } catch (e) {
      setError(toApiError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Link to="/templates" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
          <IconChevronLeft className="size-4" />
          {t('templates.title')}
        </Link>
      </div>
      <PageHeader title={existing ? t('templates.edit') : t('templates.new')} />
      {error && <ApiNotice error={error} />}
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <Card className="grid gap-4 lg:sticky lg:top-20">
          <Label text={t('templates.name')}>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value.slice(0, 100) })} placeholder={t('templates.namePlaceholder')} className="field" autoFocus={!existing} />
          </Label>
          <div className="grid gap-1.5 text-xs text-muted">
            {t('templates.color')}
            <div className="flex flex-wrap gap-2">
              {COLOR_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-label={k}
                  aria-pressed={draft.color === k}
                  onClick={() => setDraft({ ...draft, color: k })}
                  className={cn('size-7 rounded-full border-2 transition-transform', colorOf(k).dot, draft.color === k ? 'scale-110 border-fg' : 'border-transparent')}
                />
              ))}
            </div>
          </div>
          <Label text={t('templates.note')}>
            <textarea value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value.slice(0, 1000) })} rows={3} className="field resize-none" />
          </Label>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => void save()} disabled={saving} className="flex-1">
              {saving ? t('common.saving') : t('common.save')}
            </Button>
            <Button onClick={() => navigate(-1)}>{t('common.cancel')}</Button>
          </div>
          {existing && (
            <Button
              variant="danger"
              onClick={async () => {
                if (!confirmDelete) return setConfirmDelete(true)
                try {
                  await deleteTemplate(existing.id)
                  navigate('/templates')
                } catch (e) {
                  setError(toApiError(e))
                }
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

