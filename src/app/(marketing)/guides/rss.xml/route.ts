import { GUIDES, guidePath } from '@/content/guides'
import { AUTHOR, CONTACT_EMAIL, SITE_NAME, absoluteUrl } from '@/lib/site'

export const dynamic = 'force-static'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const rfc822 = (iso: string) => new Date(`${iso}T00:00:00Z`).toUTCString()

export function GET() {
  const items = [...GUIDES]
    .sort((a, b) => (a.published < b.published ? 1 : -1))
    .map(g => {
      const url = absoluteUrl(guidePath(g.slug))
      return `    <item>
      <title>${esc(g.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${esc(g.description)}</description>
      <pubDate>${rfc822(g.published)}</pubDate>
      <author>${CONTACT_EMAIL} (${esc(AUTHOR.name)})</author>
    </item>`
    })
    .join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${SITE_NAME} guides</title>
    <link>${absoluteUrl('/guides')}</link>
    <atom:link href="${absoluteUrl('/guides/rss.xml')}" rel="self" type="application/rss+xml" />
    <description>Guides for finding local businesses without websites and winning them as web design clients.</description>
    <language>en</language>
${items}
  </channel>
</rss>
`
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } })
}
