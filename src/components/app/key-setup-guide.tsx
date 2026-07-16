'use client'
import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '@/lib/motion'

interface Step {
  n: string
  title: string
  body: string
  href?: string
  linkLabel?: string
}

const STEPS: Step[] = [
  {
    n: '01',
    title: 'Open the Google Cloud Console',
    body: 'Sign in with any Google account — no credit card needed to get started.',
    href: 'https://console.cloud.google.com/',
    linkLabel: 'console.cloud.google.com',
  },
  {
    n: '02',
    title: 'Create or select a project',
    body: 'Use the project picker at the top of the console. Any project works — a fresh one is fine.',
  },
  {
    n: '03',
    title: 'Enable the Places API (New)',
    body: 'Search the API library for it and click Enable for your project.',
    href: 'https://console.cloud.google.com/apis/library/places.googleapis.com',
    linkLabel: 'Enable Places API (New)',
  },
  {
    n: '04',
    title: 'Create an API key',
    body: 'Under Credentials, choose Create credentials → API key.',
    href: 'https://console.cloud.google.com/apis/credentials',
    linkLabel: 'Open Credentials',
  },
  {
    n: '05',
    title: 'Copy the key and paste it above',
    body: 'Save it in the form above — it stays in your own database and is only ever sent to Google. The free tier covers typical use. You can also set it as the GOOGLE_PLACES_API_KEY environment variable instead.',
  },
]

const STAGGER_MS = 80
const ACTIVE_INTERVAL_MS = 1600

export default function KeySetupGuide() {
  const reduced = usePrefersReducedMotion()
  // Under reduced motion, render always short-circuits to "revealed"/"not active" below,
  // so these initial values only matter for the (non-reduced) animated path.
  const [revealed, setRevealed] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  // Stagger-reveal the steps on mount; skipped entirely under reduced motion.
  useEffect(() => {
    if (reduced) return
    const timers = STEPS.map((_, i) =>
      window.setTimeout(() => setRevealed((c) => Math.max(c, i + 1)), i * STAGGER_MS),
    )
    return () => { timers.forEach((t) => window.clearTimeout(t)) }
  }, [reduced])

  // Loop a subtle "active step" highlight down the list; skipped entirely under reduced motion.
  useEffect(() => {
    if (reduced) return
    const id = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % STEPS.length)
    }, ACTIVE_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [reduced])

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <ol className="space-y-5">
        {STEPS.map((step, i) => {
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
              <div className="mt-1 font-medium text-text">{step.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-dim">{step.body}</p>
              {step.href && (
                <a
                  href={step.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-block text-sm text-lime underline-offset-4 hover:underline"
                >
                  {step.linkLabel ?? step.href}
                </a>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
