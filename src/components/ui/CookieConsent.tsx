'use client';

import {
  Box,
  Button,
  Typography,
  Collapse,
  FormControlLabel,
  Switch,
  Divider,
} from '@mui/material';
import { CookieOutlined } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/i18n/client';

const CONSENT_KEY = 'ontooff_cookie_consent';

export interface CookieConsentValue {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

/** Read the stored consent from localStorage (client-side only). */
export function getConsent(): CookieConsentValue | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as CookieConsentValue) : null;
  } catch {
    return null;
  }
}

function writeConsent(analytics: boolean, marketing: boolean) {
  const value: CookieConsentValue = {
    essential: true,
    analytics,
    marketing,
    timestamp: new Date().toISOString(),
  };
  // localStorage — read by client components
  localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  // Cookie — readable server-side (1 year)
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${CONSENT_KEY}=${encodeURIComponent(JSON.stringify(value))}; expires=${expires}; path=/; SameSite=Lax`;
  // Notify other client components (e.g. Analytics)
  window.dispatchEvent(new CustomEvent('cookie-consent-update', { detail: value }));
}

export default function CookieConsent() {
  const { t } = useTranslation('common');
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const consent = getConsent();
    if (!consent) {
      setVisible(true);
    } else {
      setAnalytics(consent.analytics);
      setMarketing(consent.marketing);
    }
  }, []);

  const acceptEssential = () => {
    writeConsent(false, false);
    setVisible(false);
  };

  const acceptAll = () => {
    writeConsent(true, true);
    setVisible(false);
  };

  const savePreferences = () => {
    writeConsent(analytics, marketing);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Box
      role="dialog"
      aria-label={t('cookies.title')}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        px: { xs: 2, sm: 4 },
        py: { xs: 2.5, sm: 3 },
        bgcolor: 'rgba(17,24,39,0.97)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Box sx={{ maxWidth: 960, mx: 'auto' }}>
        {/* ── Main row ── */}
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <CookieOutlined sx={{ color: '#7ec86e', flexShrink: 0, mt: { xs: 0.25, sm: 0 } }} />

          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography
              variant="body2"
              sx={{ color: 'rgba(255,255,255,0.92)', fontWeight: 600, mb: 0.25 }}
            >
              {t('cookies.title')}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, display: 'block' }}
            >
              {t('cookies.description')}{' '}
              <Box
                component="button"
                onClick={() => setShowPreferences((p) => !p)}
                sx={{
                  background: 'none',
                  border: 'none',
                  color: '#7ec86e',
                  cursor: 'pointer',
                  fontSize: 'inherit',
                  textDecoration: 'underline',
                  p: 0,
                }}
              >
                {showPreferences ? t('cookies.hidePreferences') : t('cookies.customize')}
              </Box>
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.5, flexShrink: 0, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              onClick={acceptEssential}
              sx={{
                color: 'rgba(255,255,255,0.75)',
                borderColor: 'rgba(255,255,255,0.25)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.5)',
                  bgcolor: 'rgba(255,255,255,0.05)',
                },
              }}
            >
              {t('cookies.essentialOnly')}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={acceptAll}
              sx={{ bgcolor: '#2d5a27', '&:hover': { bgcolor: '#1e3d1a' } }}
            >
              {t('cookies.acceptAll')}
            </Button>
          </Box>
        </Box>

        {/* ── Preferences panel ── */}
        <Collapse in={showPreferences}>
          <Divider sx={{ my: 2.5, borderColor: 'rgba(255,255,255,0.1)' }} />

          <Box sx={{ display: 'flex', gap: { xs: 3, sm: 6 }, flexWrap: 'wrap' }}>
            {/* Essential — always on */}
            <Box sx={{ minWidth: 180 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked
                    disabled
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#7ec86e' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#7ec86e' },
                    }}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                    {t('cookies.essential')}
                  </Typography>
                }
                sx={{ m: 0 }}
              />
              <Typography
                variant="caption"
                sx={{ display: 'block', color: 'rgba(255,255,255,0.4)', mt: 0.5, lineHeight: 1.5 }}
              >
                {t('cookies.essentialDesc')}
              </Typography>
            </Box>

            {/* Analytics */}
            <Box sx={{ minWidth: 180 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#7ec86e' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#7ec86e' },
                    }}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                    {t('cookies.analytics')}
                  </Typography>
                }
                sx={{ m: 0 }}
              />
              <Typography
                variant="caption"
                sx={{ display: 'block', color: 'rgba(255,255,255,0.4)', mt: 0.5, lineHeight: 1.5 }}
              >
                {t('cookies.analyticsDesc')}
              </Typography>
            </Box>

            {/* Marketing */}
            <Box sx={{ minWidth: 180 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                    size="small"
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: '#7ec86e' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#7ec86e' },
                    }}
                  />
                }
                label={
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
                    {t('cookies.marketing')}
                  </Typography>
                }
                sx={{ m: 0 }}
              />
              <Typography
                variant="caption"
                sx={{ display: 'block', color: 'rgba(255,255,255,0.4)', mt: 0.5, lineHeight: 1.5 }}
              >
                {t('cookies.marketingDesc')}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 2.5 }}>
            <Button
              size="small"
              variant="contained"
              onClick={savePreferences}
              sx={{ bgcolor: '#2d5a27', '&:hover': { bgcolor: '#1e3d1a' } }}
            >
              {t('cookies.savePreferences')}
            </Button>
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
