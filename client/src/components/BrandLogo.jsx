import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

/** Transparent SA symbol; theme variants preserve contrast on either surface. */
export function BrandLogo({ size = 48, mode, sx }) {
  const theme = useTheme();
  const colorMode = mode || theme.palette.mode;
  return (
    <Box
      component="img"
      src={`/brand/smartapply-mark-${colorMode}.svg`}
      alt="SmartApply logo"
      width={size}
      height={size}
      sx={{ display: 'block', objectFit: 'contain', flexShrink: 0, ...sx }}
    />
  );
}
