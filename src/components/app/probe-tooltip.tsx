'use client'
import { useId, useState } from 'react'

/**
 * Hover/focus tooltip for a presence badge. Renders stored facts only — browsing
 * never re-probes, so this stays zero-network (and works in the read-only demo).
 */
export function ProbeTooltip({
  website, detail, children,
}: { website: string | null; detail: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={e => { if (e.key === 'Escape') setOpen(false) }}
        className="cursor-help rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-lime"
      >
        {children}
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-0 z-30 mb-1.5 w-64 rounded-md border border-line bg-base p-2.5 text-left shadow-lg"
        >
          {website && (
            <span className="block break-all font-mono text-[10px] text-mute">Checked {website}</span>
          )}
          <span className="mt-1 block text-xs leading-relaxed text-dim">{detail}</span>
        </span>
      )}
    </span>
  )
}
