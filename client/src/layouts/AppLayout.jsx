import { BrandLogo } from '../components/BrandLogo.jsx';
import {
  AssessmentOutlined as Assessment,
  DarkModeOutlined,
  LightModeOutlined,
  DashboardOutlined as Dashboard,
  HistoryOutlined as History,
  Logout,
  Menu,
  PeopleOutlined as People,
  PersonOutlined as Person,
  SchoolOutlined as School,
  SettingsOutlined as Settings,
  WorkspacesOutlined as Workspaces,
} from '@mui/icons-material';
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu as MuiMenu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../app/AuthContext.jsx';
import { useColorMode } from '../app/ColorModeContext.jsx';

const drawerWidth = 276;
const sidebarWidth = 256;
const adminItems = [
  ['/dashboard', 'Dashboard', <Dashboard key="dashboard" />],
  ['/students', 'Students', <School key="students" />],
  ['/history', 'Application history', <History key="history" />],
  ['/reports', 'Reports', <Assessment key="reports" />],
  ['/technologies', 'Technologies', <Workspaces key="technologies" />],
  ['/users', 'Users', <People key="users" />],
];
const studentItems = [
  ['/my-profile', 'My profile', <Person key="profile" />],
  ['/history', 'My history', <History key="history" />],
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useColorMode();
  const mobile = useMediaQuery((theme) => theme.breakpoints.down('lg'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const accountName = user.name?.trim() || user.email?.trim() || 'User';
  const accountInitial = Array.from(accountName)[0].toLocaleUpperCase();
  const items =
    user.role === 'admin'
      ? adminItems
      : user.role === 'staff'
        ? adminItems.filter(([to]) => !['/users', '/reports'].includes(to))
        : studentItems;
  const activeTitle = items.find(([to]) => location.pathname.startsWith(to))?.[1] || (location.pathname === '/settings' ? 'Security' : 'SmartApply');
  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}> 
      <Toolbar disableGutters sx={{ px: 0.5, minHeight: '72px !important' }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.4 }}>
          <BrandLogo size={48} />
          <Box className="sidebar-copy">
            <Typography sx={{ fontWeight: 850, letterSpacing: '-.02em' }}>SmartApply</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Your placement workspace
            </Typography>
          </Box>
        </Stack>
      </Toolbar>
      <Typography
        className="sidebar-copy"
        variant="overline"
        sx={{
          px: 1.5,
          pt: 2,
          pb: 1,
          color: 'text.secondary',
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: '.14em',
          whiteSpace: 'nowrap',
        }}
      >
        Workspace
      </Typography>
      <List component="div" sx={{ p: 0 }}>
        {items.map(([to, label, icon]) => (
          <ListItemButton
            key={to}
            component={NavLink}
            to={to}
            selected={location.pathname.startsWith(to)}
            onClick={() => setDrawerOpen(false)}
            sx={{
              borderRadius: '14px',
              position: 'relative',
              my: 0.75,
              minHeight: 48,
              px: 1.5,
              color: 'text.secondary',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '& .MuiListItemIcon-root': {
                color: 'inherit',
                minWidth: 36,
                '& svg': { fontSize: 21 },
                transition: 'color 0.2s',
              },
              '& .MuiListItemText-primary': { fontSize: 14, fontWeight: 650 },
              '&:hover': {
                bgcolor: (theme) =>
                  theme.palette.mode === 'light'
                    ? 'rgba(99, 102, 241, 0.08)'
                    : 'rgba(129, 140, 248, 0.12)',
                color: 'primary.main',
                '& .MuiListItemIcon-root': { color: 'primary.main' },
              },
              '&.Mui-selected': {
                color: 'primary.main',
                background: (theme) => theme.palette.mode === 'light'
                  ? 'linear-gradient(120deg, rgba(255,255,255,.95), rgba(219,234,254,.7))'
                  : 'linear-gradient(120deg, rgba(59,130,246,.25), rgba(147,197,253,.07))',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.4), 0 4px 14px rgba(30,64,175,.08)',
                '&::after': { content: '""', position: 'absolute', right: 12, width: 5, height: 5, borderRadius: '50%', bgcolor: 'primary.main' },
                '&:hover': { bgcolor: 'action.selected' },
              },
            }}
          >
            <ListItemIcon>{icon}</ListItemIcon>
            <ListItemText className="sidebar-copy" primary={label} />
          </ListItemButton>
        ))}
      </List>
      <Box sx={{ flex: 1 }} />
      <Box
        className="sidebar-card"
        sx={{
          mx: 0.5,
          mb: 1.5,
          p: 2,
          borderRadius: '18px',
          bgcolor: (theme) => theme.palette.mode === 'light' ? 'rgba(255,255,255,.45)' : 'rgba(147,197,253,.06)',
          backdropFilter: 'blur(16px)',
          border: '1px solid',
          borderColor: (theme) =>
            theme.palette.mode === 'light'
              ? 'rgba(99, 102, 241, 0.15)'
              : 'rgba(255, 255, 255, 0.08)',
          whiteSpace: 'nowrap',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, letterSpacing: '.12em', fontWeight: 700 }}>
          YOUR ACCOUNT
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 800, mt: 0.4 }} noWrap>
          {user.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'capitalize' }}
        >
          {user.role === 'admin' ? 'Super admin' : user.role} account
        </Typography>
      </Box>
      <Divider sx={{ mb: 1 }} />
      <List component="div" sx={{ p: 0 }}>
        <ListItemButton
          component={NavLink}
          to="/settings"
          selected={location.pathname === '/settings'}
          onClick={() => setDrawerOpen(false)}
          sx={{
            borderRadius: 2.5,
            color: 'text.secondary',
            '&:hover': {
              bgcolor: (theme) =>
                theme.palette.mode === 'light'
                  ? 'rgba(99, 102, 241, 0.08)'
                  : 'rgba(129, 140, 248, 0.12)',
              color: 'primary.main',
              '& .MuiListItemIcon-root': { color: 'primary.main' },
            },
          }}
        >
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          <ListItemText className="sidebar-copy" primary="Security & settings" slotProps={{ primary: { sx: { fontSize: 13, fontWeight: 600 } } }} />
        </ListItemButton>
      </List>
    </Box>
  );
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };
  return (
    <Box sx={{ display: 'flex', minHeight: '100dvh' }}>
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: (theme) =>
            theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.48)' : 'rgba(12, 26, 46, 0.72)',
          backdropFilter: 'blur(24px) saturate(190%)',
          WebkitBackdropFilter: 'blur(24px) saturate(190%)',
          boxShadow: (theme) =>
            theme.palette.mode === 'light'
              ? '0 4px 20px -2px rgba(31, 38, 135, 0.05)'
              : '0 8px 32px 0 rgba(0, 0, 0, 0.35)',
          top: 16,
          right: { xs: 12, lg: 20 },
          borderRadius: '24px',
          width: { xs: 'calc(100% - 24px)', lg: `calc(100% - ${sidebarWidth + 56}px)` },
          ml: { lg: `${sidebarWidth}px` },
        }}
      >
        <Toolbar sx={{ px: { xs: 1, sm: 2 }, minHeight: { xs: 64, lg: 72 } }}>
          <IconButton
            aria-label="Open navigation"
            onClick={() => setDrawerOpen(true)}
            sx={{ display: { lg: 'none' }, mr: 1 }}
          >
            <Menu />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{ fontWeight: 850, letterSpacing: '-.02em', fontSize: '1.15rem' }}
              noWrap
            >
              {activeTitle}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600 }}
            >
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Typography>
          </Box>
          <Tooltip title={`Use ${mode === 'light' ? 'dark' : 'light'} theme`}>
            <IconButton
              aria-label={`Use ${mode === 'light' ? 'dark' : 'light'} theme`}
              onClick={toggleMode}
              sx={{
                width: 40, height: 40,
                border: '1px solid', borderColor: 'divider',
                bgcolor: 'action.hover', color: 'text.secondary',
                '&:hover': { bgcolor: 'action.selected', color: 'primary.main' },
              }}
            >
              {mode === 'light' ? <DarkModeOutlined sx={{ fontSize: 21 }} /> : <LightModeOutlined sx={{ fontSize: 21 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title={accountName}>
            <IconButton
              aria-label={`Open account menu for ${accountName}`}
              aria-haspopup="menu"
              aria-expanded={Boolean(anchor)}
              onClick={(event) => setAnchor(event.currentTarget)}
              sx={{ ml: 1, p: 0.5, border: '1px solid', borderColor: 'divider' }}
            >
              <Box component="span" sx={{
                width: 34, height: 34, borderRadius: '50%',
                display: 'grid', placeItems: 'center',
                bgcolor: mode === 'light' ? '#3157c7' : '#abc4ff',
                color: mode === 'light' ? '#ffffff' : '#142449',
                fontSize: 16, fontWeight: 750, lineHeight: 1,
                fontFamily: 'Arial, sans-serif',
              }}>{accountInitial}</Box>
            </IconButton>
          </Tooltip>
          <MuiMenu
            anchorEl={anchor}
            open={Boolean(anchor)}
            onClose={() => setAnchor(null)}
            slotProps={{
              paper: {
                sx: {
                  mt: 1,
                  minWidth: 180,
                  maxWidth: 'calc(100vw - 32px)',
                  '& .MuiMenuItem-root': { whiteSpace: 'normal', overflowWrap: 'anywhere' },
                  borderRadius: 3,
                  backdropFilter: 'blur(20px)',
                  border: '1px solid',
                  borderColor: 'divider',
                },
              },
            }}
          >
            <MenuItem disabled sx={{ opacity: '1 !important', fontWeight: 750 }}>
              {user.name}
            </MenuItem>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem
              onClick={() => {
                setAnchor(null);
                navigate('/settings');
              }}
            >
              <Settings sx={{ mr: 1.5, fontSize: 18 }} /> Security
            </MenuItem>
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <Logout sx={{ mr: 1.5, fontSize: 18 }} /> Logout
            </MenuItem>
          </MuiMenu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        aria-label="Primary navigation"
        sx={{ width: { lg: sidebarWidth }, flexShrink: { lg: 0 } }}
      >
        <Drawer
          variant={mobile ? 'temporary' : 'permanent'}
          open={mobile ? drawerOpen : true}
          onClose={() => setDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: { xs: drawerWidth, lg: sidebarWidth },
              maxWidth: 'calc(100vw - 24px)',
              top: { lg: 16 },
              left: { lg: 16 },
              height: { lg: 'calc(100% - 32px)' },
              borderRadius: { lg: '24px' },
              borderRight: '1px solid',
              borderColor: 'divider',
              bgcolor: (theme) =>
                theme.palette.mode === 'light'
                  ? 'rgba(239,247,255,.6)'
                  : 'rgba(12,26,46,.8)',
              backdropFilter: 'blur(24px) saturate(190%)',
              WebkitBackdropFilter: 'blur(24px) saturate(190%)',
              backgroundImage: 'none',
              overflowX: 'hidden',
              transition: (theme) =>
                theme.transitions.create(['width', 'box-shadow'], {
                  duration: theme.transitions.duration.standard,
                  easing: theme.transitions.easing.easeInOut,
                }),
            },
            '& .sidebar-copy, & .sidebar-card': {
              opacity: 1,
              transform: 'none',
              pointerEvents: 'auto',
              transition: (theme) =>
                theme.transitions.create(['opacity', 'transform'], {
                  duration: theme.transitions.duration.shorter,
                  easing: theme.transitions.easing.easeOut,
                }),
            },

          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flex: 1, minWidth: 0, bgcolor: 'background.default' }}>
        <Toolbar sx={{ minHeight: { xs: 64, lg: 72 } }} />
        <Box sx={{ p: { xs: 1.5, sm: 3, lg: 4 }, pt: { xs: 5, lg: 6 }, pl: { lg: 5 }, maxWidth: 1920, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
