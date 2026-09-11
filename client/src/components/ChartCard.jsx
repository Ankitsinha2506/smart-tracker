import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';

export function ChartCard({ title, subheader, action, loading, children }) {
  return (
    <Paper
      sx={{
        p: { xs: 2.25, sm: 3 },
        minHeight: 340,
        minWidth: 0,
        borderRadius: '28px',
        overflow: 'hidden',
        position: 'relative',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: (theme) =>
            theme.palette.mode === 'light'
              ? '0 18px 42px -10px rgba(31, 38, 135, 0.09)'
              : '0 24px 50px -8px rgba(0, 0, 0, 0.55)',
        },
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1.5,
          mb: subheader ? 1.5 : 2.5,
        }}
      >
        <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 800,
              letterSpacing: '-.02em',
              fontSize: '1.05rem',
            }}
          >
            {title}
          </Typography>
          {subheader && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 600, display: 'block', mt: 0.25 }}
            >
              {subheader}
            </Typography>
          )}
        </Box>
        {action && <Box sx={{ minWidth: 0, maxWidth: '100%' }}>{action}</Box>}
      </Stack>
      {loading ? <Skeleton variant="rounded" height={270} sx={{ borderRadius: 3 }} /> : children}
    </Paper>
  );
}
