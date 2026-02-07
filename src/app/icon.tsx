import { ImageResponse } from 'next/server'

// Route segment config
export const runtime = 'edge'

export const contentType = 'image/png'

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: 'hsl(var(--primary))',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'hsl(var(--primary-foreground))',
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
