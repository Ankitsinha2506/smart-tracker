import { Button, Container, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Container>
      <Stack alignItems="center" gap={2} mt={12}>
        <Typography variant="h1">404</Typography>
        <Typography>That page does not exist.</Typography>
        <Button component={Link} to="/">
          Return home
        </Button>
      </Stack>
    </Container>
  );
}
