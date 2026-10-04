import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LOCALES, type Locale } from '@tada/kit/i18n'
import { ThemePicker } from '@tada/kit/theme'
import { updateSettings, useSettings } from '../lib/settings'
import { cn } from '../lib/cn'
import { useI18n } from '../locales'

/**
 * Opens the settings drawer: from the account menu's Settings item ("tdz-account:settings"),
 * or, with `button` (standalone, no account menu), from a gear button in the header.
 */
export function SettingsLauncher({ button }: { button?: boolean }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener('tdz-account:settings', onOpen)
    return () => window.removeEventListener('tdz-account:settings', onOpen)
  }, [])
  return (
    <>
      {button && (
        <button
          type="button"
          aria-label={t('settings.open')}
          title={t('settings.open')}
          onClick={() => setOpen(true)}
          className="grid size-8 place-items-center rounded-full border border-border-strong bg-surface-2 text-muted transition-colors hover:text-fg"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
          </svg>
        </button>
      )}
      {open && <SettingsPanel onClose={() => setOpen(false)} />}
    </>
  )
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { t, locale, setLocale } = useI18n()
  const { theme } = useSettings()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !(e.target instanceof HTMLInputElement) && onClose()
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return createPortal(
    <>
      <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-40 bg-black/50" />
      <aside role="dialog" aria-modal="true" aria-label={t('settings.title')} className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border-strong bg-surface pt-[env(safe-area-inset-top)] shadow-2xl shadow-black/40">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold tracking-tight">{t('settings.title')}</h2>
          <button type="button" autoFocus onClick={onClose} aria-label={t('settings.close')} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-fg">
            ✕
          </button>
        </header>

        <div className="grid flex-1 content-start gap-7 overflow-y-auto px-5 py-5 [scrollbar-width:thin]">
          <section className="grid gap-3">
            <h3 className="font-mono text-[11px] tracking-wider text-subtle uppercase">{t('lang.label')}</h3>
            <div role="radiogroup" aria-label={t('lang.label')} className="grid grid-cols-2 gap-2">
              {(Object.keys(LOCALES) as Locale[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={locale === l}
                  onClick={() => setLocale(l)}
                  className={cn('flex items-center gap-3 rounded-xl border p-3 text-left text-sm transition-colors', locale === l ? 'border-accent bg-accent/10' : 'border-border hover:border-border-strong')}
                >
                  <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-surface-2 font-mono text-xs font-semibold">
                    {LOCALES[l].code}
                  </span>
                  {LOCALES[l].label}
                </button>
              ))}
            </div>
          </section>

          <ThemePicker value={theme} onChange={(next) => updateSettings((s) => ({ ...s, theme: next }))} locale={locale} />

        </div>
      </aside>
    </>,
    document.body,
  )
}
