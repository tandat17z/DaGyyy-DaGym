import { useMemo } from 'react'
import { keyOf } from '../config/muscles'
import { useI18n } from '../locales'
import { dateOf } from './date'
import type { SetValues, TrackingType } from './types'

/** "1:05:23" / "4:07" — for running clocks. */
export function clock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Locale-aware formatters; call `useFormat()` in a component and destructure what you need. */
export function useFormat() {
  const { intl, t, tOr } = useI18n()
  return useMemo(() => {
    const num = new Intl.NumberFormat(intl, { maximumFractionDigits: 1 })
    const formatNumber = (n: number) => num.format(n)
    const formatKg = (n: number) => `${num.format(n)} kg`
    /** 1h 05m / 45 phút */
    const formatDuration = (sec: number) => {
      const m = Math.round(sec / 60)
      if (m < 60) return t('unit.minutes', { n: m })
      return t('unit.hoursMinutes', { h: Math.floor(m / 60), m: String(m % 60).padStart(2, '0') })
    }
    const formatSeconds = (sec: number) => (sec >= 60 ? clock(sec) : t('unit.seconds', { n: sec }))
    /** One set as text: "60 kg × 8", "12 reps", "45 s", "2,5 km · 12:30". */
    const formatSet = (s: SetValues, type: TrackingType) => {
      if (type === 'time') return s.seconds ? formatSeconds(s.seconds) : '—'
      if (type === 'distance_time') return [s.distance ? `${num.format(s.distance)} km` : null, s.seconds ? clock(s.seconds) : null].filter(Boolean).join(' · ') || '—'
      if (type === 'reps') return s.reps ? t('unit.reps', { count: s.reps }) : '—'
      if (!s.reps && !s.weight) return '—'
      return s.weight ? `${num.format(s.weight)} kg × ${s.reps ?? 0}` : t('unit.reps', { count: s.reps ?? 0 })
    }
    /** Target sets as text: "4 × 10 kg × 12", "8 min"; differing sets list the first one. */
    const formatPlan = (sets: SetValues[], type: TrackingType) => {
      const first = sets[0]
      if (!first) return '—'
      const one = formatSet(first, type)
      return sets.length > 1 ? `${sets.length} × ${one}` : one
    }
    return {
      formatNumber,
      formatPlan,
      formatKg,
      formatDuration,
      formatSeconds,
      formatSet,
      /** "02/10/2026" */
      formatDate: (iso: string) => dateOf(iso).toLocaleDateString(intl),
      /** "Thứ Năm, 02/10" / "Thursday, 10/02" */
      formatDayHeader: (iso: string) =>
        dateOf(iso)
          .toLocaleDateString(intl, { weekday: 'long', day: '2-digit', month: '2-digit' })
          .replace(/^./, (c) => c.toUpperCase()),
      /** "02/10" */
      formatDayShort: (iso: string) => dateOf(iso).toLocaleDateString(intl, { day: '2-digit', month: '2-digit' }),
      /** "Tháng 10, 2026" / "October 2026" */
      formatMonth: (iso: string) =>
        dateOf(iso)
          .toLocaleDateString(intl, { month: 'long', year: 'numeric' })
          .replace(/^./, (c) => c.toUpperCase()),
      formatMonthShort: (iso: string) => t('format.monthShort', { n: Number(iso.slice(5, 7)), name: dateOf(iso).toLocaleDateString(intl, { month: 'short' }) }),
      /** "14:05" */
      formatTime: (isoDateTime: string) => new Date(isoDateTime).toLocaleTimeString(intl, { hour: '2-digit', minute: '2-digit' }),
      /** Weekday 0 = Monday: "T2" / "Mon" and "Thứ Hai" / "Monday". */
      weekdayShort: (i: number) => t(`weekday.short.${i}` as 'weekday.short.0'),
      weekdayLong: (i: number) => t(`weekday.long.${i}` as 'weekday.long.0'),
      muscleName: (m: string) => (m ? tOr(`muscle.${keyOf(m)}`, m) : ''),
      equipmentName: (q: string | null) => (q ? tOr(`equipment.${keyOf(q)}`, q) : ''),
      levelName: (l: string | null) => (l ? tOr(`level.${keyOf(l)}`, l) : ''),
      categoryName: (c: string) => tOr(`category.${keyOf(c)}`, c),
      trackingName: (type: TrackingType) => t(`tracking.${type}`),
    }
  }, [intl, t, tOr])
}
