import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import * as yup from 'yup';
import { PasswordField } from '../../components/PasswordField.jsx';
import { apiClient, getApiError } from '../../services/apiClient.js';

const schema = yup.object({
  token: yup.string().length(64).required('Reset token is required'),
  password: yup.string().min(8).matches(/[a-z]/).matches(/[A-Z]/).matches(/[0-9]/).required(),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required(),
});
export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { token: params.get('token') || '' },
  });
  const submit = async ({ token, password }) => {
    try {
      setError('');
      await apiClient.post('/auth/reset-password', { token, password });
      setMessage('Password reset successfully. You can sign in now.');
    } catch (requestError) {
      setError(getApiError(requestError));
    }
  };
  return (
    <Stack component="form" onSubmit={handleSubmit(submit)} gap={2}>
      <Typography component="h2" variant="h5" fontWeight={750}>
        Choose a new password
      </Typography>
      {message && <Alert severity="success">{message}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <TextField
        label="Reset token"
        {...register('token')}
        error={Boolean(errors.token)}
        helperText={errors.token?.message}
      />
      <PasswordField
        label="New password"
        {...register('password')}
        error={Boolean(errors.password)}
        helperText={
          errors.password?.message ||
          'At least 8 characters with uppercase, lowercase, and a number'
        }
      />
      <PasswordField
        label="Confirm password"
        {...register('confirmPassword')}
        error={Boolean(errors.confirmPassword)}
        helperText={errors.confirmPassword?.message}
      />
      <Button type="submit" variant="contained" disabled={isSubmitting}>
        {isSubmitting ? 'Resetting…' : 'Reset password'}
      </Button>
      <Link component={RouterLink} to="/login" textAlign="center">
        Back to sign in
      </Link>
    </Stack>
  );
}
