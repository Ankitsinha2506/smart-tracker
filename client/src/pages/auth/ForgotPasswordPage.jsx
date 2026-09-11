import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
import * as yup from 'yup';
import { apiClient, getApiError } from '../../services/apiClient.js';

const schema = yup.object({ email: yup.string().email().required('Email is required') });
export function ForgotPasswordPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) });
  const submit = async (values) => {
    try {
      setError('');
      const response = await apiClient.post('/auth/forgot-password', values);
      const token = response.data.data?.resetToken;
      setMessage(token ? `Development reset token: ${token}` : response.data.message);
    } catch (requestError) {
      setError(getApiError(requestError));
    }
  };
  return (
    <Stack component="form" onSubmit={handleSubmit(submit)} gap={2.25}>
      <div>
        <Typography component="h2" variant="h5" fontWeight={750}>
          Reset your password
        </Typography>
        <Typography color="text.secondary" mt={0.5}>
          We’ll send instructions if the account exists.
        </Typography>
      </div>
      {message && (
        <Alert severity="success" sx={{ overflowWrap: 'anywhere' }}>
          {message}
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label="Email address"
        {...register('email')}
        error={Boolean(errors.email)}
        helperText={errors.email?.message}
      />
      <Button type="submit" variant="contained" disabled={isSubmitting}>
        {isSubmitting ? 'Submitting…' : 'Send reset instructions'}
      </Button>
      <Link component={RouterLink} to="/login" textAlign="center">
        Back to sign in
      </Link>
    </Stack>
  );
}
