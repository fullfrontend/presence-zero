import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PresenceZero: find businesses without websites',
    short_name: 'PresenceZero',
    description: 'Open-source, self-hosted lead finder for local businesses with no, dead or parked websites.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0B',
    theme_color: '#0A0A0B',
    icons: [{ src: '/icon', sizes: '32x32', type: 'image/png' }],
  }
}
