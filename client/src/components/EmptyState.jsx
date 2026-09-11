import { Alert, Button, Stack, Typography } from '@mui/material';

export function EmptyState({ title = 'Nothing here yet', description, error, onRetry }) {
  if (error)
    return (
      <Alert
        severity="error"
        action={
          onRetry && (
            <Button color="inherit" onClick={onRetry}>
              Retry
            </Button>
          )
        }
      >
        {error}
      </Alert>
    );
  return (
    <Stack sx={{ alignItems: 'center', textAlign: 'center', py: 7, gap: 1 }}>
      <Typography variant="h6">{title}</Typography>
      {description && <Typography color="text.secondary">{description}</Typography>}
    </Stack>
  );
}
