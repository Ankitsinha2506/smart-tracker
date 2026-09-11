import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, Button, Paper, Stack } from '@mui/material';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import * as yup from 'yup';
import { useAuth } from '../app/AuthContext.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PasswordField } from '../components/PasswordField.jsx';
import { apiClient, getApiError, setAccessToken } from '../services/apiClient.js';

const schema = yup.object({
  currentPassword: yup.string().required(),
  newPassword: yup.string().min(8).matches(/[a-z]/).matches(/[A-Z]/).matches(/[0-9]/).required(),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('newPassword')], 'Passwords must match')
    .required(),
});
export function SettingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) });
  const submit = async ({ currentPassword, newPassword }) => {
    try {
      setError('');
      await apiClient.patch('/auth/change-password', { currentPassword, newPassword });
      setAccessToken(null);
      await logout();
      navigate('/login', { replace: true });
    } catch (requestError) {
      setError(getApiError(requestError));
    }
  };
  return (
    <>
      <PageHeader title="Security" description="Update your SmartApply account password." />
      <Paper sx={{ p: 3, maxWidth: 620 }}>
        <Stack component="form" gap={2} onSubmit={handleSubmit(submit)}>
          {error && <Alert severity="error">{error}</Alert>}
          <PasswordField
            label="Current password"
            {...register('currentPassword')}
            error={Boolean(errors.currentPassword)}
            helperText={errors.currentPassword?.message}
          />
          <PasswordField
            label="New password"
            {...register('newPassword')}
            error={Boolean(errors.newPassword)}
            helperText={
              errors.newPassword?.message ||
              'Uppercase, lowercase, number, and at least 8 characters'
            }
          />
          <PasswordField
            label="Confirm new password"
            {...register('confirmPassword')}
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword?.message}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{ alignSelf: 'flex-start' }}
          >
            {isSubmitting ? 'Updating…' : 'Change password'}
          </Button>
        </Stack>
      </Paper>
    </>
  );
}
