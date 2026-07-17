'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// Matches the panel's `w-64` class — used to clamp horizontal position without
// needing to measure the panel's width (only its height varies with content).
const PANEL_WIDTH = 256
const GAP = 6 // matches mb-1.5 / mt-1.5 (0.375rem)
const VIEWPORT_MARGIN = 8

/**
 * Hover/focus tooltip for a presence badge. Renders stored facts only — browsing
 * never re-probes, so this stays zero-network (and works in the read-only demo).
 *
 * The panel is portaled to document.body and positioned with `position: fixed`
 * measured from the trigger, so it can escape the results table's clipping
 * `overflow-x-auto` container (which also clips the block-start/end axis per
 * CSS overflow rules) instead of being cut off for edge rows.
 */
export function ProbeTooltip({
  website, detail, ariaLabel, children,
}: { website: string | null; detail: string; ariaLabel: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLSpanElement>(null)
  const id = useId()

  // Measure on open: read the trigger + (already-mounted-but-hidden) panel via
  // refs, then place the panel. This reads from the DOM before calling
  // setState (not a synchronous derive-from-props call), so it's the
  // sanctioned "synchronize with an external system" effect shape.
  useEffect(() => {
    if (!open) return
    const trigger = triggerRef.current
    const panel = panelRef.current
    if (!trigger || !panel) return
    const rect = trigger.getBoundingClientRect()
    const panelHeight = panel.getBoundingClientRect().height
    const fitsAbove = rect.top >= panelHeight + GAP
    const top = fitsAbove ? rect.top - panelHeight - GAP : rect.bottom + GAP
    const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN)
    const left = Math.min(Math.max(rect.left, VIEWPORT_MARGIN), maxLeft)
    setPos({ top, left })
  }, [open])

  // Dismiss on Escape regardless of focus — a hover-opened tooltip has no
  // focused element to catch a button-level onKeyDown.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <span className="relative inline-flex">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="rounded"
      >
        {children}
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <span
          ref={panelRef}
          id={id}
          role="tooltip"
          style={{
            position: 'fixed',
            top: pos?.top ?? 0,
            left: pos?.left ?? 0,
            visibility: pos ? 'visible' : 'hidden',
          }}
          className="z-30 w-64 rounded-md border border-line bg-base p-2.5 text-left shadow-lg"
        >
          {website && (
            <span className="block break-all font-mono text-[10px] text-mute">Checked {website}</span>
          )}
          <span className="mt-1 block text-xs leading-relaxed text-dim">{detail}</span>
        </span>,
        document.body,
      )}
    </span>
  )
}
