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
      <Box sx={{ minWidth: 0, flex: { xs: '0 1 auto', lg: '1 1 340px' } }}>
        <Typography
          component="h1"
          variant="h4"
          sx={{
            fontWeight: 850,
            fontSize: { xs: 26, sm: 30, lg: 34 },
            overflowWrap: 'anywhere',
            letterSpacing: '-0.035em',
            background: (theme) =>
              theme.palette.mode === 'light'
                ? 'linear-gradient(135deg, #0f172a 0%, #334155 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
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
      {action && <Box sx={{ minWidth: 0, maxWidth: '100%' }}>{action}</Box>}
    </Stack>
  );
}
