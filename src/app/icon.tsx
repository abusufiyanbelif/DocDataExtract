import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: 'hsl(142.1, 76.2%, 36.3%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'hsl(140, 50%, 98%)',
          borderRadius: '6px',
          fontWeight: 'bold',
        }}
      >
        B
      </div>
    ),
    {
      width: 32,
      height: 32,
    }
  )
}
