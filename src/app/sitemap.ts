import type { MetadataRoute } from 'next'
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://presencezero.its-tahir.com'
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/demo`, changeFrequency: 'monthly', priority: 0.7 },
  ]
}
