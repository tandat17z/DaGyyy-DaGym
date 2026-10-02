import { useEffect, useState } from 'react'
import { cn } from '../lib/cn'
import type { Exercise } from '../lib/types'
import { IconDumbbell } from './icons'

/** First image of an exercise (lazy), or a placeholder. `animate` alternates start / end position. */
export function ExerciseImage({ exercise, className, animate }: { exercise: Exercise | undefined; className?: string; animate?: boolean }) {
  const images = exercise?.images ?? []
  const [frame, setFrame] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!animate || images.length < 2) return
    const id = setInterval(() => setFrame((f) => (f + 1) % images.length), 1100)
    return () => clearInterval(id)
  }, [animate, images.length])

  if (!images.length || failed) {
    return (
      <div className={cn('grid place-items-center bg-surface-2 text-subtle', className)}>
        <IconDumbbell className="size-1/3 max-h-8 max-w-8" />
      </div>
    )
  }
  return (
    <div className={cn('relative overflow-hidden bg-white', className)}>
      {(animate ? images : images.slice(0, 1)).map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className={cn('absolute inset-0 size-full object-cover transition-opacity duration-300', i === frame % (animate ? images.length : 1) ? 'opacity-100' : 'opacity-0')}
        />
      ))}
    </div>
  )
}
