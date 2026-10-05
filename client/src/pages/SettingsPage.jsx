import { yupResolver } from '@hookform/resolvers/yup';
import { Alert, Box, Button, Chip, Divider, Paper, Stack, Switch, Typography } from '@mui/material';
import { LockOutlined, VerifiedUserOutlined } from '@mui/icons-material';
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
  const { logout, user, restoreSession } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [enabled, setEnabled] = useState(Boolean(user?.twoStepEnabled));
  const [securityPassword, setSecurityPassword] = useState('');
  const [securityMessage, setSecurityMessage] = useState(null);
  const [saving, setSaving] = useState(false);
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
      <PageHeader title="Security" description="Manage your password and how you verify your account." />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 3, alignItems: 'start', '& .MuiInputBase-root': { borderRadius: 2 }, '& .MuiButton-root': { borderRadius: 2, px: 3, py: 1.2 }, '& .MuiFormHelperText-root': { mx: 0 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 3.5 }, minWidth: 0, borderRadius: 3 }}>
        <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', p: 1.25, borderRadius: 2, bgcolor: 'action.hover', color: 'primary.main' }}><VerifiedUserOutlined /></Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">Two-step verification</Typography>
            <Typography variant="body2" color="text.secondary">An extra layer of account security</Typography>
          </Box>
          <Chip size="small" label={user?.twoStepEnabled ? 'Enabled' : 'Disabled'} color={user?.twoStepEnabled ? 'success' : 'default'} variant="outlined" />
        </Stack>
        <Divider sx={{ mb: 3 }} />
        <Stack component="form" sx={{ gap: 2.5 }} onSubmit={async (event) => {
          event.preventDefault(); setSaving(true); setSecurityMessage(null);
          try {
            await apiClient.patch('/auth/two-step', { enabled, currentPassword: securityPassword });
            await restoreSession(); setSecurityPassword('');
            setSecurityMessage({ severity: 'success', text: 'Two-step verification updated.' });
          } catch (requestError) { setSecurityMessage({ severity: 'error', text: getApiError(requestError) }); }
          finally { setSaving(false); }
        }}>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>Receive a verification code at your registered email every time you sign in.</Typography>
          {securityMessage && <Alert severity={securityMessage.severity}>{securityMessage.text}</Alert>}
          <Stack direction="row" sx={{ gap: 2, alignItems: 'center', justifyContent: 'space-between', p: 2, border: 1, borderColor: 'divider', borderRadius: 2, bgcolor: 'action.hover' }}>
            <Box>
              <Typography id="two-step-label" variant="subtitle2">Email verification</Typography>
              <Typography variant="body2" color="text.secondary">{enabled ? 'Require a code for every login' : 'Sign in with your password only'}</Typography>
            </Box>
            <Switch checked={enabled} disabled={saving} onChange={(event) => setEnabled(event.target.checked)} slotProps={{ input: { 'aria-labelledby': 'two-step-label' } }} />
          </Stack>
          <PasswordField label="Confirm current password" autoComplete="current-password" fullWidth size="small" value={securityPassword} onChange={(event) => setSecurityPassword(event.target.value)} required />
          <Typography variant="caption" color="text.secondary">When enabled, every login requires your password and an email verification code.</Typography>
          <Button sx={{ alignSelf: { xs: 'stretch', sm: 'flex-start' } }} type="submit" variant="contained" disabled={saving || !securityPassword}>{saving ? 'Saving…' : 'Save verification settings'}</Button>
        </Stack>
      </Paper>
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
