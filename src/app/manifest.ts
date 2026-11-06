import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PresenceZero',
    short_name: 'PresenceZero',
    description: 'Local business prospecting application.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0B',
    theme_color: '#0A0A0B',
    icons: [{ src: '/icon', sizes: '32x32', type: 'image/png' }],
  }
}
