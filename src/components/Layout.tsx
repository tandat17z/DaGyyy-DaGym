import { useEffect, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AppBrand } from '../brand'
import { changelog } from '../config/changelog'
import { API_ACCOUNT_URL, API_ME_URL, STANDALONE } from '../lib/api'
import { invalidate } from '../lib/storage'
import { cn } from '../lib/cn'
import { useSession } from '../lib/session'
import { LanguageSwitch, useI18n } from '../locales'
import { DataModeBadge } from './DataModeBadge'
import { SessionBar } from './SessionBar'
import { StorageNotice } from './StorageNotice'

/** Workspace hub for the back link; hidden when unset (standalone copies). */
const WORKSPACE_URL = import.meta.env.VITE_WORKSPACE_URL as string | undefined

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

export function Layout() {
  const { t, locale } = useI18n()
  const { pathname } = useLocation()
  const { workout } = useSession()
  // A new page starts at the top (BrowserRouter keeps the scroll position otherwise).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  const isActive = (n: (typeof NAV)[number]) => (n.to === '/' ? pathname === '/' : n.match.some((p) => pathname.startsWith(p)))
  const live = pathname.startsWith('/workout')

  return (
    <div className="min-h-dvh">
      {/* One slim sticky header like DaFinance. Phone / tablet: row 1 = brand + account, row 2 = tabs.
          lg: a single row. xl: tabs centred on the page. */}
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-0 px-4 pt-1.5 sm:px-6 lg:flex-nowrap lg:gap-x-4 lg:pt-0 xl:grid xl:grid-cols-[1fr_auto_1fr]">
          <div className="order-1 flex shrink-0 items-center gap-2 whitespace-nowrap sm:gap-3 lg:py-2">
            {WORKSPACE_URL && (
              <>
                <a href={WORKSPACE_URL} aria-label={t('app.backToWorkspace')} className="font-mono text-xs text-subtle hover:text-fg">
                  ←<span className="hidden 2xl:inline"> {t('app.workspace')}</span>
                </a>
                <span className="hidden h-4 w-px bg-border-strong sm:block" />
              </>
            )}
            <AppBrand name="DaGym" logo={<img src="/icon.svg" alt="" className="size-6 rounded-md" />} changelog={changelog} nameClassName="hidden sm:inline" locale={locale} />
            <DataModeBadge />
          </div>
          <nav aria-label={t('nav.label')} className="order-3 flex w-full justify-center sm:gap-1 lg:order-2 lg:mx-auto lg:w-auto xl:justify-self-center">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={cn('flex-1 border-b-2 px-2 py-1.5 text-center text-sm font-medium whitespace-nowrap transition-colors sm:px-5 lg:flex-none lg:px-3.5 lg:py-[1.125rem] xl:px-5', isActive(n) ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg')}
              >
                {t(n.label)}
              </NavLink>
            ))}
            {/* Always there; the dot shows a workout in progress. */}
            <NavLink
              to="/workout"
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-1.5 text-sm font-medium whitespace-nowrap transition-colors sm:px-5 lg:flex-none lg:px-3.5 lg:py-[1.125rem] xl:px-5',
                live ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg',
                workout && !live && 'text-accent',
              )}
            >
              {workout && <span className="size-1.5 animate-pulse rounded-full bg-accent" />}
              {t('nav.workout')}
            </NavLink>
          </nav>
          <div className="order-2 ml-auto flex shrink-0 items-center gap-2 max-sm:[&_summary>span:last-of-type]:hidden max-sm:[&_summary>svg]:hidden sm:gap-3 lg:order-3 lg:py-2 xl:justify-self-end">
            <LanguageSwitch label={t('lang.label')} />
            {!STANDALONE && <tdz-account key={locale} lang={locale} me-url={API_ME_URL} account-url={API_ACCOUNT_URL} />}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-5 px-4 pt-4 pb-32 sm:px-6 sm:pt-6">
        <StorageNotice onMoved={() => invalidate('/')} />
        <Outlet />
      </main>

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
