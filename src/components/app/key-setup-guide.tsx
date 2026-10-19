'use client'
import { useI18n } from '@/i18n/client'
import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '@/lib/motion'

import { GOOGLE_STEPS, type Step } from './key-setup-data'

const STAGGER_MS = 80
const ACTIVE_INTERVAL_MS = 1600

export default function KeySetupGuide({ steps = GOOGLE_STEPS, title = 'Get a Google Places API key' }: { steps?: Step[]; title?: string }) {
  const { t } = useI18n()
  const reduced = usePrefersReducedMotion()
  // Under reduced motion, render always short-circuits to "revealed"/"not active" below,
  // so these initial values only matter for the (non-reduced) animated path.
  const [revealed, setRevealed] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  // Stagger-reveal the steps on mount; skipped entirely under reduced motion.
  useEffect(() => {
    if (reduced) return
    const timers = steps.map((_, i) =>
      window.setTimeout(() => setRevealed((c) => Math.max(c, i + 1)), i * STAGGER_MS),
    )
    return () => { timers.forEach((t) => window.clearTimeout(t)) }
  }, [reduced, steps])

  // Loop a subtle "active step" highlight down the list; skipped entirely under reduced motion.
  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % steps.length)
    }, ACTIVE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [reduced, steps])

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <h3 className="text-sm font-medium text-mute">{t(title)}</h3>
      <ol className="mt-5 space-y-5">
        {steps.map((step, i) => {
          const isRevealed = reduced || i < revealed
          const isActive = !reduced && activeIndex === i
          return (
            <li
              key={step.n}
              className={`relative border-l-2 pl-4 transition-colors duration-500 ${isActive ? 'border-lime' : 'border-line'}`}
              style={{
                opacity: isRevealed ? 1 : 0,
                transform: isRevealed ? 'translateY(0)' : 'translateY(6px)',
                transition: reduced
                  ? 'color 500ms ease-out, border-color 500ms ease-out'
                  : 'opacity 400ms ease-out, transform 400ms ease-out, border-color 500ms ease-out',
              }}
            >
              <div className="font-mono text-sm text-lime">{step.n}</div>
              <div className="mt-1 font-medium text-text">{t(step.title)}</div>
              <p className="mt-1 text-sm leading-relaxed text-dim">{t(step.body)}</p>
              {step.href && (
                <a
                  href={step.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block text-sm text-lime underline-offset-4 hover:underline"
                >
                  {step.linkLabel ? t(step.linkLabel) : step.href}
                </a>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
