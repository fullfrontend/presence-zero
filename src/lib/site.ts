// Single source of truth for canonical URLs and the author entity used across
// metadata, JSON-LD, the sitemap, robots, RSS and llms.txt.
export const SITE_URL = 'https://presencezero.its-tahir.com'
export const SITE_NAME = 'PresenceZero'
export const REPO_URL = 'https://github.com/its-tahir/presence-zero'
export const CONTACT_EMAIL = 'hello@its-tahir.com'

export const AUTHOR = {
  name: 'Tahir Nazir',
  url: 'https://www.its-tahir.com',
  sameAs: ['https://its-tahir.com', 'https://github.com/its-tahir'],
} as const

export const absoluteUrl = (path: string) => `${SITE_URL}${path === '/' ? '' : path}`

/** Schema.org Person for the author — referenced by @id from every graph. */
export const AUTHOR_LD = {
  '@type': 'Person',
  '@id': `${AUTHOR.url}/#person`,
  name: AUTHOR.name,
  url: AUTHOR.url,
  sameAs: AUTHOR.sameAs,
} as const

/** Serialize a JSON-LD object safely for a <script> tag. */
export const jsonLdString = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')
