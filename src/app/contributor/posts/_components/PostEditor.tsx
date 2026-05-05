'use client';

import {
  Box, Button, TextField, Grid, Alert, CircularProgress, Card, CardContent,
  Typography, Chip, Autocomplete, Select, MenuItem, FormControl, InputLabel,
  Stack, Divider,
} from '@mui/material';
import { Save, Public, Visibility, ArrowBack } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import { uploadFileToS3 } from '@/lib/upload';

interface Category { id: string; name: string; color: string | null }
interface AccessiblePlace { id: string; name: string; city: string | null }

const schema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers and hyphens').optional().or(z.literal('')),
  excerpt: z.string().max(500).optional(),
  body: z.string().min(10, 'Content must be at least 10 characters'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  categoryId: z.string().optional(),
  placeId: z.string().optional(),
  tags: z.array(z.string()),
  coverUrl: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  mode: 'new' | 'edit';
  initialSlug?: string;
  defaultValues?: Partial<FormValues>;
}

export default function PostEditor({ mode, initialSlug, defaultValues }: Props) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [places, setPlaces] = useState<AccessiblePlace[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      slug: '',
      excerpt: '',
      body: '',
      status: 'DRAFT',
      categoryId: '',
      placeId: '',
      tags: [],
      coverUrl: '',
      ...defaultValues,
    },
  });

  const watchTitle = watch('title');
  const watchBody = watch('body');
  const watchCoverUrl = watch('coverUrl');
  const wordCount = watchBody?.trim().split(/\s+/).filter(Boolean).length ?? 0;

  useEffect(() => {
    fetch('/api/blog/categories').then(r => r.json()).then(d => setCategories(d.data ?? []));
    fetch('/api/contributor/places').then(r => r.json()).then(d => setPlaces(d.data ?? []));
  }, []);

  // Auto-fill slug in new mode
  useEffect(() => {
    if (mode !== 'new') return;
    const slug = watchTitle
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setValue('slug', slug, { shouldValidate: false });
  }, [watchTitle, mode, setValue]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFileToS3(file, 'blog-covers');
      setValue('coverUrl', url);
    } catch {
      setError('Cover image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        ...values,
        slug: values.slug || undefined,
        categoryId: values.categoryId || undefined,
        placeId: values.placeId || undefined,
        coverUrl: values.coverUrl || undefined,
      };

      const url = mode === 'edit' ? `/api/blog/${initialSlug}` : '/api/blog';
      const method = mode === 'edit' ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Save failed');
        return;
      }

      router.push('/contributor/posts');
    } catch {
      setError('Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={mode === 'new' ? 'New Blog Post' : 'Edit Post'}
        breadcrumbs={[
          { label: 'Contributor', href: '/contributor' },
          { label: 'Posts', href: '/contributor/posts' },
          { label: mode === 'new' ? 'New Post' : 'Edit' },
        ]}
        action={
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Visibility />}
              onClick={() => setPreviewMode((p) => !p)}
            >
              {previewMode ? 'Edit' : 'Preview'}
            </Button>
            <Button variant="outlined" startIcon={<ArrowBack />} component={Link} href="/contributor/posts">
              Back
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Grid container spacing={3}>
          {/* Left: content */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <TextField
                    {...register('title')}
                    label="Title"
                    fullWidth
                    required
                    error={!!errors.title}
                    helperText={errors.title?.message}
                    slotProps={{ htmlInput: { maxLength: 200 } }}
                  />
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <TextField
                    {...register('excerpt')}
                    label="Excerpt"
                    fullWidth
                    multiline
                    rows={2}
                    placeholder="Short summary shown in listings (optional)"
                    error={!!errors.excerpt}
                    helperText={errors.excerpt?.message ?? 'Max 500 characters'}
                    slotProps={{ htmlInput: { maxLength: 500 } }}
                  />
                </CardContent>
              </Card>

              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Content</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {wordCount} words · ~{Math.max(1, Math.round(wordCount / 200))} min read
                    </Typography>
                  </Box>

                  {previewMode ? (
                    <Box
                      sx={{
                        minHeight: 400,
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        '& p': { mb: 1.5 },
                        '& h1,h2,h3': { fontWeight: 700, mt: 2, mb: 1 },
                        '& ul,ol': { pl: 3, mb: 1.5 },
                        '& blockquote': { borderLeft: '4px solid', borderColor: 'primary.main', pl: 2, color: 'text.secondary' },
                      }}
                      dangerouslySetInnerHTML={{
                        __html: watchBody
                          .replace(/\n\n/g, '</p><p>')
                          .replace(/\n/g, '<br/>')
                          .replace(/^/, '<p>') + '</p>',
                      }}
                    />
                  ) : (
                    <TextField
                      {...register('body')}
                      fullWidth
                      multiline
                      minRows={18}
                      placeholder="Write your post content here. You can use HTML tags for formatting."
                      error={!!errors.body}
                      helperText={errors.body?.message}
                    />
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Grid>

          {/* Right: settings */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={2}>
              {/* Publish */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>Publish</Typography>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth size="small">
                        <InputLabel>Status</InputLabel>
                        <Select {...field} label="Status">
                          <MenuItem value="DRAFT">Draft</MenuItem>
                          <MenuItem value="PUBLISHED">Published</MenuItem>
                          <MenuItem value="ARCHIVED">Archived</MenuItem>
                        </Select>
                      </FormControl>
                    )}
                  />
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                      disabled={saving || uploading}
                      fullWidth
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                    {!saving && (
                      <Button
                        type="submit"
                        variant="outlined"
                        startIcon={<Public />}
                        fullWidth
                        onClick={() => setValue('status', 'PUBLISHED')}
                      >
                        Publish
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>

              {/* Slug */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>URL slug</Typography>
                  <TextField
                    {...register('slug')}
                    size="small"
                    fullWidth
                    placeholder="auto-generated-from-title"
                    error={!!errors.slug}
                    helperText={errors.slug?.message ?? `Preview: /blog/${watch('slug') || '...'}`}
                  />
                </CardContent>
              </Card>

              {/* Cover image */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Cover Image</Typography>
                  {watchCoverUrl && (
                    <Box
                      component="img"
                      src={watchCoverUrl}
                      alt="Cover"
                      sx={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 1, mb: 1.5 }}
                    />
                  )}
                  <Button
                    component="label"
                    variant="outlined"
                    size="small"
                    fullWidth
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading…' : watchCoverUrl ? 'Change image' : 'Upload image'}
                    <input type="file" hidden accept="image/*" onChange={handleCoverUpload} />
                  </Button>
                  {watchCoverUrl && (
                    <Button
                      size="small"
                      color="error"
                      fullWidth
                      sx={{ mt: 1 }}
                      onClick={() => setValue('coverUrl', '')}
                    >
                      Remove
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Category */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Category</Typography>
                  <Controller
                    name="categoryId"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth size="small">
                        <Select {...field} displayEmpty>
                          <MenuItem value="">No category</MenuItem>
                          {categories.map((c) => (
                            <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Tags */}
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Tags</Typography>
                  <Controller
                    name="tags"
                    control={control}
                    render={({ field }) => (
                      <Autocomplete<string, true, false, true>
                        multiple
                        freeSolo
                        options={[] as string[]}
                        value={field.value}
                        onChange={(_, val: (string | string)[]) => field.onChange(val)}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            placeholder="Add tags (press Enter)"
                          />
                        )}
                      />
                    )}
                  />
                </CardContent>
              </Card>

              {/* Link to place */}
              {places.length > 0 && (
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Linked Place</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                      Optionally link this post to one of your accessible places.
                    </Typography>
                    <Controller
                      name="placeId"
                      control={control}
                      render={({ field }) => (
                        <FormControl fullWidth size="small">
                          <Select {...field} displayEmpty>
                            <MenuItem value="">No place</MenuItem>
                            {places.map((p) => (
                              <MenuItem key={p.id} value={p.id}>
                                {p.name}{p.city ? ` — ${p.city}` : ''}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                    />
                  </CardContent>
                </Card>
              )}

              <Divider />
              <Typography variant="caption" color="text.secondary">
                HTML is supported in the content area. Posts are moderated before appearing publicly.
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
