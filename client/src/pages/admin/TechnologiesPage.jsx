import { Add, Edit } from '@mui/icons-material';
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useSnackbar } from 'notistack';
import { EmptyState } from '../../components/EmptyState.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { apiClient, getApiError } from '../../services/apiClient.js';

const empty = { name: '', slug: '', description: '', isActive: true };
export function TechnologiesPage() {
  const { enqueueSnackbar } = useSnackbar();
  const [items, setItems] = useState([]);
  const [dialog, setDialog] = useState({ open: false, item: null });
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await apiClient.get('/technologies');
      setItems(response.data.data);
      setError('');
    } catch (requestError) {
      setError(getApiError(requestError));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const open = (item = null) => {
    setDialog({ open: true, item });
    setForm(
      item
        ? {
            name: item.name,
            slug: item.slug,
            description: item.description || '',
            isActive: item.isActive,
          }
        : empty,
    );
  };
  const save = async () => {
    try {
      setSaving(true);
      if (dialog.item) await apiClient.patch(`/technologies/${dialog.item._id}`, form);
      else {
        const payload = { name: form.name, slug: form.slug, description: form.description };
        await apiClient.post('/technologies', payload);
      }
      enqueueSnackbar('Technology saved', { variant: 'success' });
      setDialog({ open: false, item: null });
      load();
    } catch (requestError) {
      enqueueSnackbar(getApiError(requestError), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <PageHeader
        title="Technologies"
        description="Maintain the technology catalog used by student profiles."
        action={
          <Button variant="contained" startIcon={<Add />} onClick={() => open()}>
            Add technology
          </Button>
        }
      />
      <Paper>
        {error ? (
          <EmptyState error={error} onRetry={load} />
        ) : !items.length ? (
          <EmptyState title="No technologies" />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Slug</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <strong>{item.name}</strong>
                    </TableCell>
                    <TableCell>{item.slug}</TableCell>
                    <TableCell>{item.description || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.isActive ? 'Active' : 'Inactive'}
                        color={item.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton onClick={() => open(item)}>
                          <Edit />
                        </IconButton>
                      </Tooltip>
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
        onClose={() => setDialog({ open: false, item: null })}
        fullWidth
        maxWidth="sm"
        aria-labelledby="technology-dialog-title"
        slotProps={{ paper: { sx: {
          maxWidth: 480,
          m: { xs: 2, sm: 4 },
          width: { xs: 'calc(100% - 32px)', sm: '100%' },
          borderRadius: 3,
          '& .MuiInputLabel-root': { position: 'static', transform: 'none', mb: 0.75, fontSize: 12 },
          '& .MuiInputBase-root': { mt: 0, borderRadius: 1.5 },
          '& .MuiInputBase-input': { fontSize: 14 },
        } } }}
      >
        <DialogTitle id="technology-dialog-title" sx={{ px: 3, pt: 2.5, pb: 2, fontSize: 19 }}>{dialog.item ? 'Edit technology' : 'Add technology'}</DialogTitle>
        <DialogContent sx={{ px: 3, pb: 2.5 }}>
          <Stack sx={{ pt: 0.5, gap: 2 }}>
            <TextField
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              label="Name"
              value={form.name}
              onChange={(event) =>
                setForm((value) => ({
                  ...value,
                  name: event.target.value,
                  ...(!dialog.item && {
                    slug: event.target.value
                      .toLowerCase()
                      .trim()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, ''),
                  }),
                }))
              }
            />
            <TextField
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              label="Slug"
              value={form.slug}
              onChange={(event) => setForm((value) => ({ ...value, slug: event.target.value }))}
            />
            <TextField
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
              multiline
              rows={3}
              label="Description"
              value={form.description}
              onChange={(event) =>
                setForm((value) => ({ ...value, description: event.target.value }))
              }
            />
            {dialog.item && (
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                Active{' '}
                <Switch
                  slotProps={{ input: { 'aria-label': 'Active technology' } }}
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm((value) => ({ ...value, isActive: event.target.checked }))
                  }
                />
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => setDialog({ open: false, item: null })}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving || !form.name || !form.slug}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
