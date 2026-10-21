import type { ReactNode } from 'react'

export interface GuideSection {
  /** Anchor id for the H2 — also used by the table of contents. */
  id: string
  heading: string
  content: ReactNode
}

export interface GuideFaq {
  q: string
  a: string
}

export interface Guide {
  slug: string
  /** On-page H1. */
  title: string
  /** Full <title> (brand included), 30–60 chars. */
  seoTitle: string
  /** Meta description, 120–160 chars. */
  description: string
  /** Short label for cards and breadcrumbs. */
  shortTitle: string
  primaryKeyword: string
  keywords: string[]
  /** ISO dates (YYYY-MM-DD). */
  published: string
  updated: string
  readMinutes: number
  /** Answer-first summary shown at the top of the article (40–80 words). */
  tldr: string
  sections: GuideSection[]
  faqs: GuideFaq[]
  /** Slugs of related guides for internal linking. */
  related: string[]
}
