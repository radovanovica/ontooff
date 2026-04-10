'use client';

import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Place,
  People,
  EventNote,
  NaturePeople,
  Logout,
  AccountCircle,
  AdminPanelSettings,
  ManageAccounts,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import LanguageSwitcher from '@/components/ui/LanguageSwitcher';
import { useTranslation } from '@/i18n/client';
import { UserRole } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: UserRole[];
}

const DRAWER_WIDTH = 260;

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useTranslation('common');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const role = session?.user?.role as UserRole | undefined;

  const navItems: NavItem[] = [
    {
      label: t('nav.home'),
      href: '/',
      icon: <NaturePeople />,
    },
    ...(role === UserRole.SUPER_ADMIN
      ? [
          {
            label: t('nav.adminDashboard'),
            href: '/admin',
            icon: <AdminPanelSettings />,
            roles: [UserRole.SUPER_ADMIN],
          },
          {
            label: t('nav.users'),
            href: '/admin/users',
            icon: <People />,
            roles: [UserRole.SUPER_ADMIN],
          },
          {
            label: t('nav.places'),
            href: '/admin/places',
            icon: <Place />,
            roles: [UserRole.SUPER_ADMIN],
          },
          {
            label: t('nav.registrations'),
            href: '/admin/registrations',
            icon: <EventNote />,
            roles: [UserRole.SUPER_ADMIN],
          },
        ]
      : []),
    ...(role === UserRole.PLACE_OWNER
      ? [
          {
            label: t('nav.ownerDashboard'),
            href: '/owner',
            icon: <Dashboard />,
            roles: [UserRole.PLACE_OWNER],
          },
          {
            label: t('nav.myPlaces'),
            href: '/owner/places',
            icon: <Place />,
            roles: [UserRole.PLACE_OWNER],
          },
          {
            label: t('nav.bookings'),
            href: '/owner/bookings',
            icon: <EventNote />,
            roles: [UserRole.PLACE_OWNER],
          },
        ]
      : []),
  ];

  const handleUserMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(e.currentTarget);
  };
  const handleUserMenuClose = () => setUserMenuAnchor(null);

  const handleSignOut = async () => {
    handleUserMenuClose();
    await signOut({ redirect: false });
    router.push('/');
  };

  const drawerContent = (
    <Box sx={{ width: DRAWER_WIDTH }} role="presentation" onClick={() => setDrawerOpen(false)}>
      <Box
        sx={{
          px: 2,
          py: 2.5,
          background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
          color: 'white',
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
          🏕️ ActivityTracker
        </Typography>
        {session?.user && (
          <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
            {session.user.name ?? session.user.email}
          </Typography>
        )}
      </Box>
      <Divider />
      <List dense>
        {navItems.map((item) => {
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={isActive}
              sx={{
                borderRadius: 1,
                mx: 0.5,
                my: 0.25,
                '&.Mui-selected': {
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'inherit' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="open drawer"
              onClick={() => setDrawerOpen(true)}
              sx={{ mr: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo */}
          <Typography
            component={Link}
            href="/"
            variant="h6"
            sx={{
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
              letterSpacing: 0.5,
              flexShrink: 0,
            }}
          >
            🏕️ ActivityTracker
          </Typography>

          {/* Desktop nav */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 3 }}>
              {navItems.map((item) => {
                const isActive = item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Box
                    key={item.href}
                    component={Link}
                    href={item.href}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1,
                      color: 'inherit',
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 700 : 400,
                      bgcolor: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                      borderBottom: isActive ? '2px solid white' : '2px solid transparent',
                      transition: 'background-color 0.15s, border-color 0.15s',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    }}
                  >
                    {item.label}
                  </Box>
                );
              })}
            </Box>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Language switcher */}
          <LanguageSwitcher />

          {/* User menu */}
          {session?.user ? (
            <>
              <Tooltip title={session.user.name ?? session.user.email ?? 'Account'}>
                <IconButton onClick={handleUserMenuOpen} size="small" sx={{ ml: 1 }}>
                  {session.user.image ? (
                    <Avatar
                      src={session.user.image}
                      alt={session.user.name ?? ''}
                      sx={{ width: 32, height: 32 }}
                    />
                  ) : (
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main', fontSize: '0.875rem' }}>
                      {(session.user.name ?? session.user.email ?? 'U')[0].toUpperCase()}
                    </Avatar>
                  )}
                </IconButton>
              </Tooltip>
              <Menu
                anchorEl={userMenuAnchor}
                open={Boolean(userMenuAnchor)}
                onClose={handleUserMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{ paper: { elevation: 3, sx: { minWidth: 180, mt: 0.5 } } }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {session.user.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {session.user.email}
                  </Typography>
                </Box>
                <Divider />
                {role === UserRole.SUPER_ADMIN && (
                  <MenuItem component={Link} href="/admin" onClick={handleUserMenuClose}>
                    <ListItemIcon><AdminPanelSettings fontSize="small" /></ListItemIcon>
                    {t('nav.adminDashboard')}
                  </MenuItem>
                )}
                {role === UserRole.PLACE_OWNER && (
                  <MenuItem component={Link} href="/owner" onClick={handleUserMenuClose}>
                    <ListItemIcon><ManageAccounts fontSize="small" /></ListItemIcon>
                    {t('nav.ownerDashboard')}
                  </MenuItem>
                )}
                <MenuItem component={Link} href="/profile" onClick={handleUserMenuClose}>
                  <ListItemIcon><AccountCircle fontSize="small" /></ListItemIcon>
                  {t('nav.profile')}
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleSignOut} sx={{ color: 'error.main' }}>
                  <ListItemIcon><Logout fontSize="small" sx={{ color: 'error.main' }} /></ListItemIcon>
                  {t('auth.signOut')}
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, ml: 1 }}>
              <Box
                component={Link}
                href="/auth/signin"
                sx={{
                  px: 2,
                  py: 0.75,
                  borderRadius: 1,
                  color: 'inherit',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                }}
              >
                {t('auth.signIn')}
              </Box>
              <Box
                component={Link}
                href="/auth/signup"
                sx={{
                  px: 2,
                  py: 0.75,
                  borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'inherit',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                }}
              >
                {t('auth.signUp')}
              </Box>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
}
