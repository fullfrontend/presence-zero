'use client'
import { useState } from 'react'
import { SectionTag } from '@/components/brand/section-tag'
import { FAQ_ITEMS } from '@/components/landing/faq-data'
export { FAQ_ITEMS }
export function Faq() {
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
      <SectionTag>{'// FAQ'}</SectionTag>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Questions</h2>
      <div className="mt-8 divide-y divide-line border-y border-line">
        {FAQ_ITEMS.map((it, i) => (
          <div key={i}>
            <button className="flex w-full items-center justify-between py-4 text-left" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              <span className="text-text">{it.q}</span><span className="text-lime">{open === i ? '−' : '+'}</span>
            </button>
            {open === i && <p className="pb-4 text-sm text-dim">{it.a}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}
