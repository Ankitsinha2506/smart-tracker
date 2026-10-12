import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, Box, Button, Divider, Paper, Stack, Typography } from '@mui/material';
import { LockOutlined } from '@mui/icons-material';
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
      <PageHeader title="Security" description="Manage your account password." />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 640px)' }, gap: 3, alignItems: 'start', '& .MuiInputBase-root': { borderRadius: 2 }, '& .MuiButton-root': { borderRadius: 2, px: 3, py: 1.2 }, '& .MuiFormHelperText-root': { mx: 0 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 }, minWidth: 0, borderRadius: 3 }}>
        <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', p: 1.25, borderRadius: 2, bgcolor: 'action.hover', color: 'primary.main' }}><LockOutlined /></Box>
          <Box>
            <Typography variant="h6">Change password</Typography>
            <Typography variant="body2" color="text.secondary">Keep your account credentials up to date</Typography>
          </Box>
        </Stack>
        <Divider sx={{ mb: 3 }} />
        <Stack component="form" sx={{ gap: 2.5 }} onSubmit={handleSubmit(submit)}>
          {error && <Alert severity="error">{error}</Alert>}
          <PasswordField
            fullWidth
            size="small"
            label="Current password"
            autoComplete="current-password"
            {...register('currentPassword')}
            error={Boolean(errors.currentPassword)}
            helperText={errors.currentPassword?.message}
          />
          <PasswordField
            fullWidth
            size="small"
            label="New password"
            autoComplete="new-password"
            {...register('newPassword')}
            error={Boolean(errors.newPassword)}
            helperText={
              errors.newPassword?.message ||
              'Uppercase, lowercase, number, and at least 8 characters'
            }
          />
          <PasswordField
            fullWidth
            size="small"
            label="Confirm new password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword?.message}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }}
          >
            {isSubmitting ? 'Updating…' : 'Change password'}
          </Button>
        </Stack>
      </Paper>
      </Box>
    </>
  );
}
