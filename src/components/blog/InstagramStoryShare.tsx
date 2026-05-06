'use client';

import { useState, useRef } from 'react';
import { useTranslation } from '@/i18n/client';
import {
  Box, Button, Dialog, DialogContent, DialogTitle, IconButton,
  Typography, Tooltip, CircularProgress,
} from '@mui/material';
import { Close, Download, Instagram } from '@mui/icons-material';

interface Props {
  title: string;
  excerpt?: string | null;
  category?: string | null;
  categoryColor?: string | null;
  coverUrl?: string | null;
  slug: string;
  /** Override the full page URL used in the story. Defaults to /blog/slug */
  pageUrl?: string;
  /** Secondary line shown instead of author/reading time, e.g. "Paris, France" */
  subtitle?: string | null;
  authorName?: string | null;
  readingTimeMinutes?: number | null;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.ontooff.app';

// Draw rounded rectangle helper
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// Wrap text helper — returns array of lines
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function InstagramStoryShare({
  title,
  excerpt,
  category,
  categoryColor,
  coverUrl,
  slug,
  pageUrl,
  subtitle,
  authorName,
  readingTimeMinutes,
}: Props) {
  const { t } = useTranslation('blog');
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const W = 1080;
  const H = 1920;
  const postUrl = pageUrl ?? `${APP_URL}/blog/${slug}`;

  const generate = async () => {
    setGenerating(true);
    const canvas = canvasRef.current!;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    const APP_NAME = (process.env.NEXT_PUBLIC_APP_NAME ?? 'ontooff').toLowerCase();

    // ── STEP 1: Dark base background ──────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#091a0c');
    bg.addColorStop(0.45, '#12301a');
    bg.addColorStop(1, '#060f08');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── STEP 2: Full-bleed cover image ────────────────────────────────────
    let hasImage = false;
    if (coverUrl) {
      try {
        // Load via same-origin proxy to avoid S3 CORS restrictions on canvas
        const proxied = `/api/proxy-image?url=${encodeURIComponent(coverUrl)}`;
        const img = new window.Image();
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej(new Error('load failed'));
          img.src = proxied;
        });
        // Scale to fill entire canvas (cover-fit)
        const scale = Math.max(W / img.width, H / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
        hasImage = true;
      } catch {
        // fallback to plain background with decorative elements
      }
    }

    // ── STEP 3: Overlay gradients ─────────────────────────────────────────
    if (hasImage) {
      // Radial vignette — darkens edges so content stands out
      const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.22, W / 2, H / 2, H * 0.82);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.52)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      // Strong bottom gradient so text content is fully readable
      const bottomFade = ctx.createLinearGradient(0, H * 0.30, 0, H);
      bottomFade.addColorStop(0,    'rgba(5,14,6,0)');
      bottomFade.addColorStop(0.30, 'rgba(5,14,6,0.68)');
      bottomFade.addColorStop(0.58, 'rgba(5,14,6,0.90)');
      bottomFade.addColorStop(1,    'rgba(5,14,6,0.98)');
      ctx.fillStyle = bottomFade;
      ctx.fillRect(0, 0, W, H);

      // Soft top fade so the brand badge has a readable dark backing
      const topFade = ctx.createLinearGradient(0, 0, 0, 280);
      topFade.addColorStop(0, 'rgba(0,0,0,0.60)');
      topFade.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = topFade;
      ctx.fillRect(0, 0, W, 280);
    } else {
      // Decorative glows on plain bg when no image
      const glow = ctx.createRadialGradient(180, H * 0.38, 0, 180, H * 0.38, 680);
      glow.addColorStop(0, 'rgba(126,200,110,0.13)');
      glow.addColorStop(1, 'rgba(126,200,110,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = 'rgba(126,200,110,0.055)';
      ctx.beginPath();
      ctx.arc(W + 120, -120, 620, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(126,200,110,0.035)';
      ctx.beginPath();
      ctx.arc(W + 120, -120, 940, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── STEP 4: Top brand badge ───────────────────────────────────────────
    ctx.font = 'bold 50px system-ui, sans-serif';
    const brandW = ctx.measureText(APP_NAME).width + 56;
    ctx.fillStyle = 'rgba(126,200,110,0.18)';
    roundRect(ctx, 72, 92, brandW, 72, 36);
    ctx.fill();
    ctx.strokeStyle = 'rgba(126,200,110,0.42)';
    ctx.lineWidth = 2;
    roundRect(ctx, 72, 92, brandW, 72, 36);
    ctx.stroke();
    ctx.fillStyle = '#7ec86e';
    ctx.textBaseline = 'middle';
    ctx.fillText(APP_NAME, 72 + 28, 92 + 36);

    // ── STEP 5: Content area ──────────────────────────────────────────────
    // With image: anchor content to lower portion; without: start higher
    let cy = hasImage ? Math.round(H * 0.53) : 300;

    // Category pill
    if (category) {
      ctx.font = 'bold 34px system-ui, sans-serif';
      const catW = ctx.measureText(category.toUpperCase()).width + 44;
      ctx.fillStyle = categoryColor ?? '#2d5a27';
      roundRect(ctx, 72, cy, catW, 54, 27);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(category.toUpperCase(), 72 + 22, cy + 27);
      cy += 78;
    }

    // Title — large, with shadow for legibility over photos
    ctx.font = 'bold 80px system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 20;
    const titleLines = wrapText(ctx, title, W - 144);
    const maxTitleLines = 4;
    titleLines.slice(0, maxTitleLines).forEach((line, i) => {
      ctx.fillText(i === maxTitleLines - 1 && titleLines.length > maxTitleLines ? line + '…' : line, 72, cy);
      cy += 98;
    });
    ctx.shadowBlur = 0;
    cy += 14;

    // Excerpt
    if (excerpt) {
      ctx.font = '44px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.76)';
      const excLines = wrapText(ctx, excerpt, W - 144);
      const maxExc = 3;
      excLines.slice(0, maxExc).forEach((line, i) => {
        ctx.fillText(i === maxExc - 1 && excLines.length > maxExc ? line + '…' : line, 72, cy);
        cy += 60;
      });
      cy += 22;
    }

    // Meta row (author / location / reading time)
    let metaText = '';
    if (subtitle) {
      metaText = `📍 ${subtitle}`;
    } else {
      if (authorName) metaText = `✍ ${authorName}`;
      if (readingTimeMinutes) metaText += `${metaText ? '   ·   ' : ''}⏱ ${readingTimeMinutes} min read`;
    }
    if (metaText) {
      ctx.font = '40px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.52)';
      ctx.textBaseline = 'top';
      ctx.fillText(metaText, 72, cy);
    }

    // ── STEP 6: Bottom branding bar ───────────────────────────────────────
    const barY = H - 240;

    ctx.strokeStyle = 'rgba(255,255,255,0.10)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(72, barY);
    ctx.lineTo(W - 72, barY);
    ctx.stroke();

    // CTA label
    ctx.font = '36px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.textBaseline = 'middle';
    ctx.fillText(t('instagramStory.canvasCta'), 72, barY + 50);

    // URL pill with border
    const urlPillY = barY + 88;
    ctx.font = 'bold 36px system-ui, sans-serif';
    const shortUrl = postUrl.replace(/^https?:\/\//, '');
    const urlW = ctx.measureText(shortUrl).width + 48;
    ctx.fillStyle = 'rgba(126,200,110,0.16)';
    roundRect(ctx, 72, urlPillY, urlW, 58, 29);
    ctx.fill();
    ctx.strokeStyle = 'rgba(126,200,110,0.38)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 72, urlPillY, urlW, 58, 29);
    ctx.stroke();
    ctx.fillStyle = '#7ec86e';
    ctx.textBaseline = 'middle';
    ctx.fillText(shortUrl, 72 + 24, urlPillY + 29);

    setDataUrl(canvas.toDataURL('image/png'));
    setGenerating(false);
  };

  const handleOpen = async () => {
    setOpen(true);
    if (!dataUrl) await generate();
  };

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `ontooff-story-${slug}.png`;
    a.click();
  };

  return (
    <>
      {/* Hidden canvas — must live outside Dialog so it is always mounted */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <Tooltip title={t('instagramStory.shareTooltip')}>
        <Button
          onClick={handleOpen}
          variant="outlined"
          size="small"
          startIcon={<Instagram />}
          sx={{
            borderColor: '#E1306C',
            color: '#E1306C',
            '&:hover': {
              borderColor: '#c0254f',
              bgcolor: '#E1306C0D',
            },
          }}
        >
          {t('instagramStory.shareStory')}
        </Button>
      </Tooltip>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Instagram sx={{ color: '#E1306C' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>{t('instagramStory.dialogTitle')}</Typography>
          </Box>
          <IconButton onClick={() => setOpen(false)} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ textAlign: 'center', pb: 3 }}>
          {generating ? (
            <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress sx={{ color: '#E1306C' }} />
              <Typography variant="body2" color="text.secondary">{t('instagramStory.generating')}</Typography>
            </Box>
          ) : dataUrl ? (
            <>
              {/* Preview */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '9/16',
                  borderRadius: 2,
                  overflow: 'hidden',
                  mb: 2,
                  boxShadow: 3,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={dataUrl} alt={t('instagramStory.previewAlt')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                {t('instagramStory.downloadHint')}
              </Typography>

              <Button
                variant="contained"
                fullWidth
                startIcon={<Download />}
                onClick={handleDownload}
                sx={{
                  bgcolor: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
                  background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                  fontWeight: 700,
                  py: 1.2,
                  borderRadius: 2,
                  '&:hover': { opacity: 0.9 },
                }}
              >
                {t('instagramStory.downloadButton')}
              </Button>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
