'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Box, CircularProgress, Alert } from '@mui/material';
import PostEditor from '../../_components/PostEditor';

interface PostData {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  coverUrl: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  categoryId: string | null;
  placeId: string | null;
  tags: { tag: { name: string } }[];
}

export default function EditPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/blog/${slug}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.success) throw new Error(d.error ?? 'Not found');
        setPost(d.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !post) {
    return <Alert severity="error">{error ?? 'Post not found'}</Alert>;
  }

  return (
    <PostEditor
      mode="edit"
      initialSlug={post.slug}
      defaultValues={{
        title: post.title,
        excerpt: post.excerpt ?? '',
        body: post.body,
        coverUrl: post.coverUrl ?? '',
        status: post.status,
        categoryId: post.categoryId ?? '',
        placeId: post.placeId ?? '',
        tags: post.tags.map((t) => t.tag.name),
      }}
    />
  );
}
