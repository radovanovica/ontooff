import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadToS3 } from '@/lib/s3';

// POST /api/upload
// Accepts multipart/form-data with:
//   file   — the image file
//   folder — optional S3 folder prefix (default: "images")
//
// Returns: { success: true, url: "https://..." }

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);

export async function POST(req: NextRequest) {
  // Must be authenticated
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ success: false, error: 'File too large (max 10 MB)' }, { status: 413 });
  }

  const mimeType = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json({ success: false, error: 'Unsupported file type' }, { status: 415 });
  }

  const folder = (formData.get('folder') as string | null) ?? 'images';

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await uploadToS3(buffer, mimeType, folder);
    return NextResponse.json({ success: true, url });
  } catch (err) {
    console.error('S3 upload error:', err);
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
  }
}
