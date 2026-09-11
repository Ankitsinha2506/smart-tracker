import { TuneRounded } from '@mui/icons-material';
import { Box, Paper, Stack, Typography } from '@mui/material';

export function FilterPanel({ children, sx, title = 'Refine your view' }) {
  return (
    <Paper component="section" aria-label={title} sx={{ p: { xs: 2, sm: 2.5 }, mb: 3, ...sx }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Box sx={{ display: 'grid', placeItems: 'center', width: 32, height: 32, borderRadius: '10px', bgcolor: 'action.selected', color: 'primary.main' }}><TuneRounded fontSize="small" /></Box>
        <Typography variant="subtitle2">{title}</Typography>
      </Stack>
      {children}
    </Paper>
  );
}
