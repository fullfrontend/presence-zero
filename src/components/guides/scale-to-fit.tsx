'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Renders children at a fixed design width and scales them down to the
 * available width — so guide illustrations become true miniatures in
 * thumbnails instead of reflowing and clipping.
 */
export function ScaleToFit({ base = 480, children }: { base?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState<number | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / base))
    ro.observe(el)
    return () => ro.disconnect()
  }, [base])
  return (
    <div ref={ref} className="relative aspect-4/3 w-full overflow-hidden rounded-2xl">
      <div
        className="absolute left-0 top-0"
        style={{ width: base, transform: `scale(${scale ?? 0})`, transformOrigin: 'top left', visibility: scale ? 'visible' : 'hidden' }}
      >
        {children}
      </div>
    </div>
  )
}
