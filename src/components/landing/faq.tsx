'use client'
import { useState } from 'react'
import { SectionTag } from '@/components/brand/section-tag'
export const FAQ_ITEMS: { q: string; a: string }[] = [
  { q: 'Is PresenceZero free?', a: 'Yes — it is open-source (MIT) and self-hosted. You bring your own API keys and run on free tiers; RDAP domain checks need no key.' },
  { q: 'Does it send cold emails?', a: 'No. PresenceZero is a lead finder, not an outreach or CRM tool. It never sends mail — that is a permanent design line.' },
  { q: 'Where does the business data come from?', a: 'Google Places (your API key), OpenStreetMap (free, no key), or your own CSV import.' },
  { q: 'How is the 0–100 score calculated?', a: 'From web presence (none/dead/parked), review count and rating, whether the exact .com is available, and whether a phone number exists.' },
  { q: 'Can I try it without installing?', a: 'Yes — the live demo shows a real, read-only result set. To run your own scans, self-host in about two minutes.' },
]
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
