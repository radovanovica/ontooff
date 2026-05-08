'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Container, Typography, Grid, Card, CardContent, CardActionArea, Chip,
  TextField, InputAdornment, CircularProgress, Alert, Pagination, Avatar,
} from '@mui/material';
import { Search, AccessTime, Article } from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { useTranslation } from '@/i18n/client';

interface Category { id: string; name: string; slug: string; color: string | null; _count: { posts: number } }
interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  bodyPreview: string | null;
  coverUrl: string | null;
  publishedAt: string | null;
  readingTimeMinutes: number | null;
  viewCount: number;
  author: { name: string | null; image: string | null };
  category: { name: string; slug: string; color: string | null } | null;
  tags: { tag: { name: string; slug: string } }[];
}

function BlogContent() {
  const { t } = useTranslation('blog');
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryFilter = searchParams.get('category') ?? '';
  const tagFilter = searchParams.get('tag') ?? '';

  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [page, setPage] = useState(Number(searchParams.get('page') ?? 1));
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPosts = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: '9' });
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      if (tagFilter) params.set('tag', tagFilter);
      const res = await fetch(`/api/blog?${params}`);
      const data = await res.json();
      setPosts(data.data ?? []);
      setTotal(data.meta?.total ?? 0);
      setTotalPages(data.meta?.totalPages ?? 1);
    } catch {
      setError(t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, tagFilter]);

  useEffect(() => {
    fetch('/api/blog/categories').then(r => r.json()).then(d => setCategories(d.data ?? []));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchPosts(page), 300);
    return () => clearTimeout(t);
  }, [fetchPosts, page]);

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete('page');
    router.push(`/blog?${params}`);
    setPage(1);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {/* Hero */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, mb: 1.5 }}>
            {t('pageTitle')}
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 560, mx: 'auto' }}>
            {t('pageSubtitle')}
          </Typography>
        </Box>

        {/* Search + category filter */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: 'center', mb: 4 }}>
          <TextField
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('searchPlaceholder')}
            size="small"
            sx={{ minWidth: 260 }}
            slotProps={{
              input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> },
            }}
          />
        </Box>

        {/* Category chips */}
        {categories.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center', mb: 4 }}>
            <Chip
              label={t('allCategories')}
              onClick={() => setFilter('category', '')}
              variant={!categoryFilter ? 'filled' : 'outlined'}
              color="primary"
            />
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                label={`${cat.name} (${cat._count.posts})`}
                onClick={() => setFilter('category', cat.slug)}
                variant={categoryFilter === cat.slug ? 'filled' : 'outlined'}
                sx={
                  cat.color && categoryFilter === cat.slug
                    ? { bgcolor: cat.color, color: 'white', borderColor: cat.color }
                    : cat.color
                      ? { borderColor: cat.color, color: cat.color }
                      : {}
                }
              />
            ))}
          </Box>
        )}

        {tagFilter && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <Chip label={t('tagPrefix', { tag: tagFilter })} onDelete={() => setFilter('tag', '')} color="default" />
          </Box>
        )}

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : posts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography color="text.secondary">{t('noPostsFound')}</Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={3}>
              {posts.map((post) => (
                <Grid key={post.id} size={{ xs: 12, sm: 6, md: 4 }}>
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      overflow: 'hidden',
                      transition: 'box-shadow 0.18s, transform 0.18s',
                      '&:hover': { boxShadow: '0 4px 24px rgba(45,90,39,0.12)', transform: 'translateY(-3px)' },
                    }}
                  >
                    <CardActionArea component={Link} href={`/blog/${post.slug}`} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                      {/* Cover + category chip overlay */}
                      <Box sx={{ position: 'relative', height: 200, flexShrink: 0, overflow: 'hidden', bgcolor: '#e8f0e7' }}>
                        {post.coverUrl ? (
                          <Image
                            src={post.coverUrl}
                            alt={post.title}
                            fill
                            style={{ objectFit: 'cover' }}
                            sizes="(max-width: 600px) 100vw, 33vw"
                          />
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <Article sx={{ fontSize: 64, color: '#2d5a2730' }} />
                          </Box>
                        )}
                        {post.category && (
                          <Box sx={{ position: 'absolute', top: 12, left: 12 }}>
                            <Chip
                              label={post.category.name}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.7rem',
                                height: 22,
                                backdropFilter: 'blur(4px)',
                                ...(post.category.color
                                  ? { bgcolor: post.category.color, color: 'white' }
                                  : { bgcolor: 'rgba(45,90,39,0.88)', color: 'white' }),
                              }}
                            />
                          </Box>
                        )}
                      </Box>

                      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2.5 }}>
                        {post.publishedAt && (
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.75, letterSpacing: '0.04em' }}>
                            {format(new Date(post.publishedAt), 'dd MMM yyyy')}
                          </Typography>
                        )}
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 700,
                            lineHeight: 1.35,
                            letterSpacing: '-0.01em',
                            mb: 1,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {post.title}
                        </Typography>
                        {(post.excerpt || post.bodyPreview) && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              lineHeight: 1.65,
                              mb: 1.5,
                              flexGrow: 1,
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {post.excerpt ?? post.bodyPreview}
                          </Typography>
                        )}
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            pt: 1.5,
                            mt: 'auto',
                            borderTop: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Avatar
                            src={post.author.image ?? undefined}
                            sx={{ width: 22, height: 22, fontSize: '0.65rem', bgcolor: 'primary.main' }}
                          >
                            {post.author.name?.charAt(0) ?? '?'}
                          </Avatar>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, flexGrow: 1 }} noWrap>
                            {post.author.name}
                          </Typography>
                          {post.readingTimeMinutes && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flexShrink: 0 }}>
                              <AccessTime sx={{ fontSize: '0.7rem', color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">{post.readingTimeMinutes} min</Typography>
                            </Box>
                          )}
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {totalPages > 1 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 5, gap: 1 }}>
                <Typography variant="caption" color="text.secondary">{t('totalPostsCount', { count: total })}</Typography>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  color="primary"
                  shape="rounded"
                  size="large"
                />
              </Box>
            )}
          </>
        )}
    </Container>
  );
}

export default function BlogPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress /></Box>}>
      <BlogContent />
    </Suspense>
  );
}
