'use client';

import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogContent,
  IconButton,
  Stack,
  Fade,
} from '@mui/material';
import {
  PhotoLibrary,
  Close,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { useState } from 'react';
import { useTranslation } from '@/i18n/client';

interface GallerySectionProps {
  images: string[];
}

export default function GallerySection({ images }: GallerySectionProps) {
  const { t } = useTranslation('registration');
  const { t: tc } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  if (images.length === 0) return null;

  return (
    <Box sx={{ mb: 2.5 }}>
      {/* Header row */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <PhotoLibrary sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
            {tc('stepper.photos')} ({images.length})
          </Typography>
        </Box>
        {images.length > 3 && (
          <Button
            size="small"
            onClick={() => { setIdx(0); setOpen(true); }}
            sx={{ fontSize: '0.72rem', py: 0, minWidth: 'auto', color: 'text.secondary' }}
          >
            {t('gallery.more', { count: images.length - 3 })}
          </Button>
        )}
      </Box>

      {/* Grid preview */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: images.length === 1 ? '1fr' : images.length === 2 ? '1fr 1fr' : '2fr 1fr',
        gridTemplateRows: images.length >= 3 ? '120px 120px' : '160px',
        gap: 0.75,
        borderRadius: 1.5,
        overflow: 'hidden',
      }}>
        <Box
          onClick={() => { setIdx(0); setOpen(true); }}
          sx={{ gridRow: images.length >= 3 ? 'span 2' : 'auto', position: 'relative', overflow: 'hidden', cursor: 'pointer', '&:hover img': { transform: 'scale(1.04)' } }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[0]} alt="1" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }} />
        </Box>
        {images.length >= 2 && (
          <Box
            onClick={() => { setIdx(1); setOpen(true); }}
            sx={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', '&:hover img': { transform: 'scale(1.04)' } }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[1]} alt="2" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }} />
          </Box>
        )}
        {images.length >= 3 && (
          <Box
            onClick={() => { setIdx(2); setOpen(true); }}
            sx={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', '&:hover img': { transform: 'scale(1.04)' } }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[2]} alt="3" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }} />
            {images.length > 3 && (
              <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h6" sx={{ color: 'white', fontWeight: 800 }}>+{images.length - 3}</Typography>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Lightbox */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth={false}
        slotProps={{ paper: { sx: { bgcolor: 'rgba(0,0,0,0.95)', borderRadius: 0, m: 0, maxWidth: '100vw', width: '100vw', height: '100vh', maxHeight: '100vh' } } }}
      >
        <DialogContent sx={{ p: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', position: 'relative' }}>
          <IconButton
            onClick={() => setOpen(false)}
            sx={{ position: 'absolute', top: 16, right: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }, zIndex: 10 }}
          >
            <Close />
          </IconButton>
          <Typography variant="caption" sx={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', zIndex: 10 }}>
            {idx + 1} / {images.length}
          </Typography>
          {images.length > 1 && (
            <IconButton
              onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
              sx={{ position: 'absolute', left: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }, zIndex: 10 }}
            >
              <ChevronLeft sx={{ fontSize: 36 }} />
            </IconButton>
          )}
          <Fade in key={idx}>
            <Box sx={{ maxWidth: '90vw', maxHeight: '90vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={images[idx]} alt={`photo ${idx + 1}`} style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 8 }} />
            </Box>
          </Fade>
          {images.length > 1 && (
            <IconButton
              onClick={() => setIdx((i) => (i + 1) % images.length)}
              sx={{ position: 'absolute', right: 16, color: 'white', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }, zIndex: 10 }}
            >
              <ChevronRight sx={{ fontSize: 36 }} />
            </IconButton>
          )}
          {images.length > 1 && (
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', maxWidth: '80vw', overflowX: 'auto', pb: 0.5 }}
            >
              {images.map((src, i) => (
                <Box
                  key={i}
                  onClick={() => setIdx(i)}
                  sx={{
                    width: 52, height: 36, borderRadius: 1, overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                    border: '2px solid', borderColor: i === idx ? 'white' : 'transparent',
                    opacity: i === idx ? 1 : 0.55, transition: 'opacity 0.2s, border-color 0.2s', '&:hover': { opacity: 1 },
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`thumb ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
