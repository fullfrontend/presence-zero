import type { MetadataRoute } from 'next'
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/app' },
    sitemap: 'https://presencezero.its-tahir.com/sitemap.xml',
  }
}
