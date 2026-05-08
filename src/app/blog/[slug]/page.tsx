import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { format } from 'date-fns';
import {
  Box, Container, Typography, Chip, Avatar, Alert,
} from '@mui/material';
import { AccessTime, Visibility, Place as PlaceIcon } from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
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
      {/* ── Hero: full-bleed cover with gradient overlay ── */}
      {post.coverUrl ? (
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: { xs: 280, sm: 420, md: 520 },
            overflow: 'hidden',
          }}
        >
          <Image
            src={post.coverUrl}
            alt={post.title}
            fill
            priority
            style={{ objectFit: 'cover' }}
            sizes="100vw"
          />
          {/* Dark gradient so text is readable */}
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.62) 100%)',
            }}
          />
          {/* Category pill — overlaid on hero */}
          {post.category && (
            <Box sx={{ position: 'absolute', top: 24, left: 24 }}>
              <Link href={`/blog?category=${post.category.slug}`} style={{ textDecoration: 'none' }}>
                <Chip
                  label={post.category.name}
                  size="small"
                  clickable
                  sx={{
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    fontSize: '0.72rem',
                    ...(post.category.color
                      ? { bgcolor: post.category.color, color: 'white' }
                      : { bgcolor: 'primary.main', color: 'white' }),
                  }}
                />
              </Link>
            </Box>
          )}
        </Box>
      ) : (
        /* No cover: thin accent bar */
        <Box sx={{ height: 6, background: 'linear-gradient(90deg, #2d5a27, #4a7c59)' }} />
      )}

      {/* ── Article container ── */}
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>

        {/* Draft / archived banner */}
        {post.status !== 'PUBLISHED' && (
          <Alert
            severity="warning"
            sx={{ mb: 4, borderRadius: 2, border: 'none', bgcolor: '#fef9ec' }}
          >
            <strong>{t('previewMode')}:</strong>{' '}
            {t('previewModeNotice', { status: post.status === 'DRAFT' ? t('draft') : t('archived') })}
          </Alert>
        )}

        {/* Category + tags (only when no hero cover — already shown above) */}
        {!post.coverUrl && post.category && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Link href={`/blog?category=${post.category.slug}`} style={{ textDecoration: 'none' }}>
              <Chip
                label={post.category.name}
                size="small"
                clickable
                sx={post.category.color ? { bgcolor: post.category.color, color: 'white' } : {}}
              />
            </Link>
          </Box>
        )}

        {/* Title */}
        <Typography
          variant="h3"
          component="h1"
          sx={{
            fontWeight: 800,
            lineHeight: 1.18,
            letterSpacing: '-0.02em',
            mb: 2.5,
            mt: post.coverUrl ? 0 : 1,
            fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.6rem' },
          }}
        >
          {post.title}
        </Typography>

        {/* Meta row */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2.5,
            flexWrap: 'wrap',
            pb: 3,
            mb: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Author */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Avatar src={post.author.image ?? undefined} sx={{ width: 30, height: 30, fontSize: '0.8rem' }}>
              {post.author.name?.charAt(0) ?? 'A'}
            </Avatar>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {post.author.name}
            </Typography>
          </Box>

          {/* Dot separator */}
          <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />

          {/* Date */}
          {post.publishedAt && (
            <Typography variant="body2" color="text.secondary">
              {format(new Date(post.publishedAt), 'dd MMMM yyyy')}
            </Typography>
          )}

          {/* Reading time */}
          {post.readingTimeMinutes && (
            <>
              <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTime sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {post.readingTimeMinutes} {t('minRead')}
                </Typography>
              </Box>
            </>
          )}

          {/* Views */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Visibility sx={{ fontSize: '0.8rem', color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {post.viewCount}
            </Typography>
          </Box>

          {/* Tags */}
          {post.tags.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
              {post.tags.map(({ tag }: { tag: { id: string; name: string; slug: string } }) => (
                <Link key={tag.id} href={`/blog?tag=${tag.slug}`} style={{ textDecoration: 'none' }}>
                  <Chip
                    label={`#${tag.name}`}
                    size="small"
                    variant="outlined"
                    clickable
                    sx={{ fontSize: '0.72rem', height: 22, borderColor: 'divider', color: 'text.secondary' }}
                  />
                </Link>
              ))}
            </Box>
          )}

          {/* Instagram share — pushed right */}
          <Box sx={{ ml: 'auto' }}>
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

        {/* Excerpt / lead */}
        {post.excerpt && (
          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: '1.05rem', md: '1.15rem' },
              lineHeight: 1.75,
              color: 'text.secondary',
              fontStyle: 'italic',
              mb: 4,
              pl: 2,
              borderLeft: '3px solid',
              borderColor: 'primary.light',
            }}
          >
            {post.excerpt}
          </Typography>
        )}

        {/* Body */}
        <Box
          sx={{
            '& p': { mb: 2, lineHeight: 1.85, fontSize: '1.02rem', color: 'text.primary' },
            '& h2': { fontWeight: 700, mt: 5, mb: 1.5, fontSize: '1.45rem', letterSpacing: '-0.01em' },
            '& h3': { fontWeight: 700, mt: 4, mb: 1.25, fontSize: '1.2rem' },
            '& h4': { fontWeight: 600, mt: 3, mb: 1, fontSize: '1.05rem' },
            '& ul, & ol': { pl: 3, mb: 2.5 },
            '& li': { mb: 0.75, lineHeight: 1.75, fontSize: '1.02rem' },
            '& blockquote': {
              borderLeft: '3px solid',
              borderColor: 'primary.main',
              pl: 2.5,
              my: 3.5,
              mx: 0,
              color: 'text.secondary',
              fontStyle: 'italic',
              fontSize: '1.05rem',
              lineHeight: 1.75,
            },
            '& img': { maxWidth: '100%', height: 'auto', borderRadius: 2, my: 1 },
            '& a': { color: 'primary.main', textDecorationColor: 'primary.light' },
            '& pre': {
              bgcolor: '#f4f1ec',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              p: 2,
              overflowX: 'auto',
              fontSize: '0.88rem',
              lineHeight: 1.65,
              my: 2.5,
            },
            '& code': {
              fontFamily: 'monospace',
              bgcolor: '#f4f1ec',
              px: 0.75,
              py: 0.15,
              borderRadius: 0.75,
              fontSize: '0.9em',
            },
            '& hr': { border: 'none', borderTop: '1px solid', borderColor: 'divider', my: 4 },
          }}
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        {/* ── Footer cards ── */}
        <Box sx={{ mt: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Featured place */}
          {post.place && (
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                alignItems: 'center',
                p: 2,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                transition: 'box-shadow 0.15s',
                '&:hover': { boxShadow: '0 2px 16px rgba(45,90,39,0.10)' },
              }}
            >
              {post.place.coverUrl && (
                <Box sx={{ position: 'relative', width: 72, height: 54, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                  <Image src={post.place.coverUrl} alt={post.place.name} fill style={{ objectFit: 'cover' }} sizes="72px" />
                </Box>
              )}
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mb: 0.25 }}>
                  <PlaceIcon sx={{ fontSize: '0.8rem' }} /> Featured Place
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                  {post.place.name}
                </Typography>
                {(post.place.city || post.place.country) && (
                  <Typography variant="caption" color="text.secondary">
                    {[post.place.city, post.place.country].filter(Boolean).join(', ')}
                  </Typography>
                )}
              </Box>
              <Link
                href={`/places/${post.place.slug}`}
                style={{
                  padding: '6px 18px',
                  borderRadius: 20,
                  border: '1.5px solid #2d5a27',
                  color: '#2d5a27',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                View Place
              </Link>
            </Box>
          )}

          {/* Author card */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              p: 2,
              borderRadius: 3,
              bgcolor: '#f3f7f2',
              border: '1px solid',
              borderColor: '#deeadb',
            }}
          >
            <Avatar
              src={post.author.image ?? undefined}
              sx={{ width: 46, height: 46, border: '2px solid', borderColor: 'primary.light' }}
            >
              {post.author.name?.charAt(0) ?? 'A'}
            </Avatar>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.65rem' }}>
                Written by
              </Typography>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {post.author.name}
              </Typography>
            </Box>
          </Box>

          {/* Back link */}
          <Box sx={{ pt: 1, textAlign: 'center' }}>
            <Link
              href="/blog"
              style={{
                color: '#4a7c59',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                letterSpacing: '0.02em',
              }}
            >
              ← Back to Blog
            </Link>
          </Box>
        </Box>
      </Container>
    </>
  );
}
