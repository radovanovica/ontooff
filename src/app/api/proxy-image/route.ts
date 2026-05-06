import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTNAME_SUFFIX = '.amazonaws.com';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return new NextResponse('Missing url', { status: 400 });
  }

  // Security: only proxy images from our S3 bucket (amazonaws.com)
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse('Invalid url', { status: 400 });
  }

  if (!parsed.hostname.endsWith(ALLOWED_HOSTNAME_SUFFIX)) {
    return new NextResponse('URL not allowed', { status: 403 });
  }

  // Enforce HTTPS
  if (parsed.protocol !== 'https:') {
    return new NextResponse('Only HTTPS URLs are allowed', { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, { cache: 'no-store' });
  } catch {
    return new NextResponse('Failed to fetch image', { status: 502 });
  }

  if (!upstream.ok) {
    return new NextResponse('Image not found', { status: upstream.status });
  }

  const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';

  // Only forward image content types
  if (!contentType.startsWith('image/')) {
    return new NextResponse('Not an image', { status: 400 });
  }

  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  });
}
