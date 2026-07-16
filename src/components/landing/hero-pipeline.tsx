'use client'
import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '@/lib/motion'
import { PresenceBadge } from '@/components/app/presence-badge'

export function HeroPipeline() {
  const reduced = usePrefersReducedMotion()
  const root = useRef<HTMLDivElement>(null)
  const [score, setScore] = useState(87) // final value; SSR + reduced-motion show 87

  useEffect(() => {
    if (reduced || !root.current) return
    let ctx: { revert: () => void } | undefined
    void import('gsap').then(({ gsap }) => {
      const q = gsap.utils.selector(root.current!)
      ctx = gsap.context(() => {
        const tl = gsap.timeline()
        tl.from(q('[data-row]'), { autoAlpha: 0, y: 12, duration: 0.5 })
          .from(q('[data-badge]'), { autoAlpha: 0, scale: 0.8, duration: 0.35 }, '+=0.2')
          .from(q('[data-chip]'), { autoAlpha: 0, x: -8, duration: 0.35 }, '+=0.15')
          .fromTo({ v: 0 }, { v: 0 }, { v: 87, duration: 0.9, ease: 'power1.out',
            onUpdate() { setScore(Math.round((this.targets()[0] as { v: number }).v)) } }, '+=0.1')
          .fromTo(q('[data-bar]'), { width: '0%' }, { width: '87%', duration: 0.9, ease: 'power1.out' }, '<')
      }, root)
    })
    return () => ctx?.revert()
  }, [reduced])

  return (
    <div ref={root} className="rounded-xl border border-line bg-surface p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-mute">{'// bakery in ottawa, on'}</p>
      <div data-row className="mt-4 flex items-center gap-4 rounded-lg border border-line bg-base/50 p-4">
        <div className="w-12">
          <div className="text-lg tabular-nums text-lime font-semibold">{score}</div>
          <div className="mt-1 h-0.5 w-full bg-line"><div data-bar className="h-full bg-lime" style={{ width: '87%' }} /></div>
        </div>
        <div className="flex-1">
          <div className="text-text">Joe&apos;s Bakery</div>
          <div className="text-xs text-mute">124 Bank St · ★4.7 (212)</div>
        </div>
        <span data-badge><PresenceBadge status="none" /></span>
        <span data-chip className="rounded border border-lime/30 bg-lime/[0.08] px-1.5 py-0.5 font-mono text-[10px] text-lime">joesbakery.com</span>
      </div>
    </div>
  )
}
