import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export function SessionExpiryBoundary() {
  const navigate = useNavigate();
  const { expireSession } = useAuth();
  const [open, setOpen] = useState(false);
  const redirectTimer = useRef(null);

  const goToLogin = useCallback(() => {
    window.clearTimeout(redirectTimer.current);
    setOpen(false);
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    const onSessionExpired = () => {
      expireSession();
      setOpen(true);
      window.clearTimeout(redirectTimer.current);
      redirectTimer.current = window.setTimeout(goToLogin, 1800);
    };
    window.addEventListener('auth:session-expired', onSessionExpired);
    return () => {
      window.removeEventListener('auth:session-expired', onSessionExpired);
      window.clearTimeout(redirectTimer.current);
    };
  }, [expireSession, goToLogin]);

  return <>
    <Outlet />
    <Dialog open={open} onClose={goToLogin} aria-labelledby="session-expired-title">
      <DialogTitle id="session-expired-title">Your session timed out</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary">Please log in again to continue. Redirecting you to the sign-in page…</Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="contained" onClick={goToLogin}>Log in now</Button>
      </DialogActions>
    </Dialog>
  </>;
}
