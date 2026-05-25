'use client';
import { Box, Typography, Breadcrumbs, Link as MuiLink, Chip, IconButton, Tooltip } from '@mui/material';
import Link from 'next/link';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HelpOutlineIcon from '@mui/icons-material/HelpOutlined';
import { usePathname } from 'next/navigation';

interface Crumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  action?: React.ReactNode;
  badge?: string;
}

export default function PageHeader({ title, subtitle, breadcrumbs, action, badge }: PageHeaderProps) {
  const pathname = usePathname();
  const showHelp =
    (pathname?.startsWith('/admin') || pathname?.startsWith('/owner')) &&
    pathname !== '/admin/help';
  return (
    <Box sx={{ mb: 4 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 1.5 }}>
          {breadcrumbs.map((crumb, i) =>
            crumb.href && i < breadcrumbs.length - 1 ? (
              <MuiLink
                key={i}
                component={Link}
                href={crumb.href}
                underline="hover"
                sx={{ color: 'text.secondary', fontSize: '0.875rem' }}
              >
                {crumb.label}
              </MuiLink>
            ) : (
              <Typography key={i} sx={{ color: 'text.primary', fontSize: '0.875rem', fontWeight: 500 }}>
                {crumb.label}
              </Typography>
            )
          )}
        </Breadcrumbs>
      )}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {title}
            </Typography>
            {badge && <Chip label={badge} color="primary" size="small" sx={{ height: 24 }} />}
          </Box>
          {subtitle && (
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {(action || showHelp) && (
          <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
            {action}
            {showHelp && (
              <Tooltip title="Help & Instructions">
                <IconButton
                  size="small"
                  onClick={() => window.open('/admin/help', '_blank')}
                  sx={{ color: 'text.secondary' }}
                >
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
