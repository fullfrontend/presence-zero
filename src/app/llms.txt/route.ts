import { GUIDES, guidePath } from '@/content/guides'
import { REPO_URL, SITE_NAME, absoluteUrl } from '@/lib/site'

export const dynamic = 'force-static'

// A plain-text map of the site for AI agents and answer engines (llmstxt.org format).
export function GET() {
  const body = `# ${SITE_NAME}

> ${SITE_NAME} is a free, open-source (MIT), self-hosted lead finder. It turns a location and a business category into a scored list of local businesses that have no website, a dead website, or a parked domain, checks which matching domains are still available via RDAP, scores each lead 0–100, and exports CSV/JSON. It is a lead finder, not an outreach or email tool.

Key facts:
- Data sources: OpenStreetMap (free, no key), CSV import (free), Google Places API (user's own key), Apify Google Maps actor (user's own account).
- Website verdicts: none, dead (DNS failure, connection failure, timeout, HTTP 5xx, redirect loop), parked (registrar for-sale page), alive. Each verdict records its reason.
- Domain checks: RDAP via rdap.org, throttled to about 1 request/second with caching.
- Score inputs: web presence, review count, rating, exact-match domain availability, phone number. Weights live in scoring.config.ts.
- Deploy: Node.js locally, Docker with SQLite, or Vercel + Turso. No account or paid service required.

## Product
- [Home](${absoluteUrl('/')}): What PresenceZero does, how it works, FAQ
- [Live demo](${absoluteUrl('/demo')}): Read-only scored result set
- [Alternatives and comparison](${absoluteUrl('/alternatives')}): PresenceZero compared with hosted tools for finding businesses without websites
- [Source code](${REPO_URL}): GitHub repository, README and setup instructions

## Guides
${GUIDES.map(g => `- [${g.title}](${absoluteUrl(guidePath(g.slug))}): ${g.description}`).join('\n')}
`
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
