import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing image URL', { status: 400 });
  }

  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
    }

    const imageBlob = await response.blob();
    const headers = new Headers();
    headers.set('Content-Type', imageBlob.type || 'image/png');
    
    return new NextResponse(imageBlob, { status: 200, headers });

  } catch (error) {
    console.error('Image proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
