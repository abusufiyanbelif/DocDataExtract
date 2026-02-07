import { ImageResponse } from 'next/server'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
  return ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: 'hsl(142.1 76.2% 36.3%)', // primary color
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'hsl(140 50% 98%)', // primary-foreground color
          borderRadius: '50%',
          fontWeight: 'bold',
        }}
      >
        B
      </div>
    ),
    {
      ...size,
    }
  )
}
