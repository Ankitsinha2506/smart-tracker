import { PeopleOutlineOutlined, TrendingUp, HelpOutlineOutlined, DescriptionOutlined, Download, History, InsertChartOutlined, TableChartOutlined, PictureAsPdfOutlined, Refresh } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Chip,
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
import { useSnackbar } from 'notistack';
import { apiClient, getApiError } from '../../services/apiClient.js';

const isoDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function ReportsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const [form, setForm] = useState({
    name: 'Monthly application report',
    type: 'monthly',
    format: 'xlsx',
    from: isoDate(start),
    to: isoDate(today),
  });
  const [reports, setReports] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError('');
        const response = await apiClient.get('/reports', { params: { page, limit: meta.limit } });
        setReports(response.data.data);
        setMeta(response.data.meta.pagination);
      } catch (requestError) {
        setError(getApiError(requestError));
      } finally {
        setLoading(false);
      }
    },
    [meta.limit],
  );
  useEffect(() => {
    load();
  }, [load]);
  const generate = async () => {
    try {
      setGenerating(true);
      setError('');
      const response = await apiClient.post(
        '/reports/generate',
        { ...form, filters: {} },
        { responseType: 'blob' },
      );
      const disposition = response.headers['content-disposition'];
      const fileName =
        disposition?.match(/filename="([^"]+)"/)?.[1] || `smartapply-report.${form.format}`;
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      enqueueSnackbar('Report generated', { variant: 'success' });
      load();
    } catch (requestError) {
      let message = getApiError(requestError);
      if (requestError.response?.data instanceof Blob) {
        try {
          message = JSON.parse(await requestError.response.data.text()).message || message;
        } catch {
          /* use fallback */
        }
      }
      setError(message);
    } finally {
      setGenerating(false);
    }
  };
  const invalidRange = Boolean(form.from && form.to && form.from > form.to);
  const formats = [
    { value: 'xlsx', label: 'Excel', detail: '.xlsx', icon: TableChartOutlined },
    { value: 'pdf', label: 'PDF', detail: '.pdf', icon: PictureAsPdfOutlined },
    { value: 'csv', label: 'CSV', detail: '.csv', icon: DescriptionOutlined },
  ];
  const statusChip = (status) => (
    <Chip size="small" label={status} color={status === 'completed' ? 'success' : status === 'failed' ? 'error' : 'default'}
      variant="outlined" sx={{ textTransform: 'capitalize', fontWeight: 650 }} />
  );
  const dateLabel = (date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const rangeLabel = (report) => report.dateRange?.from && report.dateRange?.to
    ? `${dateLabel(report.dateRange.from)} – ${dateLabel(report.dateRange.to)}`
    : 'Date range unavailable';
  return (
    <Box sx={{ minWidth: 0, '& .MuiOutlinedInput-root': { borderRadius: 1.5, minHeight: 40 }, '& .MuiInputBase-input': { fontSize: 13 }, '& .MuiInputLabel-root': { position: 'static', transform: 'none', fontSize: 12, mb: 0.75 }, '& .MuiInputLabel-shrink': { transform: 'none' }, '& .MuiInputBase-root': { mt: 0 }, '& .MuiPaper-root': { backgroundImage: 'none' } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Box sx={{ display: 'flex', p: 1, borderRadius: 2, color: 'primary.main', bgcolor: 'action.selected' }}><InsertChartOutlined fontSize="small" /></Box>
        <Box>
          <Typography component="h1" sx={{ fontSize: 22, fontWeight: 750, letterSpacing: '-.03em' }}>Application reports</Typography>
          <Typography variant="body2" color="text.secondary">Your application activity, ready to share.</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, gap: 1.5, mb: 2.5 }}>
        {[
          { title: 'Candidate details', detail: 'One entry per candidate', icon: PeopleOutlineOutlined, color: 'primary.main' },
          { title: 'Period activity', detail: 'Applications added in your dates', icon: TrendingUp, color: 'success.main' },
          { title: 'Cumulative total', detail: 'Latest saved application count', icon: InsertChartOutlined, color: 'secondary.main' },
        ].map(({ title, detail, icon: Icon, color }) => (
          <Paper key={title} sx={{ p: 1.75, borderRadius: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, display: 'flex', borderRadius: 2, bgcolor: 'action.hover', color }}><Icon /></Box>
            <Box><Typography variant="body2" sx={{ fontWeight: 750 }}>{title}</Typography><Typography variant="caption" color="text.secondary">{detail}</Typography></Box>
          </Paper>
        ))}
      </Box>
      <Dialog open={guideOpen} onClose={() => setGuideOpen(false)} fullWidth maxWidth="sm" aria-labelledby="report-guide-title">
        <DialogTitle id="report-guide-title">Report guide</DialogTitle>
        <DialogContent>
          <Stack sx={{ gap: 2 }}>
            <Typography variant="body2">Includes candidates with recorded updates in your selected dates. Download as Excel, PDF or CSV.</Typography>
            <Typography variant="body2"><strong>Period activity:</strong> A count increasing from 100 to 125 means 25 applications added.</Typography>
            <Typography variant="body2"><strong>Cumulative total:</strong> The latest saved count, including updates after the selected period.</Typography>
            <Typography variant="body2"><strong>Completed:</strong> The file was generated. An empty report means no recorded updates matched the dates.</Typography>
            <Typography variant="body2"><strong>Period label:</strong> A category only; the From and To dates control the report.</Typography>
          </Stack>
        </DialogContent>
        <DialogActions><Button onClick={() => setGuideOpen(false)}>Got it</Button></DialogActions>
      </Dialog>
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', lg: '350px minmax(0, 1fr)' }, gap: 2, alignItems: 'start' }}>
        <Paper sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
          <Box sx={{ p: 2.5 }}>
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center', mb: 2.5 }}>
              <Box sx={{ p: 0.75, display: 'flex', borderRadius: 3, bgcolor: 'action.hover', color: 'primary.main' }}><InsertChartOutlined /></Box>
              <Box><Typography component="h2" variant="subtitle1" sx={{ fontWeight: 750 }}>Create report</Typography><Typography variant="body2" color="text.secondary">Select dates. Choose format. Download.</Typography></Box>
            </Stack>
            <Stack component="form" sx={{ gap: 2 }} onSubmit={(event) => { event.preventDefault(); if (!invalidRange) generate(); }}>
              <TextField size="small" fullWidth label="Report name" value={form.name} slotProps={{ htmlInput: { minLength: 2, maxLength: 160 }, inputLabel: { shrink: true } }} required
                onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))} />
              <Box>
                <TextField size="small" fullWidth select slotProps={{ inputLabel: { shrink: true } }} label="Period label" value={form.type} onChange={(event) => setForm((value) => ({ ...value, type: event.target.value }))}>
                  {['daily', 'weekly', 'monthly', 'yearly', 'custom'].map((value) => <MenuItem key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</MenuItem>)}
                </TextField>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2, mt: 2 }}>
                  <TextField size="small" fullWidth required type="date" label="From" value={form.from} onChange={(event) => setForm((value) => ({ ...value, from: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
                  <TextField size="small" fullWidth required type="date" label="To" value={form.to} error={invalidRange} helperText={invalidRange ? 'End date must be on or after start date.' : undefined} onChange={(event) => setForm((value) => ({ ...value, to: event.target.value }))} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: form.from } }} />
                </Box>
              </Box>
              <Box>
<Typography variant="caption" sx={{ display: 'block', fontWeight: 650, mb: 0.75 }}>Export format</Typography>
                <Box role="group" aria-label="Export format" sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
                  {formats.map(({ value, label, icon: Icon }) => (
                    <Button key={value} type="button" aria-pressed={form.format === value} onClick={() => setForm((previous) => ({ ...previous, format: value }))}
                      sx={{ flexDirection: 'row', gap: 0.75, px: 1, py: 1, minWidth: 0, borderRadius: 3, border: '1.5px solid', borderColor: form.format === value ? 'primary.main' : 'divider', bgcolor: form.format === value ? 'action.selected' : 'transparent', color: form.format === value ? 'primary.main' : 'text.secondary' }}>
                      <Icon sx={{ fontSize: 18 }} /><Typography variant="caption" sx={{ fontWeight: 700 }}>{label}</Typography>
                    </Button>
                  ))}
                </Box>
              </Box>
              <Button type="submit" variant="contained" size="medium" startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <Download />} disabled={generating || form.name.trim().length < 2 || !form.from || !form.to || invalidRange} sx={{ py: 1.1, borderRadius: 2.5 }}>
                {generating ? 'Generating report…' : 'Generate & download'}
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', mt: -1 }}>Downloads automatically when ready.</Typography>
            </Stack>
          </Box>
        </Paper>
        <Paper sx={{ minWidth: 0, borderRadius: 2.5, overflow: 'hidden' }}>
          <Stack direction="row" sx={{ gap: 1, alignItems: 'center', justifyContent: 'space-between', p: 2.5, borderBottom: 1, borderColor: 'divider' }}>
            <Box><Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}><Typography component="h2" variant="subtitle1" sx={{ fontWeight: 750 }}>Report history</Typography><Chip size="small" label={meta.total} /></Stack><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Your recent exports.</Typography></Box>
            <Button aria-label="Refresh report history" title="Refresh history" onClick={() => load(meta.page)} disabled={loading} sx={{ minWidth: 36, p: 1 }}><Refresh /></Button>
          </Stack>
          {loading ? (
            <Stack role="status" sx={{ gap: 2, py: 10, alignItems: 'center' }}><CircularProgress size={30} /><Typography variant="body2" color="text.secondary">Loading report history…</Typography></Stack>
          ) : !reports.length ? (
            <Stack sx={{ px: 3, py: 6, alignItems: 'center', textAlign: 'center' }}>
              <Box sx={{ p: 2, borderRadius: '50%', bgcolor: 'action.hover', color: 'primary.main', mb: 3, display: 'flex' }}><History sx={{ fontSize: 30 }} /></Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 750 }}>Your insights start here</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 310, lineHeight: 1.8 }}>Generated reports will appear here. Choose a period and export your first report.</Typography>
            </Stack>
          ) : (
            <>
              <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                <Table size="small" aria-label="Generated report history">
                  <TableHead><TableRow><TableCell>Report</TableCell><TableCell>Status</TableCell><TableCell align="right">Candidates</TableCell><TableCell>Created</TableCell></TableRow></TableHead>
                  <TableBody>{reports.map((report) => <TableRow key={report._id} hover>
                    <TableCell sx={{ maxWidth: 260 }}><Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>{report.name}</Typography><Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{report.type} · {report.format.toUpperCase()}</Typography><Typography variant="caption" display="block" color="text.secondary">{rangeLabel(report)}</Typography></TableCell>
                    <TableCell>{statusChip(report.status)}</TableCell><TableCell align="right"><Tooltip title={report.rowCount === 0 ? 'No recorded updates in the selected dates' : 'Number of candidates in this report'}><Chip size="small" label={report.rowCount === 0 ? 'Empty' : report.rowCount?.toLocaleString() ?? '—'} variant="outlined" /></Tooltip></TableCell><TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>{dateLabel(report.createdAt)}</TableCell>
                  </TableRow>)}</TableBody>
                </Table>
              </TableContainer>
              <Box sx={{ display: { xs: 'block', md: 'none' } }}>{reports.map((report) => <Box key={report._id} sx={{ p: 2.5, borderBottom: 1, borderColor: 'divider' }}>
                <Typography sx={{ fontWeight: 700, overflowWrap: 'anywhere', mb: 1 }}>{report.name}</Typography>
                <Stack direction="row" sx={{ gap: 1, alignItems: 'center', justifyContent: 'space-between' }}><Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{report.type} · {report.format.toUpperCase()} · {report.rowCount ?? '—'} candidates</Typography>{statusChip(report.status)}</Stack>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>{rangeLabel(report)} · Generated {dateLabel(report.createdAt)}</Typography>
                {report.rowCount === 0 && <Typography variant="caption" color="text.secondary">No activity in selected dates</Typography>}
              </Box>)}</Box>
              <TablePagination component="div" count={meta.total} page={meta.page - 1} rowsPerPage={meta.limit} rowsPerPageOptions={[10, 20, 50]} onPageChange={(_e, page) => load(page + 1)} onRowsPerPageChange={(event) => setMeta((value) => ({ ...value, page: 1, limit: Number(event.target.value) }))}
                sx={{ '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'flex-end', px: 1 }, '& .MuiTablePagination-spacer': { display: 'none' }, '& .MuiTablePagination-actions': { ml: 1 } }} />
            </>
          )}
          <Box sx={{ px: 2.5, py: 1, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="small" startIcon={<HelpOutlineOutlined />} onClick={() => setGuideOpen(true)}>Report guide</Button>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
}
