import {
  AccountCircle,
  CalendarMonth,
  ContentCopy,
  Email,
  Key,
  Visibility,
  VisibilityOff,
  Work,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useSnackbar } from 'notistack';
import { apiClient, getApiError } from '../../services/apiClient.js';

function Detail({ label, value, icon }) {
  return (
    <Stack direction="row" sx={{ gap: 1.5, alignItems: 'flex-start', minWidth: 0 }}>
      <Avatar sx={{ width: 36, height: 36, bgcolor: 'rgba(91,91,214,.10)', color: 'primary.main' }}>
        {icon}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography sx={{ fontWeight: 650, overflowWrap: 'anywhere' }}>{value || '—'}</Typography>
      </Box>
    </Stack>
  );
}

function Section({ title, children }) {
  return (
    <Box>
      <Typography
        variant="overline"
        sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: '.12em' }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))' },
          gap: 2.5,
          mt: 1.5,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export function StudentDetailsDialog({ student, onClose, onEdit }) {
  const { enqueueSnackbar } = useSnackbar();
  const [password, setPassword] = useState('');
  const [revealing, setRevealing] = useState(false);
  const [credentialError, setCredentialError] = useState('');
  useEffect(() => {
    setPassword('');
    setCredentialError('');
  }, [student?._id]);
  if (!student) return null;

  const revealPassword = async () => {
    if (password) {
      setPassword('');
      return;
    }
    try {
      setRevealing(true);
      setCredentialError('');
      const response = await apiClient.get(`/students/${student._id}/naukri-credential`);
      setPassword(response.data.data.password);
    } catch (error) {
      setCredentialError(getApiError(error, 'Unable to reveal Naukri password'));
    } finally {
      setRevealing(false);
    }
  };
  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      enqueueSnackbar(`${label} copied`, { variant: 'success' });
    } catch {
      enqueueSnackbar(`Unable to copy ${label.toLowerCase()}. Please copy it manually.`, { variant: 'error' });
    }
  };
  const nameParts = (student.candidateName || '').trim().split(/\s+/).filter(Boolean);
  const initials = nameParts.length
    ? [nameParts[0], ...(nameParts.length > 1 ? [nameParts.at(-1)] : [])]
        .map(part => Array.from(part)[0]).join('').toLocaleUpperCase()
    : '?';
  const date = (value) => (value ? new Date(value).toLocaleString() : '—');
  return (
    <Dialog open fullWidth maxWidth="md" onClose={onClose} scroll="paper">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 2 }}>
          <Avatar aria-label={`${student.candidateName || 'Candidate'} initials`} sx={{ width: 52, height: 52, flexShrink: 0, bgcolor: 'primary.main', color: 'primary.contrastText', WebkitTextFillColor: 'currentColor', fontFamily: 'Arial, sans-serif', fontSize: 20, lineHeight: 1, fontWeight: 800 }}>
            {initials}
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5">{student.candidateName}</Typography>
            <Stack direction="row" sx={{ gap: 1, mt: 0.6, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={student.status}
                color={
                  student.status === 'active'
                    ? 'success'
                    : student.status === 'placed'
                      ? 'primary'
                      : 'default'
                }
              />
              <Chip
                size="small"
                label={`${student.membershipType} membership`}
                color={student.membershipType === 'paid' ? 'warning' : 'default'}
              />
            </Stack>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: '20px !important' }}>
        <Stack sx={{ gap: 3 }}>
          <Section title="Personal information">
            <Detail
              label="Personal email"
              value={student.personalEmail}
              icon={<Email fontSize="small" />}
            />
            <Detail
              label="Mobile number"
              value={student.mobileNumber}
              icon={<AccountCircle fontSize="small" />}
            />
          </Section>
          <Divider />
          <Section title="Placement profile">
            <Detail
              label="Technology"
              value={student.technology?.name || student.technology}
              icon={<Work fontSize="small" />}
            />
            {student.membershipType === 'paid' && (
              <Detail
                label="Paid month"
                value={student.membershipPaidMonth}
                icon={<CalendarMonth fontSize="small" />}
              />
            )}
            <Detail
              label="Current applications"
              value={Number(student.currentTotalApplicationCount || 0).toLocaleString()}
              icon={<Work fontSize="small" />}
            />
            <Detail
              label="Applications today"
              value={`+${Number(student.todayApplicationCount || 0).toLocaleString()}`}
              icon={<Work fontSize="small" />}
            />
            <Detail
              label="Last application update"
              value={date(student.lastApplicationUpdateDate)}
              icon={<CalendarMonth fontSize="small" />}
            />
          </Section>
          <Divider />
          <Box>
            <Typography
              variant="overline"
              sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: '.12em' }}
            >
              Naukri account
            </Typography>
            <Box
              sx={{
                mt: 1.5,
                p: 2.5,
                borderRadius: 2.5,
                bgcolor: 'rgba(91,91,214,.06)',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Stack sx={{ gap: 2 }}>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
                  <Email color="primary" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      Naukri email
                    </Typography>
                    <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                      {student.naukriEmail}
                    </Typography>
                  </Box>
                  <Tooltip title="Copy email">
                    <IconButton onClick={() => copy(student.naukriEmail, 'Naukri email')}>
                      <ContentCopy />
                    </IconButton>
                  </Tooltip>
                </Stack>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
                  <Key color="primary" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                      Naukri password
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: password ? 'monospace' : 'inherit',
                        fontWeight: 700,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {password || '••••••••••••'}
                    </Typography>
                  </Box>
                  {password && (
                    <Tooltip title="Copy password">
                      <IconButton onClick={() => copy(password, 'Password')}>
                        <ContentCopy />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Button
                    startIcon={password ? <VisibilityOff /> : <Visibility />}
                    onClick={revealPassword}
                    disabled={revealing}
                  >
                    {revealing ? 'Loading…' : password ? 'Hide' : 'Reveal'}
                  </Button>
                </Stack>
                {credentialError && <Alert severity="error">{credentialError}</Alert>}
              </Stack>
            </Box>
          </Box>
          <Divider />
          <Section title="Record information">
            <Detail
              label="Added by"
              value={student.createdBy?.name || 'Super admin'}
              icon={<AccountCircle fontSize="small" />}
            />
            <Detail
              label="Created"
              value={date(student.createdAt)}
              icon={<CalendarMonth fontSize="small" />}
            />
            <Detail
              label="Last updated"
              value={date(student.updatedAt)}
              icon={<CalendarMonth fontSize="small" />}
            />
          </Section>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={() => onEdit(student)}>
          Edit student
        </Button>
      </DialogActions>
    </Dialog>
  );
}
