import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { useI18n } from '../locales'
import { IconX } from './icons'

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('min-w-0 rounded-xl border border-border bg-surface p-4 sm:p-5', className)}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold tracking-tight">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function StatTile({ label, value, valueClass, sub, loading }: { label: string; value: ReactNode; valueClass?: string; sub?: ReactNode; loading?: boolean }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-surface px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="truncate font-mono text-[11px] tracking-wider text-subtle uppercase">{label}</div>
      {loading ? (
        <div aria-hidden="true" className="mt-2.5 h-7 w-24 animate-pulse rounded-md bg-surface-2" />
      ) : (
        <div className={cn('mt-1.5 truncate text-lg font-semibold tracking-tight tabular-nums sm:text-2xl', valueClass)}>{value}</div>
      )}
      {sub && <div className="mt-1 truncate text-xs text-subtle">{sub}</div>}
    </div>
  )
}

type Variant = 'primary' | 'ghost' | 'danger' | 'plain'
export function Button({ variant = 'ghost', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50',
        variant === 'primary' && 'bg-accent text-accent-fg hover:opacity-90',
        variant === 'ghost' && 'border border-border-strong text-fg hover:bg-surface-2',
        variant === 'danger' && 'border border-expense/50 text-expense hover:bg-expense/10',
        variant === 'plain' && 'text-muted hover:bg-surface-2 hover:text-fg',
        className,
      )}
    />
  )
}

export function IconButton({ label, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} {...props} className={cn('inline-grid size-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-40', className)}>
      {children}
    </button>
  )
}

export function Label({ text, children, className }: { text: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn('grid gap-1.5 text-xs text-muted', className)}>
      {text}
      {children}
    </label>
  )
}

export function Chip({ active, onClick, children, className }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  const cls = cn(
    'inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs whitespace-nowrap transition-colors',
    active ? 'border-accent/60 bg-accent/15 text-accent' : 'border-border-strong text-muted hover:text-fg',
    className,
  )
  return onClick ? (
    <button type="button" aria-pressed={active} onClick={onClick} className={cls}>
      {children}
    </button>
  ) : (
    <span className={cls}>{children}</span>
  )
}

/** Segmented control. */
export function Tabs<T extends string>({ value, options, onChange, label, className }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string; className?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cn('flex rounded-lg border border-border bg-surface p-0.5', className)}>
      {options.map(([k, text]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={cn('flex-1 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors', value === k ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg')}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid justify-items-center gap-3 rounded-xl border border-dashed border-border-strong px-4 py-8 text-center text-sm text-muted">
      <div>{children}</div>
      {action}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-lg bg-surface-2', className)} />
}

/** Dialog: a bottom sheet on phones, a centred panel from `sm`. Closes on Escape and backdrop click. */
export function Sheet({ open, onClose, title, children, footer, wide, tall }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean; tall?: boolean }) {
  const { t } = useI18n()
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      // React's autoFocus runs before showModal, so focus here. Not on touch screens: the keyboard would cover the sheet.
      if (matchMedia('(pointer: fine)').matches) d.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cn(
        'm-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-2xl border border-border bg-surface p-0 text-fg backdrop:bg-black/60 sm:m-auto sm:rounded-2xl',
        wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        tall && 'h-[92dvh] sm:h-[min(46rem,88dvh)]',
      )}
    >
      {open && (
        <div className={cn('flex max-h-[92dvh] flex-col', tall && 'h-full')}>
          <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="min-w-0 truncate text-base font-semibold">{title}</h2>
            <IconButton label={t('common.close')} onClick={onClose}>
              <IconX />
            </IconButton>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
          {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}

/**
 * Number field that keeps what is being typed ("62," / "") and reports a number or null.
 * `inputMode="decimal"` brings up the number pad on phones; both "," and "." are accepted.
 */
export function NumberInput({ value, onChange, placeholder, className, label, integer, max = 100_000 }: { value: number | null | undefined; onChange: (v: number | null) => void; placeholder?: string; className?: string; label: string; integer?: boolean; max?: number }) {
  const [text, setText] = useState(value == null ? '' : String(value))
  const [focused, setFocused] = useState(false)
  const shown = focused ? text : value == null ? '' : String(value)
  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      aria-label={label}
      placeholder={placeholder}
      value={shown}
      onFocus={(e) => {
        setText(value == null ? '' : String(value))
        setFocused(true)
        e.currentTarget.select()
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const raw = e.target.value.replace(',', '.')
        if (!/^\d*\.?\d*$/.test(raw)) return
        setText(raw)
        if (raw === '' || raw === '.') return onChange(null)
        const n = Math.min(max, integer ? Math.round(Number(raw)) : Number(raw))
        if (Number.isFinite(n)) onChange(n)
      }}
      className={cn('field text-center tabular-nums', className)}
    />
  )
}
