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
      <SnackbarProvider
        domRoot={document.body}
        maxSnack={3}
        autoHideDuration={3500}
        preventDuplicate
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
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
