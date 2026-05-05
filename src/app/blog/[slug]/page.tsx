import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { format } from 'date-fns';
import {
  Box, Container, Typography, Chip, Avatar, Divider, Paper, Alert,
} from '@mui/material';
import { AccessTime, Visibility, CalendarToday, Place as PlaceIcon } from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import InstagramStoryShare from '@/components/blog/InstagramStoryShare';
import type { Metadata } from 'next';
import { getTranslation } from '@/i18n/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ontooff.app';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({
    where: { slug, status: 'PUBLISHED' },
    select: { title: true, excerpt: true, coverUrl: true, publishedAt: true },
  });
  if (!post) return { title: 'Post Not Found', robots: { index: false, follow: false } };
  const description = post.excerpt ? post.excerpt.slice(0, 155) : undefined;
  const pageUrl = `${APP_URL}/blog/${slug}`;
  return {
    title: post.title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      type: 'article',
      url: pageUrl,
      title: post.title,
      description,
      publishedTime: post.publishedAt ? post.publishedAt.toISOString() : undefined,
      images: post.coverUrl
        ? [{ url: post.coverUrl, width: 1200, height: 630, alt: post.title }]
        : [{ url: `${APP_URL}/assets/images/og-image.jpg`, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: post.coverUrl ? [post.coverUrl] : [`${APP_URL}/assets/images/og-image.jpg`],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);

  const isPrivileged =
    session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'CONTRIBUTOR';

  const post = await prisma.blogPost.findUnique({
    where: isPrivileged ? { slug } : { slug, status: 'PUBLISHED' },
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

  // Non-owners can't see another contributor's draft
  if (
    post.status !== 'PUBLISHED' &&
    session?.user?.role === 'CONTRIBUTOR' &&
    session?.user?.id !== post.authorId
  ) {
    notFound();
  }

  const { t } = await getTranslation('en', 'blog');

  // Fire-and-forget view count increment
  prisma.blogPost
    .update({ where: { slug }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  return (
    <>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 6 }}>
        {/* Draft / archived preview banner */}
        {post.status !== 'PUBLISHED' && (
          <Alert severity="warning" sx={{ mb: 4, borderRadius: 2 }}>
            <strong>{t('previewMode')}:</strong>{' '}
            {t('previewModeNotice', { status: post.status === 'DRAFT' ? t('draft') : t('archived') })}
          </Alert>
        )}
        {/* Category + tags */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          {post.category && (
            <Link href={`/blog?category=${post.category.slug}`} style={{ textDecoration: 'none' }}>
              <Chip
                label={post.category.name}
                size="small"
                clickable
                sx={
                  post.category.color
                    ? { bgcolor: post.category.color, color: 'white' }
                    : {}
                }
              />
            </Link>
          )}
          {post.tags.map(({ tag }) => (
            <Link key={tag.id} href={`/blog?tag=${tag.slug}`} style={{ textDecoration: 'none' }}>
              <Chip
                label={tag.name}
                size="small"
                variant="outlined"
                clickable
              />
            </Link>
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
                {post.readingTimeMinutes} {t('minRead')}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Visibility sx={{ fontSize: '0.875rem', color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {post.viewCount} {t('views')}
            </Typography>
          </Box>
          {/* Share buttons */}
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <InstagramStoryShare
              title={post.title}
              excerpt={post.excerpt}
              category={post.category?.name}
              categoryColor={post.category?.color}
              coverUrl={post.coverUrl}
              slug={post.slug}
              authorName={post.author.name}
              readingTimeMinutes={post.readingTimeMinutes}
            />
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
            <Link
              href={`/places/${post.place.slug}`}
              style={{
                padding: '6px 16px',
                borderRadius: 4,
                backgroundColor: '#1976d2',
                color: 'white',
                textDecoration: 'none',
                fontSize: '0.875rem',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              View Place
            </Link>
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
          <Link
            href="/blog"
            style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}
          >
            ← Back to Blog
          </Link>
        </Box>
      </Container>
    </>
  );
}
