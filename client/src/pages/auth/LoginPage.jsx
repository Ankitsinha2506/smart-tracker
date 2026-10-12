import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import { useAuth } from '../../app/AuthContext.jsx';
import { PasswordField } from '../../components/PasswordField.jsx';
import { getApiError } from '../../services/apiClient.js';

const schema = yup.object({
  email: yup.string().email('Enter a valid email').required('Email is required'),
  password: yup.string().required('Password is required'),
  rememberMe: yup.boolean(),
});

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });
  const submit = async (values) => {
    try {
      setError('');
      const user = await login(values);
      const defaultPath = '/dashboard';
      const requestedPath = location.state?.from?.pathname;
      const destination =
        user.role === 'student' || !requestedPath || requestedPath === '/my-profile'
          ? defaultPath
          : requestedPath;
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError, 'Unable to sign in'));
    }
  };
  return (
    <Stack component="form" onSubmit={handleSubmit(submit)} sx={{ gap: 2, '& .MuiInputLabel-root': { position: 'static', transform: 'none', fontSize: 12, mb: 0.75 }, '& .MuiInputBase-root': { mt: 0, borderRadius: 1.5 }, '& .MuiInputBase-input': { fontSize: 14, py: 1.5 } }}>
      <div>
        <Typography sx={{ color: (theme) => theme.palette.mode === 'light' ? '#2563eb' : '#93bcff', fontSize: 10, fontWeight: 800, letterSpacing: 1.8, mb: 1.5 }}>WELCOME BACK</Typography>
        <Typography
          component="h1"
          variant="h3"
          sx={{
            fontSize: { xs: 27, sm: 30 },
            fontWeight: 850,
            letterSpacing: '-0.035em',
            background: (theme) =>
              theme.palette.mode === 'light'
                ? 'linear-gradient(135deg, #0f172a 0%, #334155 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Sign in to your workspace
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 1, mb: 1.5 }}>
          Enter your email and password to continue.
        </Typography>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        size="small"
        type="email"
        slotProps={{ inputLabel: { shrink: true } }}
        label="Registered email address"
        placeholder="you@example.com"
        autoComplete="email"
        {...register('email')}
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
      />
      <PasswordField
        size="small"
        slotProps={{ inputLabel: { shrink: true } }}
        label="Password"
        placeholder="Enter your password"
        autoComplete="current-password"
        {...register('password')}
        error={Boolean(errors.password)}
        helperText={errors.password?.message}
      />
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
        <FormControlLabel sx={{ mr: 0, '& .MuiFormControlLabel-label': { fontSize: 12 } }} control={<Checkbox {...register('rememberMe')} />} label="Remember me" />
        <Link
          component={RouterLink}
          to="/forgot-password"
          sx={{ fontWeight: 650, fontSize: 12 }}
        >
          Forgot password?
        </Link>
      </Stack>
      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isSubmitting}
        sx={{ py: 1.4, fontSize: 14, fontWeight: 700, borderRadius: 1.5, background: '#2563eb', boxShadow: '0 10px 24px -10px #2563eb66', '&:hover': { background: '#1d4ed8' } }}
      >
        {isSubmitting ? 'Signing in…' : 'Sign in'}
      </Button>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textAlign: 'center', mt: 1, fontWeight: 550 }}
      >
        Your workspace. Your next step forward.
      </Typography>
    </Stack>
  );
}
