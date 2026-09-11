import { Refresh, WarningAmberRounded } from '@mui/icons-material';
import { Box, Button, Container, Paper, Stack, Typography } from '@mui/material';
import { useRouteError } from 'react-router-dom';

export function RouteErrorElement() {
  const error = useRouteError();
  const errorMessage =
    error?.message || error?.statusText || 'An unexpected application error occurred.';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        bgcolor: 'background.default',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          sx={{
            p: 4,
            borderRadius: 4,
            backdropFilter: 'blur(24px) saturate(190%)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
          }}
        >
          <Stack gap={2.5} alignItems="center" textAlign="center">
            <Box
              sx={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                bgcolor: 'rgba(239, 68, 68, 0.12)',
                display: 'grid',
                placeItems: 'center',
                color: 'error.main',
              }}
            >
              <WarningAmberRounded sx={{ fontSize: 36 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Something went wrong
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440 }}>
              {errorMessage}
            </Typography>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={() => window.location.reload()}
              sx={{ mt: 1, px: 3 }}
            >
              Reload application
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
