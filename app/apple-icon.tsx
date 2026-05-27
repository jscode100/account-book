import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ fontSize: 320, background: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '120px', border: '20px solid #f9fafb' }}>
        💸
      </div>
    ),
    { ...size }
  )
}