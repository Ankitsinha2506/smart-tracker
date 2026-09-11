import { Brightness4, Brightness7, Insights } from '@mui/icons-material';
import { Box, Button, Chip, Container, IconButton, Paper, Stack, Typography } from '@mui/material';
import { useColorMode } from '../app/ColorModeContext.jsx';

export function LandingPage() {
  const { mode, toggleMode } = useColorMode();
  return (
    <Container maxWidth="lg">
      <Stack direction="row" alignItems="center" justifyContent="space-between" py={3}>
        <Stack direction="row" alignItems="center" gap={1}>
          <Insights color="primary" />
          <Typography variant="h6">SmartApply</Typography>
        </Stack>
        <IconButton aria-label="toggle color mode" onClick={toggleMode}>
          {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
        </IconButton>
      </Stack>
      <Paper sx={{ mt: { xs: 5, md: 12 }, p: { xs: 4, md: 8 }, overflow: 'hidden' }}>
        <Chip label="Phase 1 foundation" color="secondary" />
        <Typography
          variant="h2"
          component="h1"
          sx={{ mt: 2, maxWidth: 760, fontSize: { xs: '2.5rem', md: '4rem' }, fontWeight: 750 }}
        >
          Placement activity, made measurable.
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 2, maxWidth: 650, fontSize: '1.1rem' }}>
          SmartApply gives institutes and students a dependable view of Naukri application progress.
        </Typography>
        <Box mt={4}>
          <Button variant="contained" size="large" disabled>
            Authentication arrives in Phase 3
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
