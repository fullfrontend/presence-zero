import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0A0B',
          borderRadius: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', fontSize: 20, fontWeight: 700, color: '#FAFAFA', fontFamily: 'sans-serif' }}>
          P<span style={{ color: '#C6F24E' }}>.</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
