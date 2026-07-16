import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'PresenceZero — Find businesses whose web presence is zero.'

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0A0A0B',
          backgroundImage:
            'linear-gradient(rgba(250,250,250,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(250,250,250,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          padding: '80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', fontSize: 32, color: '#FAFAFA', fontWeight: 600, letterSpacing: '-0.02em' }}>
          PresenceZero<span style={{ color: '#C6F24E' }}>.</span>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 76,
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
            color: '#FAFAFA',
            maxWidth: 980,
          }}
        >
          Find businesses whose web presence is zero
          <span style={{ color: '#C6F24E' }}>.</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 28 }}>
          <div style={{ display: 'flex', color: 'rgba(250,250,250,0.70)' }}>
            Open-source · self-hosted · MIT licensed
          </div>
          <div style={{ display: 'flex', alignItems: 'center', color: 'rgba(250,250,250,0.70)' }}>
            <span style={{ color: '#FAFAFA', fontWeight: 700, marginRight: 10 }}>
              TN<span style={{ color: '#C6F24E' }}>.</span>
            </span>
            its-tahir.com
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
