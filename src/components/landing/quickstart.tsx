'use client'
import { useState } from 'react'
import { SectionTag } from '@/components/brand/section-tag'
import { HeadlineRule } from '@/components/brand/headline-rule'

const QUICKSTART_TABS = [
  {
    label: 'npm',
    code: 'git clone https://github.com/its-tahir/presence-zero && cd presence-zero && npm install && npm run dev',
  },
  {
    label: 'Docker',
    code: 'docker build -t presencezero . && docker run -p 3000:3000 presencezero',
  },
  {
    label: 'Vercel + Turso',
    code: 'Set DATABASE_URL to your Turso database URL (and DATABASE_AUTH_TOKEN),\nthen deploy to Vercel.',
  },
]

export function Quickstart() {
  const [activeTab, setActiveTab] = useState(0)

  return (
    <section id="quickstart" className="mx-auto max-w-3xl px-6 py-20">
      <SectionTag>{'// QUICK START'}</SectionTag>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Three ways to run</h2>
      <HeadlineRule />

      <div className="mt-8">
        <div className="flex gap-2 border-b border-line">
          {QUICKSTART_TABS.map((tab, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-3 font-mono text-sm transition-colors ${
                activeTab === i
                  ? 'bg-lime text-base'
                  : 'border border-line text-dim hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6 overflow-x-auto rounded border border-line bg-surface">
          <pre className="p-4 font-mono text-sm text-text">
            <code>{QUICKSTART_TABS[activeTab].code}</code>
          </pre>
        </div>
      </div>
    </section>
  )
}
