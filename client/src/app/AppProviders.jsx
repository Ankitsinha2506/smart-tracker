import { CssBaseline, ThemeProvider } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { ColorModeProvider, useColorMode } from './ColorModeContext.jsx';
import { AuthProvider } from './AuthContext.jsx';
import { AppErrorBoundary } from '../components/AppErrorBoundary.jsx';

function Providers({ children }) {
  const { theme } = useColorMode();
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3} autoHideDuration={3500}>
        <AppErrorBoundary>
          <AuthProvider>{children}</AuthProvider>
        </AppErrorBoundary>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export function AppProviders({ children }) {
  return (
    <ColorModeProvider>
      <Providers>{children}</Providers>
    </ColorModeProvider>
  );
}
