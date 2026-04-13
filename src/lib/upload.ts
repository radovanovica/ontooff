/**
 * Upload a File or Blob to S3 via the /api/upload endpoint.
 * Returns the public S3 URL on success, throws on error.
 */
export async function uploadFileToS3(
  file: File | Blob,
  folder: string = 'images',
): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('folder', folder);

  const res = await fetch('/api/upload', { method: 'POST', body: fd });
  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.error ?? 'Upload failed');
  }

  return data.url as string;
}
