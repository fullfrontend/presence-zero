import { ImageResponse } from 'next/og'
import { GUIDES, getGuide } from '@/content/guides'

// Per-guide social card at a stable URL (/og/<slug>), referenced from both the
// page metadata and the Article JSON-LD. A route handler rather than an
// opengraph-image file because those get a build-hash suffix in dynamic segments.
const size = { width: 1200, height: 630 }

export const dynamic = 'force-static'
export const dynamicParams = false
export function generateStaticParams() {
  return GUIDES.map(g => ({ slug: g.slug }))
}

const DOTS = [
  { label: 'NONE', fill: '#C6F24E', ring: false },
  { label: 'DEAD', fill: 'transparent', ring: true },
  { label: 'PARKED', fill: 'rgba(198,242,78,0.4)', ring: false },
]

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const guide = getGuide((await params).slug)
  const title = guide?.title ?? 'PresenceZero guides'
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          backgroundColor: '#0A0A0B', padding: '72px 80px', fontFamily: 'sans-serif',
          backgroundImage: 'radial-gradient(circle at 92% 8%, rgba(198,242,78,0.18), transparent 40%), radial-gradient(rgba(250,250,250,0.06) 1.5px, transparent 1.5px)',
          backgroundSize: '100% 100%, 36px 36px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: 30, color: '#FAFAFA', fontWeight: 600 }}>
            PresenceZero<span style={{ color: '#C6F24E' }}>.</span>
            <span style={{ color: 'rgba(250,250,250,0.45)', marginLeft: 16, fontWeight: 400 }}>Guides</span>
          </div>
          <div style={{ display: 'flex' }}>
            {DOTS.map(d => (
              <div key={d.label} style={{ display: 'flex', alignItems: 'center', marginLeft: 14, padding: '8px 14px', border: '1px solid rgba(250,250,250,0.14)', borderRadius: 8, fontSize: 18, color: '#FAFAFA', letterSpacing: '0.1em' }}>
                <div style={{ width: 12, height: 12, borderRadius: 12, marginRight: 10, background: d.fill, border: d.ring ? '2px solid #C6F24E' : 'none' }} />
                {d.label}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: title.length > 60 ? 62 : 72, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em', color: '#FAFAFA', maxWidth: 1040 }}>
          {title}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, color: 'rgba(250,250,250,0.70)' }}>
          <div style={{ display: 'flex' }}>{guide ? `${guide.readMinutes} min read · by Tahir Nazir` : 'Free, open-source lead finder'}</div>
          <div style={{ display: 'flex', color: '#C6F24E' }}>presencezero.its-tahir.com</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
