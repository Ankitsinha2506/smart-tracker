import { Button, Container, Paper, Stack, Typography } from '@mui/material';
import { Component } from 'react';

export class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('Unhandled UI error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Container maxWidth="sm" sx={{ py: 10 }}>
        <Paper sx={{ p: 4 }}>
          <Stack gap={2} alignItems="flex-start">
            <Typography component="h1" variant="h4">
              SmartApply encountered a problem
            </Typography>
            <Typography color="text.secondary">
              Reload the application to recover. Your saved data has not been changed.
            </Typography>
            <Button variant="contained" onClick={() => window.location.reload()}>
              Reload application
            </Button>
          </Stack>
        </Paper>
      </Container>
    );
  }
}
