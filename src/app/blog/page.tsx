'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Box, Container, Typography, Grid, Card, CardContent, CardActionArea, Chip,
  TextField, InputAdornment, CircularProgress, Alert, Pagination, Avatar, Stack, Divider,
} from '@mui/material';
import { Search, AccessTime, Visibility } from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import Navbar from '@/components/layout/Navbar';
import { useTranslation } from '@/i18n/client';

interface Category { id: string; name: string; slug: string; color: string | null; _count: { posts: number } }
interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
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
    <>
      <Navbar />
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
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 },
                    }}
                  >
                    <CardActionArea component={Link} href={`/blog/${post.slug}`} sx={{ flexGrow: 1 }}>
                      {post.coverUrl && (
                        <Box sx={{ position: 'relative', height: 180, overflow: 'hidden' }}>
                          <Image
                            src={post.coverUrl}
                            alt={post.title}
                            fill
                            style={{ objectFit: 'cover' }}
                            sizes="(max-width: 600px) 100vw, 33vw"
                          />
                        </Box>
                      )}
                      <CardContent sx={{ flexGrow: 1 }}>
                        {post.category && (
                          <Chip
                            label={post.category.name}
                            size="small"
                            sx={{
                              mb: 1,
                              ...(post.category.color
                                ? { bgcolor: post.category.color, color: 'white' }
                                : {}),
                            }}
                          />
                        )}
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, lineHeight: 1.3 }}>
                          {post.title}
                        </Typography>
                        {post.excerpt && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mb: 2,
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {post.excerpt}
                          </Typography>
                        )}
                        <Divider sx={{ mb: 1.5 }} />
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Avatar src={post.author.image ?? undefined} sx={{ width: 20, height: 20, fontSize: '0.65rem' }}>
                              {post.author.name?.charAt(0) ?? '?'}
                            </Avatar>
                            <Typography variant="caption" color="text.secondary">
                              {post.author.name}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                            {post.readingTimeMinutes && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                <AccessTime sx={{ fontSize: '0.75rem', color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                  {post.readingTimeMinutes} min
                                </Typography>
                              </Box>
                            )}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                              <Visibility sx={{ fontSize: '0.75rem', color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">{post.viewCount}</Typography>
                            </Box>
                          </Stack>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {post.publishedAt ? format(new Date(post.publishedAt), 'dd MMM yyyy') : ''}
                        </Typography>
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
    </>
  );
}

export default function BlogPage() {
  return (
    <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}><CircularProgress /></Box>}>
      <BlogContent />
    </Suspense>
  );
}
