import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('URL parameter is required', { status: 400 });
  }

  try {
    // Forward headers from the original request
    const headers = new Headers();
    headers.set('User-Agent', req.headers.get('User-Agent') || 'Firebase-Studio-Image-Proxy/1.0');
    
    const response = await fetch(imageUrl, { headers });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    // Return the image with appropriate headers
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800, immutable', // Cache for a week
      },
    });
  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
