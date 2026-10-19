'use client'
import { useI18n } from '@/i18n/client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/brand/button'

export interface TourStep {
  selector: string
  title: string
  body: string
}

interface Rect { top: number; left: number; width: number; height: number }
interface Pos { top: number; left: number }

const PAD = 6 // breathing room between the spotlight outline and the target's own box
const GAP = 12 // gap between the spotlight and the tooltip card

function measure(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height }
}

// Prefers the target's own bottom edge; flips above when there isn't enough room below.
function computePos(rect: Rect, tip: HTMLElement | null): Pos {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const tipW = tip?.offsetWidth ?? 320
  const tipH = tip?.offsetHeight ?? 160
  const spaceBelow = vh - (rect.top + rect.height + PAD)
  const placeBelow = spaceBelow >= tipH + GAP || spaceBelow >= rect.top
  const top = placeBelow
    ? rect.top + rect.height + PAD + GAP
    : Math.max(8, rect.top - PAD - GAP - tipH)
  const left = Math.min(Math.max(rect.left, 8), Math.max(8, vw - tipW - 8))
  return { top, left }
}

export function Tour({ steps, open, onClose }: { steps: TourStep[]; open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [stepIndex, setStepIndex] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [rect, setRect] = useState<Rect | null>(null)
  const [pos, setPos] = useState<Pos | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)
  const targetRef = useRef<HTMLElement | null>(null)
  const tooltipRef = useRef<HTMLDivElement | null>(null)
  const onCloseRef = useRef(onClose)

  // Keep the "latest onClose" ref in sync outside of render.
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Track prefers-reduced-motion so scroll + spotlight animation can both honor it.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Reset to the first step whenever the tour is (re)opened.
  useEffect(() => {
    const sync = () => {
      if (open) {
        setStepIndex(0)
        setDir(1)
      } else {
        setRect(null)
        setPos(null)
        targetRef.current = null
      }
    }
    sync()
  }, [open])

  // Locate the current step's target; if missing, walk in `dir` until one is found, else close.
  useEffect(() => {
    if (!open || steps.length === 0) return
    let i = stepIndex
    while (i >= 0 && i < steps.length) {
      const el = document.querySelector<HTMLElement>(steps[i].selector)
      if (el) {
        if (i !== stepIndex) {
          const jumpTo = (idx: number) => setStepIndex(idx)
          jumpTo(i)
          return
        }
        targetRef.current = el
        el.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' })
        const measureNow = () => { if (targetRef.current) setRect(measure(targetRef.current)) }
        measureNow()
        const t = window.setTimeout(measureNow, reducedMotion ? 0 : 300)
        return () => window.clearTimeout(t)
      }
      i += dir
    }
    onCloseRef.current()
  }, [open, steps, stepIndex, dir, reducedMotion])

  // Keep the spotlight glued to the target on resize/scroll (rAF-throttled).
  useEffect(() => {
    if (!open || !targetRef.current) return
    let ticking = false
    const onMove = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        if (targetRef.current) setRect(measure(targetRef.current))
      })
    }
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, stepIndex])

  // Recompute the tooltip position once the rect (or the tooltip's own size) changes.
  useLayoutEffect(() => {
    if (!rect) return
    setPos(computePos(rect, tooltipRef.current))
  }, [rect, stepIndex])

  // Light focus trap: move focus into the tooltip when a step becomes visible.
  useEffect(() => {
    if (!open || !pos) return
    const id = requestAnimationFrame(() => tooltipRef.current?.focus())
    return () => cancelAnimationFrame(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIndex, pos != null])

  function goNext() {
    if (stepIndex >= steps.length - 1) {
      onCloseRef.current()
      return
    }
    setDir(1)
    setStepIndex(i => i + 1)
  }

  function goBack() {
    if (stepIndex <= 0) return
    setDir(-1)
    setStepIndex(i => i - 1)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onCloseRef.current() }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); goNext() }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goBack() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stepIndex, steps.length])

  if (!open || steps.length === 0 || !rect || !pos) return null

  const step = steps[stepIndex]
  const isLast = stepIndex === steps.length - 1
  const spotlightStyle: React.CSSProperties = {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
    boxShadow: '0 0 0 9999px rgba(10,10,11,0.75)',
    transition: reducedMotion ? 'none' : 'top 250ms ease, left 250ms ease, width 250ms ease, height 250ms ease',
  }

  return (
    <div className="fixed inset-0 z-100 pointer-events-none">
      <div aria-hidden="true" className="fixed rounded-lg border-2 border-lime" style={spotlightStyle} />
      <div
        ref={tooltipRef}
        role="dialog"
        aria-modal="true"
        aria-label={t(step.title)}
        tabIndex={-1}
        className="pointer-events-auto fixed max-w-xs rounded-lg border border-line bg-base p-4 shadow-xl outline-none"
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute">
          {t("Step ")}{stepIndex + 1} {t(" of ")}{steps.length}
        </div>
        <div className="mt-1.5 font-medium text-text">{t(step.title)}</div>
        <p className="mt-1 text-sm text-dim">{t(step.body)}</p>
        <div className="mt-3 flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={stepIndex === 0}
            className="px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t("Back")}</Button>
          <Button variant="primary" onClick={goNext} className="px-3 py-1 text-xs">
            {isLast ? t("Done") : t("Next")}
          </Button>
          <button
            type="button"
            onClick={() => onCloseRef.current()}
            className="ml-auto font-mono text-[11px] text-mute underline-offset-4 hover:text-text hover:underline"
          >
            {t("Skip")}</button>
        </div>
      </div>
    </div>
  )
}
