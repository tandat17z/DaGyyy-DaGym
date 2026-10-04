import { useEffect, type ReactNode } from 'react'
import { LOCALES, type Locale } from '@tada/kit/i18n'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AppBrand } from '@tada/kit/brand'
import { AppHeader, AppMain, headerTabClass } from '@tada/kit/layout'
import { changelog } from '../config/changelog'
import { API_ACCOUNT_URL, API_FEEDBACK_URL, API_ME_URL, STANDALONE } from '../lib/api'
import { invalidate } from '../lib/storage'
import { cn } from '../lib/cn'
import { useSession } from '../lib/session'
import { useI18n } from '../locales'
import { DataModeBadge } from './DataModeBadge'
import { SettingsLauncher } from './Settings'
import { SessionBar } from './SessionBar'
import { StorageNotice } from './StorageNotice'

// Three sections: Home (dashboard), Train (programs, their workout days, the exercise dictionary)
// and Progress (history, statistics), plus Workout: the workout in progress, or how to start one.
type NavKey = 'nav.home' | 'nav.train' | 'nav.progress'
const NAV: { to: string; label: NavKey; match: string[] }[] = [
  { to: '/', label: 'nav.home', match: [] },
  { to: '/programs', label: 'nav.train', match: ['/programs', '/templates', '/day/', '/exercises'] },
  { to: '/history', label: 'nav.progress', match: ['/history', '/stats'] },
]

/** Pages of a section, shown as the title row of each one. */
const SECTIONS = {
  train: [
    ['/programs', 'programs.title'],
    ['/exercises', 'exercises.title'],
  ],
  progress: [
    ['/history', 'history.title'],
    ['/stats', 'stats.title'],
  ],
} as const

/** The dumbbell of public/icon.svg, in the logo mark's colour. */
const DumbbellIcon = () => (
  <svg viewBox="8 14 48 36" fill="currentColor" aria-hidden="true">
    <rect x="10" y="22" width="7" height="20" rx="2" />
    <rect x="18" y="17" width="7" height="30" rx="2" />
    <rect x="39" y="17" width="7" height="30" rx="2" />
    <rect x="47" y="22" width="7" height="20" rx="2" />
    <rect x="25" y="29" width="14" height="6" rx="1" />
  </svg>
)

export function Layout() {
  const { t, locale, setLocale } = useI18n()
  const { pathname } = useLocation()
  const { workout } = useSession()
  // Language picked in the account menu: switch in place instead of following a link.
  useEffect(() => {
    const onLanguage = (e: Event) => {
      const code = (e as CustomEvent<{ code: string }>).detail.code
      if (!(code in LOCALES)) return
      e.preventDefault()
      setLocale(code as Locale)
    }
    window.addEventListener('tdz-account:language', onLanguage)
    return () => window.removeEventListener('tdz-account:language', onLanguage)
  }, [setLocale])
  // A new page starts at the top (BrowserRouter keeps the scroll position otherwise).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  const isActive = (n: (typeof NAV)[number]) => (n.to === '/' ? pathname === '/' : n.match.some((p) => pathname.startsWith(p)))
  const live = pathname.startsWith('/workout')

  return (
    <div className="min-h-dvh">
      <AppHeader
        brand={
          <>
            <AppBrand name="DaGym" shortName="DaGyyy" icon={<DumbbellIcon />} changelog={changelog} nameClassName="hidden sm:inline" locale={locale} />
            <DataModeBadge />
          </>
        }
        navProps={{ role: 'navigation', 'aria-label': t('nav.label') }}
        nav={
          <>
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={headerTabClass(isActive(n))}>
                {t(n.label)}
              </NavLink>
            ))}
            {/* Always there; the dot shows a workout in progress. */}
            <NavLink to="/workout" className={headerTabClass(live, cn('flex items-center justify-center gap-1.5', workout && !live && 'text-accent'))}>
              {workout && <span className="size-1.5 animate-pulse rounded-full bg-accent" />}
              {t('nav.workout')}
            </NavLink>
          </>
        }
        account={
          <>
            <SettingsLauncher button={STANDALONE} />
            {!STANDALONE && <tdz-account key={locale} lang={locale} me-url={API_ME_URL} account-url={API_ACCOUNT_URL} feedback-url={API_FEEDBACK_URL} languages={Object.keys(LOCALES).join(';')} settings />}
          </>
        }
      />

      <AppMain className="pb-32">
        <StorageNotice onMoved={() => invalidate('/')} />
        <Outlet />
      </AppMain>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <SessionBar />
      </div>
    </div>
  )
}

/** Page title row with optional actions on the right. */
export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Title row of a section page: its sibling pages as tabs (the current one is the heading). */
export function SectionHeader({ section, sub, actions }: { section: keyof typeof SECTIONS; sub?: ReactNode; actions?: ReactNode }) {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const pages = SECTIONS[section]
  const current = pages.find(([to]) => pathname.startsWith(to))
  return (
    <div className="grid gap-3">
      <nav aria-label={t(section === 'train' ? 'nav.train' : 'nav.progress')} className="flex rounded-lg border border-border bg-surface p-0.5 sm:max-w-xs">
        {pages.map(([to, label]) => (
          <Link
            key={to}
            to={to}
            aria-current={current?.[0] === to ? 'page' : undefined}
            className={cn('flex-1 rounded-md px-3 py-1.5 text-center text-sm transition-colors', current?.[0] === to ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg')}
          >
            {t(label)}
          </Link>
        ))}
      </nav>
      {(sub || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="sr-only">{current ? t(current[1]) : ''}</h1>
          {sub && <p className="min-w-0 text-sm text-muted">{sub}</p>}
          {actions && <div className="ml-auto flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {!(sub || actions) && <h1 className="sr-only">{current ? t(current[1]) : ''}</h1>}
    </div>
  )
}
