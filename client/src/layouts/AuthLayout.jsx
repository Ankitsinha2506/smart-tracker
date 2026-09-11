import { BarChartRounded, CheckCircleOutlineRounded, DarkModeOutlined, LightModeOutlined, ShieldOutlined } from '@mui/icons-material';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { useColorMode } from '../app/ColorModeContext.jsx';

const features = [
  [CheckCircleOutlineRounded, 'Track daily applications'],
  [ShieldOutlined, 'Secure candidate access'],
  [BarChartRounded, 'Clear placement reports'],
];

export function AuthLayout() {
  const { mode, toggleMode } = useColorMode();
  return (
    <Box component="main" sx={{
      minHeight: '100dvh', p: { xs: 1.5, sm: 2.25 }, display: 'grid',
      gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'minmax(0, 1.1fr) minmax(0, 1fr)' },
      background: mode === 'light'
        ? 'radial-gradient(ellipse at 90% 95%, #d9f0f3, transparent 45%), #edf3fc'
        : 'radial-gradient(ellipse at 90% 95%, #1c3150, transparent 45%), #101b2d',
    }}>
      <Box component="section" sx={{
        minWidth: 0, display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden',
        borderRadius: { xs: 3, sm: 4 }, p: { xs: 3, sm: 5, md: 5, lg: 8 },
        color: '#fff', background: 'radial-gradient(ellipse at 0% 100%, #245380 0%, transparent 65%), linear-gradient(145deg, #0d1d3a, #1c315c)',
        boxShadow: '0 24px 70px -30px #0f235070',
        '&::before, &::after': { content: '""', position: 'absolute', borderRadius: '50%', bgcolor: '#93bcff12', pointerEvents: 'none' },
        '&::before': { width: 400, height: 400, top: -100, right: -160 },
        '&::after': { width: 300, height: 300, bottom: -120, left: -100 },
      }}>
        <Box sx={{ width: '100%', maxWidth: 500, mx: 'auto', position: 'relative', zIndex: 1, py: { xs: 0, md: 6 } }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <BrandLogo size={40} mode="dark" />
            <Typography sx={{ fontWeight: 750, fontSize: 21 }}>SmartApply</Typography>
          </Stack>
          <Typography component="h2" sx={{ mt: { xs: 3, md: 9 }, fontSize: { xs: 30, sm: 38, lg: 48 }, fontWeight: 750, lineHeight: 1.15, letterSpacing: '-.04em' }}>
            Small steps.<br /><Box component="span" sx={{ color: '#99c5ff' }}>Bigger opportunities.</Box>
          </Typography>
          <Typography sx={{ mt: { xs: 2, md: 4 }, fontSize: { xs: 14, lg: 16 }, lineHeight: 1.8, color: '#bdcce2', maxWidth: 460 }}>
            Keep candidates, daily applications, and placement progress together in one place.
          </Typography>
          <Stack direction="row" sx={{ display: { xs: 'none', sm: 'flex' }, flexWrap: 'wrap', gap: 3, mt: { sm: 4, md: 6 } }}>
            {features.map(([Icon, title]) => (
              <Stack key={title} direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
                <Icon sx={{ color: '#83d8d0', fontSize: 18 }} />
                <Typography sx={{ color: '#b7c8df', fontSize: 12 }}>{title}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>
      <Box component="section" sx={{ minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 0, sm: 4, md: 4, lg: 7 }, py: { xs: 3, md: 5 } }}>
        <Box sx={{
          position: 'relative', width: '100%', maxWidth: 440, p: { xs: 3, sm: 4 }, pt: 5,
          borderRadius: 3.5, bgcolor: mode === 'light' ? '#fcfdff' : '#142137',
          border: '1px solid', borderColor: mode === 'light' ? '#fff' : '#ffffff12',
          boxShadow: '0 18px 50px -18px #0f235040',
          '& .MuiLink-root': { color: mode === 'light' ? '#2563eb' : '#93bcff' },
        }}>
          <Tooltip title={`Use ${mode === 'light' ? 'dark' : 'light'} theme`}>
            <IconButton onClick={toggleMode} aria-label={`Use ${mode === 'light' ? 'dark' : 'light'} theme`} sx={{ position: 'absolute', top: 8, right: 8, color: 'text.secondary' }}>
              {mode === 'light' ? <DarkModeOutlined fontSize="small" /> : <LightModeOutlined fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
