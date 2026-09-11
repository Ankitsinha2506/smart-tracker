import { Download, Refresh } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../app/AuthContext.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { apiClient, getApiError } from '../services/apiClient.js';
import { exportHistoryExcel } from '../utils/excelExport.js';

const isoDate = (date) => date.toISOString().slice(0, 10);

export function HistoryPage() {
  const { user } = useAuth();
  const manager = ['admin', 'staff'].includes(user.role);
  const now = new Date();
  const earlier = new Date();
  earlier.setDate(now.getDate() - 30);
  const [query, setQuery] = useState({
    page: 1,
    limit: 20,
    from: isoDate(earlier),
    to: isoDate(now),
    sort: 'newest',
    staff: '',
  });
  const [staffUsers, setStaffUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (user.role === 'admin') {
      apiClient
        .get('/auth/users')
        .then((response) =>
          setStaffUsers(
            response.data.data.filter((item) => item.role === 'staff' && item.status === 'active'),
          ),
        )
        .catch(() => {});
    }
  }, [user.role]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = Object.fromEntries(
        Object.entries(query).filter(([, value]) => value !== '' && value !== null),
      );
      const response = await apiClient.get('/application-history', { params });
      setItems(response.data.data);
      setMeta(response.data.meta.pagination);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      await exportHistoryExcel(
        items,
        `SmartApply_History_${query.from || 'start'}_to_${query.to || 'now'}.xlsx`,
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2.5 }}>
        <Box>
          <Typography component="h1" sx={{ fontSize: 22, fontWeight: 750, letterSpacing: '-.03em' }}>{manager ? 'Application history' : 'My application history'}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Track daily updates and application totals.</Typography>
        </Box>
        <Button size="small" startIcon={<Download />} variant="contained" onClick={handleExportExcel} disabled={!items.length || exporting || loading} sx={{ borderRadius: 2, px: 2 }}>
          {exporting ? 'Exporting…' : 'Export this page'}
        </Button>
      </Box>
      <Paper component="section" aria-label="History filters" sx={{ p: 2, mb: 2, borderRadius: 2.5,
        '& .MuiFormControl-root': { minWidth: 0 },
        '& .MuiInputLabel-root': { position: 'static', transform: 'none', mb: 0.75, fontSize: 12 },
        '& .MuiInputBase-root': { mt: 0, minHeight: 40, borderRadius: 1.5 },
        '& .MuiInputBase-input': { fontSize: 13 },
      }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))', lg: `repeat(${user.role === 'admin' ? 4 : 3}, minmax(0, 1fr)) auto` }, gap: 1.5, alignItems: 'end' }}>
          <TextField
            size="small"
            type="date"
            label="From"
            value={query.from}
            onChange={(event) =>
              setQuery((value) => ({ ...value, from: event.target.value, page: 1 }))
            }
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            value={query.to}
            onChange={(event) =>
              setQuery((value) => ({ ...value, to: event.target.value, page: 1 }))
            }
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {user.role === 'admin' && (
            <TextField
              select
              size="small"
              label="Applied by"
              value={query.staff}
              onChange={(event) =>
                setQuery((value) => ({ ...value, staff: event.target.value, page: 1 }))
              }
              slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
            >
              <MenuItem value="">All staff</MenuItem>
              {staffUsers.map((staff) => (
                <MenuItem key={staff._id} value={staff._id}>
                  {staff.name}
                </MenuItem>
              ))}
            </TextField>
          )}
          <TextField
            select
            size="small"
            label="Sort"
            value={query.sort}
            onChange={(event) =>
              setQuery((value) => ({ ...value, sort: event.target.value, page: 1 }))
            }
            slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
          >
            <MenuItem value="newest">Newest</MenuItem>
            <MenuItem value="oldest">Oldest</MenuItem>
            <MenuItem value="applications_high">Highest applied</MenuItem>
            <MenuItem value="applications_low">Lowest applied</MenuItem>
          </TextField>
          <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={load} disabled={loading} sx={{ borderRadius: 1.5, height: 40 }}>
            Refresh
          </Button>
        </Box>
      </Paper>
      <Paper sx={{ borderRadius: 2.5, overflow: 'hidden', minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2">Activity log</Typography>
          <Chip size="small" label={`${meta.total} records`} sx={{ height: 22, fontSize: 11 }} />
        </Box>
        {loading ? (
          <Stack sx={{ py: 6, alignItems: 'center' }}>
            <CircularProgress />
          </Stack>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <EmptyState error={error} onRetry={load} />
          </Box>
        ) : !items.length ? (
          <EmptyState
            title="No history in this period"
            description="Application updates will appear here automatically."
          />
        ) : (
          <>
            <TableContainer sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 0 }}>
              <Table size="small" aria-label="Application history" sx={{ '& .MuiTableCell-root': { px: 1.5, py: 1.25, fontSize: 12, maxWidth: 210, overflowWrap: 'anywhere' }, '& .MuiTableCell-head': { fontSize: 10, letterSpacing: '.04em' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    {manager && <TableCell>Student</TableCell>}
                    {user.role === 'admin' && <TableCell>Applied by</TableCell>}
                    <TableCell align="right">Previous</TableCell>
                    <TableCell align="right">Current</TableCell>
                    <TableCell align="right">Daily</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Note</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item._id} hover>
                      <TableCell>{new Date(item.applicationDate).toLocaleDateString()}</TableCell>
                      {manager && (
                        <TableCell>
                          <strong>{item.student?.candidateName}</strong>
                        </TableCell>
                      )}
                      {user.role === 'admin' && (
                        <TableCell>
                          <strong>{item.recordedBy?.name || 'Unknown user'}</strong>
                          <Box sx={{ color: 'text.secondary', fontSize: 12, overflowWrap: 'anywhere' }}>
                            {item.recordedBy?.email}
                          </Box>
                        </TableCell>
                      )}
                      <TableCell align="right">{item.previousCount}</TableCell>
                      <TableCell align="right">{item.currentCount}</TableCell>
                      <TableCell align="right">
                        <Chip size="small" color="success" label={`+${item.dailyCount}`} />
                      </TableCell>
                      <TableCell>{item.source}</TableCell>
                      <TableCell>{item.note || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: { xs: 'block', md: 'none' } }}>
              {items.map((item) => (
                <Box key={item._id} sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 1, mb: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      {manager && <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{item.student?.candidateName || 'Unknown student'}</Typography>}
                      <Typography variant="caption" color="text.secondary">{new Date(item.applicationDate).toLocaleDateString()}</Typography>
                    </Box>
                    <Chip size="small" color="success" label={`+${item.dailyCount} daily`} sx={{ height: 24, fontSize: 11 }} />
                  </Box>
                  <Typography variant="body2">{item.previousCount} → <strong>{item.currentCount}</strong> total applications</Typography>
                  {user.role === 'admin' && <Box sx={{ mt: 1, overflowWrap: 'anywhere' }}><Typography variant="caption" color="text.secondary">Applied by {item.recordedBy?.name || 'Unknown user'}{item.recordedBy?.email ? ` · ${item.recordedBy.email}` : ''}</Typography></Box>}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75, overflowWrap: 'anywhere' }}>Source: {item.source}{item.note ? ` · ${item.note}` : ''}</Typography>
                </Box>
              ))}
            </Box>
            <TablePagination
              sx={{ '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'flex-end', px: 1 }, '& .MuiTablePagination-spacer': { display: 'none' }, '& .MuiTablePagination-actions': { ml: 1 } }}
              component="div"
              count={meta.total}
              page={meta.page - 1}
              rowsPerPage={meta.limit}
              rowsPerPageOptions={[10, 20, 50]}
              onPageChange={(_e, page) => setQuery((value) => ({ ...value, page: page + 1 }))}
              onRowsPerPageChange={(event) =>
                setQuery((value) => ({ ...value, page: 1, limit: Number(event.target.value) }))
              }
            />
          </>
        )}
      </Paper>
    </Box>
  );
}
