import { Email, Update, WorkspacePremium } from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useSnackbar } from 'notistack';
import { EmptyState } from '../../components/EmptyState.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { StatCard } from '../../components/StatCard.jsx';
import { ApplicationCountDialog } from '../../features/students/ApplicationCountDialog.jsx';
import { apiClient, getApiError } from '../../services/apiClient.js';

export function MyProfilePage() {
  const { enqueueSnackbar } = useSnackbar();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState(false);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/students/me');
      setStudent(response.data.data);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const update = async (payload) => {
    try {
      const response = await apiClient.patch('/students/me/application-count', payload);
      enqueueSnackbar(`${response.data.data.history.dailyCount} applications recorded today`, {
        variant: 'success',
      });
      setDialog(false);
      load();
    } catch (requestError) {
      enqueueSnackbar(getApiError(requestError), { variant: 'error' });
      throw requestError;
    }
  };
  if (loading)
    return (
      <Stack py={10} alignItems="center">
        <CircularProgress />
      </Stack>
    );
  if (error) return <EmptyState error={error} onRetry={load} />;
  return (
    <>
      <PageHeader
        title="My profile"
        description="Review your placement profile and keep your Naukri total current."
        action={
          <Button variant="contained" startIcon={<Update />} onClick={() => setDialog(true)}>
            Update Naukri total
          </Button>
        }
      />
      <Box
        display="grid"
        gridTemplateColumns={{ xs: '1fr', lg: 'minmax(0,1.2fr) minmax(320px,.8fr)' }}
        gap={2.5}
      >
        <Paper sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            gap={2.5}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Avatar sx={{ width: 72, height: 72, bgcolor: 'primary.main', fontSize: 28 }}>
              {student.candidateName.slice(0, 2).toUpperCase()}
            </Avatar>
            <Box>
              <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
                <Typography variant="h5" fontWeight={750}>
                  {student.candidateName}
                </Typography>
                <Chip size="small" label={student.status} color="success" />
              </Stack>
              <Typography color="text.secondary">{student.technology?.name}</Typography>
            </Box>
          </Stack>
          <Divider sx={{ my: 3 }} />
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2,1fr)' }} gap={2.5}>
            <Detail icon={<Email />} label="Personal email" value={student.personalEmail} />
            <Detail icon={<Email />} label="Naukri email" value={student.naukriEmail} />
            <Detail
              icon={<WorkspacePremium />}
              label="Membership"
              value={
                student.membershipType === 'paid' && student.membershipPaidMonth
                  ? `Paid · ${student.membershipPaidMonth}`
                  : student.membershipType
              }
            />
          </Box>
        </Paper>
        <Stack gap={2}>
          <StatCard
            label="Current Naukri total"
            value={student.currentTotalApplicationCount}
            icon={<Update />}
          />
          <StatCard
            label="Applications today"
            value={student.todayApplicationCount}
            icon={<Update />}
            color="success.main"
          />
          <StatCard
            label="Previous-day total"
            value={student.previousDayApplicationCount}
            icon={<Update />}
            color="info.main"
          />
          {student.lastApplicationUpdateDate && (
            <Alert severity="info">
              Last updated {new Date(student.lastApplicationUpdateDate).toLocaleString()}
            </Alert>
          )}
        </Stack>
      </Box>
      <ApplicationCountDialog
        open={dialog}
        student={student}
        onClose={() => setDialog(false)}
        onSubmit={update}
      />
    </>
  );
}

function Detail({ icon, label, value }) {
  return (
    <Stack direction="row" gap={1.5} alignItems="center">
      <Avatar sx={{ bgcolor: 'action.hover', color: 'primary.main' }}>{icon}</Avatar>
      <Box>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography>{value || '—'}</Typography>
      </Box>
    </Stack>
  );
}
