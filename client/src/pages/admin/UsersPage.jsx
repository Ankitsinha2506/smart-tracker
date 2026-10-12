import { SearchField } from '../../components/SearchField.jsx';
import { Add, DeleteOutlined, EditOutlined, GroupsOutlined, PersonOutlined, ShieldOutlined } from '@mui/icons-material';
import {
  Avatar,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import { EmptyState } from '../../components/EmptyState.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { PasswordField } from '../../components/PasswordField.jsx';
import { apiClient, getApiError } from '../../services/apiClient.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { useAuth } from '../../app/AuthContext.jsx';

const empty = { name: '', email: '', password: '', role: 'staff', status: 'active', student: '' };
const userFieldProps = {
  size: 'small',
  slotProps: { inputLabel: { shrink: true }, input: { notched: false } },
};
export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [dialog, setDialog] = useState({ open: false, user: null });
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) =>
      (roleFilter === 'all' || user.role === roleFilter) && [user.name, user.email, user.role, user.status].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [search, users, roleFilter]);
  const load = useCallback(async () => {
    try {
      const [userResponse, studentResponse] = await Promise.all([
        apiClient.get('/auth/users'),
        apiClient.get('/students', { params: { page: 1, limit: 100, sort: 'name_asc' } }),
      ]);
      setUsers(userResponse.data.data);
      setStudents(studentResponse.data.data);
      setError('');
    } catch (requestError) {
      setError(getApiError(requestError));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const open = (user = null) => {
    setDialog({ open: true, user });
    setForm(
      user
        ? {
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            status: user.status,
            student: user.student?._id || user.student || '',
          }
        : empty,
    );
  };
  const save = async () => {
    try {
      setSaving(true);
      if (dialog.user) {
        const payload = {
          name: form.name,
          ...(dialog.user.role !== 'admin' && { role: form.role }),
          status: form.status,
          student: form.role === 'student' ? form.student || null : null,
        };
        await apiClient.patch(`/auth/users/${dialog.user._id}`, payload);
      } else {
        await apiClient.post('/auth/users', {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          ...(form.role === 'student' && { student: form.student }),
        });
      }
      enqueueSnackbar('User saved', { variant: 'success' });
      setDialog({ open: false, user: null });
      load();
    } catch (requestError) {
      enqueueSnackbar(getApiError(requestError), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    try {
      setDeleting(true);
      await apiClient.delete(`/auth/users/${deleteUser._id}`);
      enqueueSnackbar('User permanently deleted', { variant: 'success' });
      setDeleteUser(null);
      load();
    } catch (requestError) {
      enqueueSnackbar(getApiError(requestError), { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };
  return (
    <>
      <PageHeader
        title="User management"
        description="Manage your team, account access, and sign-in security."
        action={
          <Button startIcon={<Add />} variant="contained" onClick={() => open()}>
            Add user
          </Button>
        }
      />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
        {[
          ['Total accounts', users.length, 'Everyone in your workspace', <GroupsOutlined />, 'primary.main'],
          ['Active users', users.filter((item) => item.status === 'active').length, 'Accounts with sign-in access', <PersonOutlined />, 'success.main'],
        ].map(([label, value, caption, icon, color]) => (
          <Paper key={label} variant="outlined" sx={{ p: 2.5, borderRadius: 3, boxShadow: 'none', backgroundImage: 'none', bgcolor: 'background.paper' }}>
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary" fontWeight={600}>{label}</Typography>
              <Avatar sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: 'action.hover', color }}>{icon}</Avatar>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800, mt: .5 }}>{value}</Typography>
            <Typography variant="caption" color="text.secondary">{caption}</Typography>
          </Paper>
        ))}
      </Box>
      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden', backgroundImage: 'none', bgcolor: 'background.paper', boxShadow: '0 8px 32px rgba(15,23,42,0.04)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} sx={{ p: 2.5, gap: 2, alignItems: { md: 'center' }, justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <SearchField
            size="small"
            label="Search users"
            placeholder="Search name, email, role or status"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ width: { xs: '100%', md: 360 }, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <ToggleButtonGroup exclusive value={roleFilter} onChange={(_, value) => value && setRoleFilter(value)} size="small" aria-label="Filter users by role" sx={{ '& .MuiToggleButton-root': { px: 2, textTransform: 'none' } }}>
            <ToggleButton value="all">All users</ToggleButton>
            <ToggleButton value="staff">Staff</ToggleButton>
            <ToggleButton value="student">Students</ToggleButton>
            <ToggleButton value="admin">Admins</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        {error ? (
          <EmptyState error={error} onRetry={load} />
        ) : !users.length ? (
          <EmptyState title="No users" />
        ) : !filteredUsers.length ? (
          <EmptyState title="No matching users" description="Try another search or role filter." />
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 1050, '& .MuiTableCell-root:first-of-type': { minWidth: 280 }, '& .MuiTableCell-root': { px: 2.5 }, '& .MuiTableHead-root .MuiTableCell-root': { bgcolor: 'action.hover', fontSize: 11, letterSpacing: '0.06em', fontWeight: 700, py: 1.75 }, '& .MuiTableBody-root .MuiTableCell-root': { py: 2 }, '& .MuiTableRow-root:last-child td': { borderBottom: 0 } }}>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last login</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id} hover>
                    <TableCell>
                      <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center' }}>
                        <Avatar sx={{ width: 42, height: 42, fontSize: 14, fontWeight: 700, bgcolor: user.role === 'admin' ? 'primary.main' : 'action.selected', color: user.role === 'admin' ? 'primary.contrastText' : 'primary.main' }}>{user.name?.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{user.name}{user._id === currentUser._id && <Typography component="span" variant="caption" color="text.secondary"> · You</Typography>}</Typography>
                          <Typography variant="caption" color="text.secondary">{user.email}</Typography>
                          {user.student?.candidateName && <Typography variant="caption" sx={{ display: 'block' }} color="text.secondary">Student: {user.student.candidateName}</Typography>}
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={user.role === 'admin' ? 'Super admin' : user.role}
                        icon={user.role === 'admin' ? <ShieldOutlined /> : undefined}
                        variant="outlined"
                        sx={{ textTransform: 'capitalize', borderRadius: 1.5 }}
                        color={user.role === 'admin' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={user.status}
                        variant="outlined"
                        sx={{ textTransform: 'capitalize', borderRadius: 1.5 }}
                        color={user.status === 'active' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'Not signed in yet'}</Typography>
                      {user.lastLoginAt && <Typography variant="caption" color="text.secondary">{new Date(user.lastLoginAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST</Typography>}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" aria-label={`Edit ${user.name}`} sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5, mr: 1 }} onClick={() => open(user)}>
                          <EditOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {user._id !== currentUser._id && (
                        <Tooltip title="Permanently delete user">
                          <IconButton size="small" aria-label={`Delete ${user.name}`} sx={{ border: 1, borderColor: 'divider', borderRadius: 1.5 }} color="error" onClick={() => setDeleteUser(user)}>
                            <DeleteOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Box sx={{ px: 2.5, py: 1.5, borderTop: 1, borderColor: 'divider' }}><Typography variant="caption" color="text.secondary">Showing {filteredUsers.length} of {users.length} accounts · Security changes apply at the next sign-in.</Typography></Box>
      </Paper>
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, user: null })}
        fullWidth
        maxWidth="sm"
        aria-labelledby="user-dialog-title"
      >
        <DialogTitle id="user-dialog-title" sx={{ px: { xs: 2, sm: 3 }, pt: 3, pb: 2 }}>
          {dialog.user ? 'Edit user' : 'Add user'}
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}>
          <Stack
            sx={{
              pt: 1,
              gap: 2.5,
              '& .MuiInputLabel-root': {
                position: 'static',
                transform: 'none',
                mb: 1,
                maxWidth: '100%',
                whiteSpace: 'normal',
              },
              '& .MuiFormHelperText-root': { mx: 0, mt: 1, lineHeight: 1.5 },
            }}
          >
            <TextField
              {...userFieldProps}
              label="Name"
              value={form.name}
              onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
            />
            <TextField
              {...userFieldProps}
              label="Email"
              type="email"
              disabled={Boolean(dialog.user)}
              value={form.email}
              onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
            />
            {!dialog.user && (
              <PasswordField
                {...userFieldProps}
                label="Temporary password"
                value={form.password}
                onChange={(event) =>
                  setForm((value) => ({ ...value, password: event.target.value }))
                }
                helperText="Uppercase, lowercase, number, and at least 8 characters"
              />
            )}
            <TextField
              {...userFieldProps}
              select
              label="Role"
              disabled={dialog.user?.role === 'admin'}
              value={form.role}
              onChange={(event) =>
                setForm((value) => ({ ...value, role: event.target.value, student: '' }))
              }
            >
              {dialog.user?.role === 'admin' && <MenuItem value="admin">Super admin</MenuItem>}
              <MenuItem value="student">Student</MenuItem>
              <MenuItem value="staff">Staff</MenuItem>
            </TextField>
            {form.role === 'student' && (
              <TextField
                {...userFieldProps}
                select
                label="Linked student"
                value={form.student}
                onChange={(event) =>
                  setForm((value) => ({ ...value, student: event.target.value }))
                }
              >
                <MenuItem value="">Select student</MenuItem>
                {students.map((student) => (
                  <MenuItem key={student._id} value={student._id}>
                    {student.candidateName} — {student.personalEmail}
                  </MenuItem>
                ))}
              </TextField>
            )}
            {dialog.user && (
              <TextField
                {...userFieldProps}
                select
                label="Status"
                value={form.status}
                onChange={(event) => setForm((value) => ({ ...value, status: event.target.value }))}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="locked">Locked</MenuItem>
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            '& .MuiButton-root': { minWidth: 104 },
          }}
        >
          <Button onClick={() => setDialog({ open: false, user: null })}>Cancel</Button>
          <Button
            variant="contained"
            onClick={save}
            disabled={
              saving ||
              !form.name ||
              (!dialog.user && (!form.email || !form.password)) ||
              (form.role === 'student' && !form.student)
            }
          >
            {saving ? 'Saving…' : 'Save user'}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={Boolean(deleteUser)}
        title="Permanently delete user?"
        message={`${deleteUser?.name || 'This user'} will be permanently removed from the database and can no longer sign in. Their email can be used for a new account. Existing candidate records and application history will be preserved. This cannot be undone.`}
        confirmLabel="Permanently delete"
        busy={deleting}
        onClose={() => setDeleteUser(null)}
        onConfirm={remove}
      />
    </>
  );
}
