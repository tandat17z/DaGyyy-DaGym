// Local calendar dates as YYYY-MM-DD strings (never UTC: a late-evening workout stays on its day).
// Weeks start on Monday; weekday index 0 = Monday … 6 = Sunday (same as the API).

const pad = (n: number) => String(n).padStart(2, '0')

export const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const dateOf = (iso: string) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)))

export const todayIso = () => isoOf(new Date())

export function addDays(iso: string, n: number): string {
  const d = dateOf(iso)
  d.setDate(d.getDate() + n)
  return isoOf(d)
}

/** 0 = Monday … 6 = Sunday. */
export const weekdayOf = (iso: string) => (dateOf(iso).getDay() + 6) % 7

export const startOfWeek = (iso: string) => addDays(iso, -weekdayOf(iso))

export const startOfMonth = (iso: string) => `${iso.slice(0, 7)}-01`

export function endOfMonth(iso: string): string {
  const d = dateOf(startOfMonth(iso))
  return isoOf(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

export function addMonths(iso: string, n: number): string {
  const d = dateOf(startOfMonth(iso))
  return isoOf(new Date(d.getFullYear(), d.getMonth() + n, 1))
}

/** Every date from `from` to `to`, inclusive. */
export function eachDay(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}

export const daysBetween = (from: string, to: string) => Math.round((dateOf(to).getTime() - dateOf(from).getTime()) / 86_400_000)

export type PeriodUnit = 'week' | 'month' | 'quarter' | 'year'

/** [from, to] of the period of `unit` containing `anchor`. Quarter = the 3 months ending with the anchor's month. */
export function periodRange(unit: PeriodUnit, anchor: string): [string, string] {
  if (unit === 'week') {
    const from = startOfWeek(anchor)
    return [from, addDays(from, 6)]
  }
  if (unit === 'month') return [startOfMonth(anchor), endOfMonth(anchor)]
  if (unit === 'quarter') return [addMonths(anchor, -2), endOfMonth(anchor)]
  return [`${anchor.slice(0, 4)}-01-01`, `${anchor.slice(0, 4)}-12-31`]
}

export function shiftPeriod(unit: PeriodUnit, anchor: string, delta: number): string {
  if (unit === 'week') return addDays(anchor, 7 * delta)
  if (unit === 'month') return addMonths(anchor, delta)
  if (unit === 'quarter') return addMonths(anchor, 3 * delta)
  return addMonths(anchor, 12 * delta)
}
