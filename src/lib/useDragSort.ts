import { useRef, useState, type PointerEvent } from 'react'

/** The list with item `from` moved to position `to`. */
export function moveTo<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [item] = next.splice(from, 1)
  if (item !== undefined) next.splice(to, 0, item)
  return next
}

/**
 * Reorder a vertical list by dragging a handle (pointer events, so it works with a finger too).
 * While dragging, `order` is the previewed order of the original indices; on release `onMove`
 * gets the move. Row positions are measured when the drag starts.
 */
export function useDragSort(count: number, onMove: (from: number, to: number) => void) {
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null)
  const rows = useRef<(HTMLElement | null)[]>([])
  const mids = useRef<number[]>([])
  const indices = Array.from({ length: count }, (_, i) => i)

  const handle = (i: number) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      e.preventDefault()
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // No active pointer (synthetic event): moves still reach the handle while over it.
      }
      mids.current = rows.current.slice(0, count).map((r) => {
        const box = r?.getBoundingClientRect()
        return box ? box.top + box.height / 2 : 0
      })
      setDrag({ from: i, over: i })
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (!drag) return
      const over = mids.current.filter((m, k) => k !== drag.from && m < e.clientY).length
      if (over !== drag.over) setDrag({ ...drag, over })
    },
    onPointerUp: () => {
      if (drag && drag.over !== drag.from) onMove(drag.from, drag.over)
      setDrag(null)
    },
    onPointerCancel: () => setDrag(null),
    style: { touchAction: 'none' } as const,
  })

  return {
    order: drag ? moveTo(indices, drag.from, drag.over) : indices,
    dragging: drag?.from ?? null,
    rowRef: (i: number) => (el: HTMLElement | null) => {
      rows.current[i] = el
    },
    handle,
  }
}
