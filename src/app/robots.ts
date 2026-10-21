import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/site'

const PRIVATE = ['/app', '/api/']

// AI *search* crawlers are named explicitly so answer engines can cite the guides.
// (Training-only crawlers fall under the default rule.)
const AI_SEARCH_BOTS = ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      { userAgent: AI_SEARCH_BOTS, allow: '/', disallow: PRIVATE },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  }
}
