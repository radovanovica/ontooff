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

    // ── Background gradient ──────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b1e0e');
    bg.addColorStop(0.55, '#1a3d17');
    bg.addColorStop(1, '#0d2610');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ── Cover image strip ────────────────────────────────────────────────
    const IMG_H = 780;
    if (coverUrl) {
      try {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((res, rej) => {
          img.onload = () => res();
          img.onerror = () => rej();
          img.src = coverUrl;
        });
        // Draw with rounded top corners only (clipped)
        ctx.save();
        roundRect(ctx, 48, 88, W - 96, IMG_H, 32);
        ctx.clip();
        // Cover-fit
        const scale = Math.max((W - 96) / img.width, IMG_H / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, 48 + ((W - 96) - dw) / 2, 88 + (IMG_H - dh) / 2, dw, dh);
        ctx.restore();

        // Gradient overlay on image bottom so text is readable
        const imgFade = ctx.createLinearGradient(0, 88, 0, 88 + IMG_H);
        imgFade.addColorStop(0, 'rgba(0,0,0,0)');
        imgFade.addColorStop(0.55, 'rgba(0,0,0,0)');
        imgFade.addColorStop(1, 'rgba(10,30,10,0.82)');
        ctx.fillStyle = imgFade;
        ctx.fillRect(48, 88, W - 96, IMG_H);
      } catch {
        // Image load failed — use decorative pattern instead
        ctx.fillStyle = '#2d5a2730';
        ctx.fillRect(48, 88, W - 96, IMG_H);
      }
    }

    // ── Content area ─────────────────────────────────────────────────────
    const contentY = coverUrl ? 88 + IMG_H + 56 : 200;
    let cy = contentY;

    // Category pill
    if (category) {
      const pill = categoryColor ?? '#2d5a27';
      ctx.fillStyle = pill;
      const pillW = 0; // measured below
      ctx.font = 'bold 36px system-ui, sans-serif';
      const catW = ctx.measureText(category.toUpperCase()).width + 48;
      roundRect(ctx, 80, cy, catW, 56, 28);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(category.toUpperCase(), 80 + 24, cy + 28);
      cy += 80;
    }

    // Title
    ctx.font = `bold 76px system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'top';
    const titleLines = wrapText(ctx, title, W - 160);
    const maxTitleLines = 4;
    titleLines.slice(0, maxTitleLines).forEach((line, i) => {
      if (i === maxTitleLines - 1 && titleLines.length > maxTitleLines) {
        ctx.fillText(line + '…', 80, cy);
      } else {
        ctx.fillText(line, 80, cy);
      }
      cy += 90;
    });
    cy += 16;

    // Excerpt
    if (excerpt) {
      ctx.font = '44px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      const excLines = wrapText(ctx, excerpt, W - 160);
      const maxExc = 3;
      excLines.slice(0, maxExc).forEach((line, i) => {
        if (i === maxExc - 1 && excLines.length > maxExc) {
          ctx.fillText(line + '…', 80, cy);
        } else {
          ctx.fillText(line, 80, cy);
        }
        cy += 58;
      });
      cy += 24;
    }

    // Author + reading time row
    ctx.font = '40px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    let metaText = '';
    if (subtitle) {
      metaText = `📍 ${subtitle}`;
    } else {
      metaText = authorName ? `✍ ${authorName}` : '';
      if (readingTimeMinutes) metaText += `   ·   ⏱ ${readingTimeMinutes} min read`;
    }
    if (metaText) ctx.fillText(metaText, 80, cy);

    // ── Bottom branding bar ───────────────────────────────────────────────
    const barY = H - 220;

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, barY);
    ctx.lineTo(W - 80, barY);
    ctx.stroke();

    // Logo text
    ctx.font = 'bold 58px system-ui, sans-serif';
    ctx.fillStyle = '#7ec86e';
    ctx.textBaseline = 'middle';
    ctx.fillText('ontooff', 80, barY + 72);

    // CTA
    ctx.font = '38px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.50)';
    ctx.fillText(t('instagramStory.canvasCta'), 80, barY + 140);

    // URL pill
    const urlPillY = barY + 160;
    ctx.font = 'bold 34px system-ui, sans-serif';
    const shortUrl = postUrl.replace(/^https?:\/\//, '');
    const urlW = ctx.measureText(shortUrl).width + 48;
    ctx.fillStyle = 'rgba(126,200,110,0.18)';
    roundRect(ctx, 80, urlPillY, urlW, 52, 26);
    ctx.fill();
    ctx.fillStyle = '#7ec86e';
    ctx.textBaseline = 'middle';
    ctx.fillText(shortUrl, 80 + 24, urlPillY + 26);

    // Decorative circles (top-right corner)
    ctx.fillStyle = 'rgba(126,200,110,0.07)';
    ctx.beginPath();
    ctx.arc(W - 80, 80, 240, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(126,200,110,0.05)';
    ctx.beginPath();
    ctx.arc(W - 80, 80, 380, 0, Math.PI * 2);
    ctx.fill();

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
          {/* Hidden canvas for rendering */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

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
