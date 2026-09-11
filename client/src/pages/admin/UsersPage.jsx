import { SearchField } from '../../components/SearchField.jsx';
import { Add, Delete, Edit } from '@mui/icons-material';
import {
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
  const [deleteUser, setDeleteUser] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      [user.name, user.email, user.role, user.status].some((value) =>
        String(value || '')
          .toLowerCase()
          .includes(term),
      ),
    );
  }, [search, users]);
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
      enqueueSnackbar('User access deleted', { variant: 'success' });
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
        title="Users"
        description="Create staff login credentials and manage account access."
        action={
          <Button startIcon={<Add />} variant="contained" onClick={() => open()}>
            Add staff user
          </Button>
        }
      />
      <Paper>
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          <SearchField
            size="small"
            label="Search users"
            placeholder="Search name, email, role or status"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ maxWidth: 520 }}
          />
        </Box>
        {error ? (
          <EmptyState error={error} onRetry={load} />
        ) : !users.length ? (
          <EmptyState title="No users" />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Linked student</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last login</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <strong>{user.name}</strong>
                      <div>{user.email}</div>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={user.role === 'admin' ? 'Super admin' : user.role}
                        color={user.role === 'admin' ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{user.student?.candidateName || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={user.status}
                        color={user.status === 'active' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton onClick={() => open(user)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
                      {user._id !== currentUser._id && (
                        <Tooltip title="Delete user access">
                          <IconButton color="error" onClick={() => setDeleteUser(user)}>
                            <Delete />
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
      </Paper>
      <Dialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, user: null })}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{dialog.user ? 'Edit user' : 'Add user'}</DialogTitle>
        <DialogContent>
          <Stack pt={1} gap={2}>
            <TextField
              label="Name"
              value={form.name}
              onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
            />
            <TextField
              label="Email"
              type="email"
              disabled={Boolean(dialog.user)}
              value={form.email}
              onChange={(event) => setForm((value) => ({ ...value, email: event.target.value }))}
            />
            {!dialog.user && (
              <PasswordField
                label="Temporary password"
                value={form.password}
                onChange={(event) =>
                  setForm((value) => ({ ...value, password: event.target.value }))
                }
                helperText="Uppercase, lowercase, number, and at least 8 characters"
              />
            )}
            <TextField
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
        <DialogActions>
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
        title="Delete user access?"
        message={`${deleteUser?.name || 'This user'} will no longer be able to sign in. Existing student and application history will be preserved.`}
        confirmLabel="Delete user"
        busy={deleting}
        onClose={() => setDeleteUser(null)}
        onConfirm={remove}
      />
    </>
  );
}
