'use client'
import { useI18n } from '@/i18n/client'
import { useState } from 'react'
import { SectionTag } from '@/components/brand/section-tag'
import { FAQ_ITEMS } from '@/components/landing/faq-data'
export { FAQ_ITEMS }
export function Faq() {
  const { t } = useI18n()
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
      <SectionTag>{t("// FAQ")}</SectionTag>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">{t("Questions")}</h2>
      <div className="mt-8 divide-y divide-line border-y border-line">
        {FAQ_ITEMS.map((it, i) => (
          <div key={i}>
            <button className="flex w-full items-center justify-between py-4 text-left" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
              <span className="text-text">{t(it.q)}</span>
              <span className={`text-lime transition-transform duration-300 ${open === i ? 'rotate-45' : ''}`}>+</span>
            </button>
            <div className={`grid transition-all duration-300 ${open === i ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
              <div className="overflow-hidden"><p className="pb-4 text-sm text-dim">{t(it.a)}</p></div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
