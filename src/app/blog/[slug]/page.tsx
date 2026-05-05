import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';
import {
  Box, Container, Typography, Chip, Avatar, Divider, Paper,
} from '@mui/material';
import { AccessTime, Visibility, CalendarToday, Place as PlaceIcon } from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import type { Metadata } from 'next';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { slug, status: 'PUBLISHED' },
    select: { title: true, excerpt: true, coverUrl: true },
  });
  if (!post) return { title: 'Post Not Found' };
  return {
    title: post.title,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      images: post.coverUrl ? [post.coverUrl] : [],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({
    where: { slug, status: 'PUBLISHED' },
    include: {
      author: { select: { id: true, name: true, image: true } },
      place: { select: { id: true, name: true, slug: true, city: true, country: true, coverUrl: true } },
      category: { select: { id: true, name: true, slug: true, color: true } },
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
    },
  });

  if (!post) {
    notFound();
  }

  // Fire-and-forget view count increment
  prisma.blogPost
    .update({ where: { slug }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 6 }}>
        {/* Category + tags */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {post.category && (
            <Chip
              component={Link}
              href={`/blog?category=${post.category.slug}`}
              label={post.category.name}
              size="small"
              clickable
              sx={
                post.category.color
                  ? { bgcolor: post.category.color, color: 'white' }
                  : {}
              }
            />
          )}
          {post.tags.map(({ tag }) => (
            <Chip
              key={tag.id}
              component={Link}
              href={`/blog?tag=${tag.slug}`}
              label={tag.name}
              size="small"
              variant="outlined"
              clickable
            />
          ))}
        </Box>

        {/* Title */}
        <Typography variant="h3" component="h1" sx={{ fontWeight: 800, mb: 2, lineHeight: 1.25 }}>
          {post.title}
        </Typography>

        {/* Meta row */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Avatar
              src={post.author.image ?? undefined}
              sx={{ width: 32, height: 32 }}
            >
              {post.author.name?.charAt(0) ?? 'A'}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {post.author.name}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CalendarToday sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {post.publishedAt ? format(new Date(post.publishedAt), 'dd MMMM yyyy') : ''}
            </Typography>
          </Box>
          {post.readingTimeMinutes && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTime sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {post.readingTimeMinutes} min read
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Visibility sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {post.viewCount} views
            </Typography>
          </Box>
        </Box>

        {/* Cover image */}
        {post.coverUrl && (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              height: { xs: 240, sm: 360, md: 440 },
              borderRadius: 2,
              overflow: 'hidden',
              mb: 4,
            }}
          >
            <Image
              src={post.coverUrl}
              alt={post.title}
              fill
              priority
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 900px) 100vw, 900px"
            />
          </Box>
        )}

        {/* Excerpt */}
        {post.excerpt && (
          <Typography
            variant="h6"
            color="text.secondary"
            sx={{ fontWeight: 400, mb: 4, fontStyle: 'italic' }}
          >
            {post.excerpt}
          </Typography>
        )}

        <Divider sx={{ mb: 4 }} />

        {/* Body */}
        <Box
          sx={{
            '& p': { mb: 2, lineHeight: 1.8 },
            '& h1, & h2, & h3, & h4': { fontWeight: 700, mt: 4, mb: 1.5 },
            '& h2': { fontSize: '1.5rem' },
            '& h3': { fontSize: '1.25rem' },
            '& ul, & ol': { pl: 3, mb: 2 },
            '& li': { mb: 0.5 },
            '& blockquote': {
              borderLeft: '4px solid',
              borderColor: 'primary.main',
              pl: 2,
              my: 3,
              color: 'text.secondary',
              fontStyle: 'italic',
            },
            '& img': { maxWidth: '100%', height: 'auto', borderRadius: 1 },
            '& a': { color: 'primary.main' },
            '& pre, & code': {
              fontFamily: 'monospace',
              bgcolor: 'grey.100',
              px: 0.5,
              borderRadius: 0.5,
            },
          }}
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        <Divider sx={{ my: 5 }} />

        {/* Linked place card */}
        {post.place && (
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              display: 'flex',
              gap: 2,
              alignItems: 'center',
              mb: 4,
              borderRadius: 2,
              '&:hover': { boxShadow: 2 },
            }}
          >
            {post.place.coverUrl && (
              <Box
                sx={{
                  position: 'relative',
                  width: 80,
                  height: 60,
                  borderRadius: 1,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                <Image
                  src={post.place.coverUrl}
                  alt={post.place.name}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="80px"
                />
              </Box>
            )}
            <Box sx={{ flexGrow: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.25 }}>
                <PlaceIcon sx={{ fontSize: '1rem', color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Featured Place
                </Typography>
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {post.place.name}
              </Typography>
              {(post.place.city || post.place.country) && (
                <Typography variant="body2" color="text.secondary">
                  {[post.place.city, post.place.country].filter(Boolean).join(', ')}
                </Typography>
              )}
            </Box>
            <Box
              component={Link}
              href={`/places/${post.place.slug}`}
              sx={{
                px: 2,
                py: 0.75,
                borderRadius: 1,
                bgcolor: 'primary.main',
                color: 'white',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
                '&:hover': { bgcolor: 'primary.dark' },
                flexShrink: 0,
              }}
            >
              View Place
            </Box>
          </Paper>
        )}

        {/* Author bio card */}
        <Paper
          variant="outlined"
          sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'flex-start', borderRadius: 2 }}
        >
          <Avatar
            src={post.author.image ?? undefined}
            sx={{ width: 52, height: 52 }}
          >
            {post.author.name?.charAt(0) ?? 'A'}
          </Avatar>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Written by
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {post.author.name}
            </Typography>
          </Box>
        </Paper>

        {/* Back link */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Box
            component={Link}
            href="/blog"
            sx={{
              color: 'primary.main',
              textDecoration: 'none',
              fontWeight: 600,
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            ← Back to Blog
          </Box>
        </Box>
      </Container>
    </>
  );
}
