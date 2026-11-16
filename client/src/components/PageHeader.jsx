import { BarChartRounded } from '@mui/icons-material';
import { Box, Stack, Typography } from '@mui/material';

export function PageHeader({ title, description, action }) {
  return (
    <Stack
      direction={{ xs: 'column', lg: 'row' }}
      sx={{
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', lg: 'center' },
        flexWrap: 'wrap',
        gap: 2,
        mb: { xs: 2.5, md: 3.5 },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ minWidth: 0, flex: { xs: '0 1 auto', lg: '1 1 340px' }, alignItems: 'flex-start' }}>
        <Box sx={{ display: 'grid', placeItems: 'center', flex: '0 0 auto', width: { xs: 42, sm: 48 }, height: { xs: 42, sm: 48 }, borderRadius: { xs: 2, sm: 2.5 }, color: '#fff', background: 'linear-gradient(145deg,#8056ff,#642dff 58%,#5420e9)', boxShadow: '0 8px 22px rgba(100,45,255,.27)' }}><BarChartRounded sx={{ fontSize: { xs: 21, sm: 24 } }} /></Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="h1"
            variant="h4"
            sx={{
              fontWeight: 850,
              fontSize: { xs: 26, sm: 30, lg: 34 },
              overflowWrap: 'anywhere',
              letterSpacing: '-0.035em',
              color: 'text.primary',
            }}
          >
            {title}
          </Typography>
          {description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 0.75, maxWidth: 700, fontWeight: 550, lineHeight: 1.6 }}
            >
              {description}
            </Typography>
          )}
        </Box>
      </Stack>
      {action && <Box sx={{ minWidth: 0, maxWidth: '100%' }}>{action}</Box>}
    </Stack>
  );
}
