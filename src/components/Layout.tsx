import type { ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AppBrand } from '../brand'
import { changelog } from '../config/changelog'
import { API_ME_URL } from '../lib/api'
import { cn } from '../lib/cn'
import { useSession } from '../lib/session'
import { LanguageSwitch, useI18n } from '../locales'
import { DataModeBadge } from './DataModeBadge'
import { IconBook, IconCalendar, IconChart, IconDumbbell, IconHistory, IconHome } from './icons'
import { SessionBar } from './SessionBar'

const WORKSPACE_URL = import.meta.env.VITE_WORKSPACE_URL ?? 'https://me.tandat17z.workers.dev'

type NavKey = 'nav.today' | 'nav.plan' | 'nav.history' | 'nav.stats' | 'nav.exercises'
const NAV: { to: string; label: NavKey; icon: (p: { className?: string }) => ReactNode; also?: string[] }[] = [
  { to: '/', label: 'nav.today', icon: IconHome },
  { to: '/plan', label: 'nav.plan', icon: IconCalendar, also: ['/templates'] },
  { to: '/history', label: 'nav.history', icon: IconHistory },
  { to: '/stats', label: 'nav.stats', icon: IconChart },
  { to: '/exercises', label: 'nav.exercises', icon: IconBook },
]

export function Layout() {
  const { t, locale } = useI18n()
  const { pathname } = useLocation()
  const { workout } = useSession()
  const isActive = (n: (typeof NAV)[number]) => (n.to === '/' ? pathname === '/' : pathname.startsWith(n.to) || !!n.also?.some((p) => pathname.startsWith(p)))

  return (
    <div className="min-h-dvh">
      {/* One sticky header like DaFinance. Phone / tablet: row 1 = brand + account, row 2 = tabs. lg: one row. */}
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 px-4 pt-1.5 sm:px-6 lg:flex-nowrap lg:pt-0">
          <div className="order-1 flex shrink-0 items-center gap-2 whitespace-nowrap sm:gap-3 lg:py-2">
            <a href={WORKSPACE_URL} aria-label={t('app.backToWorkspace')} className="font-mono text-xs text-subtle hover:text-fg">
              ←<span className="hidden xl:inline"> {t('app.workspace')}</span>
            </a>
            <span className="hidden h-4 w-px bg-border-strong sm:block" />
            <AppBrand name="DaGym" logo={<img src="/icon.svg" alt="" className="size-6 rounded-md" />} changelog={changelog} nameClassName="hidden sm:inline" locale={locale} />
            <DataModeBadge />
          </div>
          <nav aria-label={t('nav.label')} className="order-3 -mx-4 flex w-[calc(100%+2rem)] overflow-x-auto [scrollbar-width:none] sm:mx-0 sm:w-full lg:order-2 lg:mx-auto lg:w-auto">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={cn('flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2.5 py-2 text-sm font-medium whitespace-nowrap transition-colors lg:flex-none lg:px-3.5 lg:py-[1.125rem]', isActive(n) ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg')}
              >
                <n.icon className="hidden size-4 sm:block" />
                {t(n.label)}
              </NavLink>
            ))}
            {workout && (
              <NavLink to="/workout" className={cn('flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2.5 py-2 text-sm font-medium whitespace-nowrap text-accent lg:flex-none lg:px-3.5 lg:py-[1.125rem]', pathname === '/workout' ? 'border-accent' : 'border-transparent')}>
                <IconDumbbell className="hidden size-4 sm:block" />
                {t('nav.workout')}
              </NavLink>
            )}
          </nav>
          <div className="order-2 ml-auto flex shrink-0 items-center gap-2 max-sm:[&_summary>span:last-of-type]:hidden max-sm:[&_summary>svg]:hidden sm:gap-3 lg:order-3 lg:ml-0 lg:py-2">
            <LanguageSwitch label={t('lang.label')} />
            <tdz-account key={locale} lang={locale} me-url={API_ME_URL} />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-4 px-4 pt-4 pb-32 sm:px-6 sm:pt-6">
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
