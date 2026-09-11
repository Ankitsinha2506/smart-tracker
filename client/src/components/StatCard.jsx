import { Avatar, Paper, Stack, Typography } from '@mui/material';

const colorGradients = {
  'primary.main': 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
  'secondary.main': 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
  'success.main': 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  'warning.main': 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
  'info.main': 'linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)',
  'error.main': 'linear-gradient(135deg, #f43f5e 0%, #be123c 100%)',
};

export function StatCard({ label, value, icon, color = 'primary.main', subtitle }) {
  const gradient = colorGradients[color] || 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)';

  return (
    <Paper
      sx={{
        p: { xs: 2, sm: 2.25 },
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        borderRadius: '28px',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: (theme) =>
            theme.palette.mode === 'light'
              ? '0 20px 40px -10px rgba(79, 70, 229, 0.16), 0 0 0 1px rgba(255, 255, 255, 0.9) inset'
              : '0 22px 48px -8px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.95), transparent)',
          opacity: 0.85,
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: gradient,
          filter: 'blur(36px)',
          opacity: (theme) => (theme.palette.mode === 'light' ? 0.12 : 0.18),
          right: -30,
          bottom: -40,
          pointerEvents: 'none',
        },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'flex-start', gap: 1.5 }}>
        <Avatar
          sx={{
            background: gradient,
            color: '#fff',
            flexShrink: 0,
            width: 44,
            height: 44,
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,.4)',
            boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.25)',
            '& svg': { fontSize: 22 },
          }}
        >
          {icon}
        </Avatar>
        <Stack sx={{ minWidth: 0, textAlign: 'left' }}>
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              fontWeight: 700,
              fontSize: '0.85rem',
              letterSpacing: '0.01em',
            }}
          >
            {label}
          </Typography>
          <Typography
            variant="h4"
            sx={{
              mt: 0.5,
              lineHeight: 1.15,
              fontSize: { xs: 30, sm: 36 },
              fontWeight: 850,
              letterSpacing: '-0.035em',
              background: (theme) =>
                theme.palette.mode === 'light'
                  ? 'linear-gradient(180deg, #0f172a 0%, #334155 100%)'
                  : 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {Number(value || 0).toLocaleString()}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontWeight: 600 }}>
              {subtitle}
            </Typography>
          )}
        </Stack>

      </Stack>
    </Paper>
  );
}
