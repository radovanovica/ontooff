'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Typography, Chip, CircularProgress, Alert, IconButton, Tooltip, Select, MenuItem,
  SelectChangeEvent, TextField, InputAdornment, Pagination, Avatar,
} from '@mui/material';
import { Search, OpenInNew, CheckCircle, Archive, Delete, Add } from '@mui/icons-material';
import Link from 'next/link';
import { format } from 'date-fns';
import PageHeader from '@/components/ui/PageHeader';

interface PostRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  viewCount: number;
  author: { id: string; name: string | null; image: string | null };
  place: { id: string; name: string } | null;
  category: { name: string; color: string | null } | null;
}

const STATUS_COLORS: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  DRAFT: 'warning',
  PUBLISHED: 'success',
  ARCHIVED: 'default',
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('DRAFT');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const PAGE_SIZE = 20;

  const fetchPosts = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/blog?${params}`);
      const data = await res.json();
      setPosts(data.data ?? []);
      setTotal(data.meta?.total ?? 0);
      setTotalPages(data.meta?.totalPages ?? 1);
    } catch {
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(() => fetchPosts(1), 300);
    return () => clearTimeout(t);
  }, [fetchPosts]);

  const changeStatus = async (slug: string, status: string) => {
    await fetch(`/api/blog/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchPosts(page);
  };

  const handleDelete = async (slug: string) => {
    if (!confirm('Permanently delete this post?')) return;
    await fetch(`/api/blog/${slug}`, { method: 'DELETE' });
    fetchPosts(page);
  };

  return (
    <Box>
      <PageHeader
        title="Blog Management"
        subtitle="Review, publish and moderate blog posts"
        breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Blog' }]}
        badge={statusFilter === 'DRAFT' && total > 0 ? `${total} pending` : undefined}
        action={
          <Button variant="contained" startIcon={<Add />} component={Link} href="/contributor/posts/new">
            New Post
          </Button>
        }
      />

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search posts…"
          size="small"
          sx={{ minWidth: 240 }}
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> } }}
        />
        <Select
          value={statusFilter}
          onChange={(e: SelectChangeEvent) => { setStatusFilter(e.target.value); setPage(1); }}
          displayEmpty
          size="small"
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          <MenuItem value="DRAFT">Draft (Pending)</MenuItem>
          <MenuItem value="PUBLISHED">Published</MenuItem>
          <MenuItem value="ARCHIVED">Archived</MenuItem>
        </Select>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Author</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Place</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Views</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No posts found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              posts.map((post) => (
                <TableRow key={post.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, maxWidth: 280 }} noWrap>
                      {post.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      /blog/{post.slug}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar src={post.author.image ?? undefined} sx={{ width: 24, height: 24, fontSize: '0.75rem' }}>
                        {post.author.name?.charAt(0) ?? '?'}
                      </Avatar>
                      <Typography variant="body2">{post.author.name ?? '—'}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={post.status} size="small" color={STATUS_COLORS[post.status] ?? 'default'} />
                  </TableCell>
                  <TableCell>
                    {post.category ? (
                      <Chip
                        label={post.category.name}
                        size="small"
                        variant="outlined"
                        sx={post.category.color ? { borderColor: post.category.color, color: post.category.color } : {}}
                      />
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {post.place ? (
                      <Typography variant="body2">{post.place.name}</Typography>
                    ) : '—'}
                  </TableCell>
                  <TableCell>{post.viewCount}</TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {format(new Date(post.publishedAt ?? post.createdAt), 'dd MMM yyyy')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {post.status === 'DRAFT' && (
                        <Tooltip title="Publish">
                          <IconButton size="small" color="success" onClick={() => changeStatus(post.slug, 'PUBLISHED')}>
                            <CheckCircle fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {post.status === 'PUBLISHED' && (
                        <Tooltip title="Archive">
                          <IconButton size="small" onClick={() => changeStatus(post.slug, 'ARCHIVED')}>
                            <Archive fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {post.status === 'PUBLISHED' && (
                        <Tooltip title="View live">
                          <IconButton size="small" component={Link} href={`/blog/${post.slug}`} target="_blank">
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => handleDelete(post.slug)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3, gap: 1 }}>
          <Typography variant="caption" color="text.secondary">{total} total posts</Typography>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => { setPage(p); fetchPosts(p); }}
            color="primary"
            shape="rounded"
          />
        </Box>
      )}
    </Box>
  );
}
