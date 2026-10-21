'use client'
import { useEffect, useRef, useState } from 'react'

/** Thin lime bar under the nav that tracks how far through the article you are. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const bar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = document.getElementById(targetId)
    if (!el || !bar.current) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const total = r.height - window.innerHeight
      const p = total <= 0 ? 1 : Math.min(1, Math.max(0, -r.top / total))
      if (bar.current) bar.current.style.transform = `scaleX(${p})`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }, [targetId])
  return (
    <div className="fixed inset-x-0 top-0 z-30 h-0.5" aria-hidden="true">
      <div ref={bar} className="pz-progress h-full bg-lime" />
    </div>
  )
}

/** Table of contents that highlights the section currently being read. */
export function GuideToc({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id)
  useEffect(() => {
    const els = items.map(i => document.getElementById(i.id)).filter((e): e is HTMLElement => !!e)
    const io = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-15% 0px -70% 0px' },
    )
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [items])
  return (
    <nav aria-label="On this page">
      <p className="text-sm font-medium text-text">On this page</p>
      <ol className="mt-3 space-y-0.5 border-l border-line">
        {items.map(i => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              aria-current={active === i.id ? 'location' : undefined}
              className={`-ml-px block border-l py-1.5 pl-4 text-[13px] leading-snug transition-colors ${
                active === i.id ? 'border-lime text-text' : 'border-transparent text-mute hover:text-dim'
              }`}
            >
              {i.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** A code block with a copy button — guides are full of commands worth pasting. */
export function CodeBlock({ code, caption }: { code: string; caption?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { /* clipboard blocked — the text is still selectable */ }
  }
  return (
    <figure className="not-prose overflow-hidden rounded-xl border border-line bg-[#0d0e10]">
      <div className="flex items-center justify-between border-b border-line px-4 py-2">
        <figcaption className="text-xs text-mute">{caption ?? 'Terminal'}</figcaption>
        <button
          type="button"
          onClick={copy}
          className={`rounded px-2 py-0.5 text-xs transition-colors ${copied ? 'text-lime' : 'text-dim hover:text-text'}`}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed"><code>{code}</code></pre>
    </figure>
  )
}
