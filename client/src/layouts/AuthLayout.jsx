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
      minHeight: '100dvh', boxSizing: 'border-box', alignContent: { xs: 'start', lg: 'stretch' }, p: { xs: 1.5, sm: 2.25 }, display: 'grid',
      gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) minmax(0, 1fr)'  },
      background: mode === 'light'
        ? 'radial-gradient(ellipse at 92% 4%, rgba(177,150,255,.27), transparent 40%), linear-gradient(135deg,#faf9ff,#f0edff 58%,#f8f6ff)'
        : 'radial-gradient(ellipse at 92% 4%, rgba(91,47,207,.38), transparent 42%), linear-gradient(135deg,#080b20,#10102f 60%,#090c24)',
    }}>
      <Box component="section" sx={{
        minWidth: 0, display: { xs: 'none', lg: 'flex' }, alignItems: 'center', position: 'relative', overflow: 'hidden',
        borderRadius: { xs: 3, sm: 4 }, p: { xs: 3, sm: 5, md: 5, lg: 8 },
        color: '#fff', background: 'radial-gradient(ellipse at 0% 100%, rgba(123,82,255,.45) 0%, transparent 65%), linear-gradient(145deg, #10102e, #29165e 58%, #141038)',
        boxShadow: '0 24px 70px -30px rgba(52,27,133,.55)',
        '&::before, &::after': { content: '""', position: 'absolute', borderRadius: '50%', bgcolor: 'rgba(181,157,255,.12)', pointerEvents: 'none' },
        '&::before': { width: 400, height: 400, top: -100, right: -160 },
        '&::after': { width: 300, height: 300, bottom: -120, left: -100 },
      }}>
        <Box sx={{ width: '100%', maxWidth: 500, mx: 'auto', position: 'relative', zIndex: 1, py: { xs: 0, md: 6 } }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <BrandLogo size={40} mode="dark" />
            <Typography sx={{ fontWeight: 750, fontSize: 21 }}>SmartApply</Typography>
          </Stack>
          <Typography component="h2" sx={{ mt: { xs: 3, md: 9 }, fontSize: { xs: 30, sm: 38, lg: 48 }, fontWeight: 750, lineHeight: 1.15, letterSpacing: '-.04em' }}>
            Small steps.<br /><Box component="span" sx={{ color: '#b9a2ff' }}>Bigger opportunities.</Box>
          </Typography>
          <Typography sx={{ mt: { xs: 2, md: 4 }, fontSize: { xs: 14, lg: 16 }, lineHeight: 1.8, color: '#bdcce2', maxWidth: 460 }}>
            Keep candidates, daily applications, and placement progress together in one place.
          </Typography>
          <Stack direction="row" sx={{ display: { xs: 'none', sm: 'flex' }, flexWrap: 'wrap', gap: 3, mt: { sm: 4, md: 6 } }}>
            {features.map(([Icon, title]) => (
              <Stack key={title} direction="row" sx={{ alignItems: 'center', gap: 0.75 }}>
                <Icon sx={{ color: '#b9a2ff', fontSize: 18 }} />
                <Typography sx={{ color: '#b7c8df', fontSize: 12 }}>{title}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>
      <Box component="section" sx={{ minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 0, sm: 4, md: 4, lg: 7 }, py: { xs: 3, sm: 5 }, minHeight: { lg: 'calc(100dvh - 36px)' } }}>
        <Box sx={{
          position: 'relative', boxSizing: 'border-box', width: '100%', maxWidth: 460, p: { xs: 2.5, sm: 4 }, pt: { xs: 6, sm: 6 },
          borderRadius: 3.5, bgcolor: mode === 'light' ? 'rgba(255,255,255,.82)' : 'rgba(14,17,45,.88)',
          border: '1px solid', borderColor: mode === 'light' ? '#fff' : '#ffffff12',
          boxShadow: mode === 'light' ? '0 22px 64px -28px rgba(63,42,131,.25)' : '0 22px 64px -28px rgba(0,0,0,.6)',
          '& .MuiLink-root': { color: mode === 'light' ? '#642dff' : '#b9a2ff' },
        }}>
          <Tooltip title={`Use ${mode === 'light' ? 'dark' : 'light'} theme`}>
            <IconButton onClick={toggleMode} aria-label={`Use ${mode === 'light' ? 'dark' : 'light'} theme`} sx={{ position: 'absolute', top: 8, right: 8, color: 'text.secondary' }}>
              {mode === 'light' ? <DarkModeOutlined fontSize="small" /> : <LightModeOutlined fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Stack direction="row" sx={{ display: { xs: 'flex', lg: 'none' }, alignItems: 'center', gap: 1, mb: 3 }}>
            <BrandLogo size={32} mode={mode} />
            <Typography sx={{ fontWeight: 750, fontSize: 20 }}>SmartApply</Typography>
          </Stack>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
