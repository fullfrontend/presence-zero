import type { MetadataRoute } from 'next'
import { GUIDES, guidePath } from '@/content/guides'
import { absoluteUrl } from '@/lib/site'

const latest = (dates: string[]) => dates.reduce((a, b) => (a > b ? a : b))

export default function sitemap(): MetadataRoute.Sitemap {
  const guidesUpdated = latest(GUIDES.map(g => g.updated))
  return [
    { url: absoluteUrl('/'), lastModified: guidesUpdated, changeFrequency: 'weekly', priority: 1 },
    { url: absoluteUrl('/demo'), changeFrequency: 'monthly', priority: 0.8 },
    { url: absoluteUrl('/guides'), lastModified: guidesUpdated, changeFrequency: 'weekly', priority: 0.9 },
    { url: absoluteUrl('/alternatives'), lastModified: '2026-10-21', changeFrequency: 'monthly', priority: 0.8 },
    ...GUIDES.map(g => ({
      url: absoluteUrl(guidePath(g.slug)),
      lastModified: g.updated,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ]
}
