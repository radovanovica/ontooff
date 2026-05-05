'use client';

import { useEffect, useState } from 'react';
import { Box, Button, Card, CardContent, Grid, Typography, Chip, CircularProgress } from '@mui/material';
import { Add, Article, Drafts, CheckCircle } from '@mui/icons-material';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ui/PageHeader';
import { format } from 'date-fns';

interface Stats {
  total: number;
  published: number;
  draft: number;
}

interface RecentPost {
  id: string;
  slug: string;
  title: string;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  _count?: { tags: number };
}

export default function ContributorDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/blog?authorId=' + session?.user?.id + '&status=PUBLISHED&pageSize=1').then(r => r.json()),
      fetch('/api/blog?authorId=' + session?.user?.id + '&status=DRAFT&pageSize=3').then(r => r.json()),
    ]).then(([pub, draft]) => {
      setStats({
        published: pub.meta?.total ?? 0,
        draft: draft.meta?.total ?? 0,
        total: (pub.meta?.total ?? 0) + (draft.meta?.total ?? 0),
      });
      setRecent(draft.data ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [session?.user?.id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title={`Welcome back${session?.user?.name ? `, ${session.user.name}` : ''}`}
        subtitle="Contributor dashboard — manage your blog posts"
        breadcrumbs={[{ label: 'Contributor', href: '/contributor' }, { label: 'Dashboard' }]}
        action={
          <Button
            variant="contained"
            startIcon={<Add />}
            component={Link}
            href="/contributor/posts/new"
          >
            New Post
          </Button>
        }
      />

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {[
          { icon: <Article />, label: 'Total Posts', value: stats?.total ?? 0, color: 'primary.main' },
          { icon: <CheckCircle />, label: 'Published', value: stats?.published ?? 0, color: 'success.main' },
          { icon: <Drafts />, label: 'Drafts', value: stats?.draft ?? 0, color: 'warning.main' },
        ].map((stat) => (
          <Grid key={stat.label} size={{ xs: 12, sm: 4 }}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{stat.value}</Typography>
                  <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Recent drafts */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Recent Drafts</Typography>
      {recent.length === 0 ? (
        <Card variant="outlined" sx={{ borderRadius: 2, p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>No drafts yet. Start writing!</Typography>
          <Button variant="contained" startIcon={<Add />} component={Link} href="/contributor/posts/new">
            Write your first post
          </Button>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {recent.map((post) => (
            <Grid key={post.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Chip
                      label={post.status}
                      size="small"
                      color={post.status === 'PUBLISHED' ? 'success' : post.status === 'DRAFT' ? 'warning' : 'default'}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(post.createdAt), 'dd MMM yyyy')}
                    </Typography>
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                    {post.title}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      component={Link}
                      href={`/contributor/posts/${post.slug}/edit`}
                    >
                      Edit
                    </Button>
                    {post.status === 'PUBLISHED' && (
                      <Button size="small" component={Link} href={`/blog/${post.slug}`} target="_blank">
                        View
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Box sx={{ mt: 3 }}>
        <Button component={Link} href="/contributor/posts" variant="outlined">
          View all my posts →
        </Button>
      </Box>
    </Box>
  );
}
