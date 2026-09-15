import { FilterPanel } from '../../components/FilterPanel.jsx';
import { SearchField } from '../../components/SearchField.jsx';
import {
  Add,
  CalendarMonth,
  Delete,
  Download,
  Edit,
  Refresh,
  TableRows,
  Update,
  UploadFile,
  Visibility,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  IconButton,
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext.jsx';
import { ConfirmDialog } from '../../components/ConfirmDialog.jsx';
import { EmptyState } from '../../components/EmptyState.jsx';
import { ApplicationCountDialog } from '../../features/students/ApplicationCountDialog.jsx';
import { StudentFormDialog } from '../../features/students/StudentFormDialog.jsx';
import { StudentDetailsDialog } from '../../features/students/StudentDetailsDialog.jsx';
import { StudentImportDialog } from '../../features/students/StudentImportDialog.jsx';
import { apiClient, getApiError } from '../../services/apiClient.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { exportDateWiseMatrixExcel, exportStudentsExcel } from '../../utils/excelExport.js';

const localIsoDate = (date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const countRange = (preset) => {
  if (preset === 'allTime') return { countFrom: '', countTo: '' };
  const today = new Date();
  const from = new Date(today);
  if (preset === 'yesterday') from.setDate(today.getDate() - 1);
  if (preset === 'last7') from.setDate(today.getDate() - 6);
  if (preset === 'last30') from.setDate(today.getDate() - 29);
  const start = localIsoDate(from);
  return {
    countFrom: start,
    countTo: preset === 'yesterday' ? start : localIsoDate(today),
  };
};

const getMatrixPresetRange = (preset) => {
  if (preset === 'allTime') return { from: '', to: '' };
  const now = new Date();
  if (preset === 'today') {
    const d = localIsoDate(now);
    return { from: d, to: d };
  }
  if (preset === 'yesterday') {
    const d = new Date(now);
    d.setDate(now.getDate() - 1);
    const s = localIsoDate(d);
    return { from: s, to: s };
  }
  if (preset === 'last7' || preset === 'last15') {
    const from = new Date(now);
    from.setDate(now.getDate() - (preset === 'last15' ? 14 : 6));
    return { from: localIsoDate(from), to: localIsoDate(now) };
  }
  if (preset === 'thisMonth') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: localIsoDate(from), to: localIsoDate(now) };
  }
  if (preset === 'lastMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: localIsoDate(from), to: localIsoDate(to) };
  }
  return {};
};

const periodLabels = {
  allTime: 'All Time',
  today: 'Today',
  yesterday: 'Yesterday',
  last7: 'Last 7 Days',
  last30: 'Last 30 Days',
  custom: 'Custom Period',
};

export function StudentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  // Top View Mode: 'list' (Directory Table) vs 'matrix' (Date-wise Daily Tracker)
  const [viewMode, setViewMode] = useState(() => searchParams.get('status') ? 'list' : 'matrix');

  // Shared Data
  const [technologies, setTechnologies] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);

  // Dialog States
  const [form, setForm] = useState({ open: false, student: null });
  const [viewStudent, setViewStudent] = useState(null);
  const [countStudent, setCountStudent] = useState(null);
  const [deleteStudent, setDeleteStudent] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkScope, setBulkScope] = useState(null);
  const [bulkConfirmation, setBulkConfirmation] = useState('');
  const toggleSelected = (id) => setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);

  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'add') setForm({ open: true, student: null });
    if (action === 'import') setImportOpen(true);
    if (action === 'add' || action === 'import') {
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // -------------------------------------------------------------
  // LIST VIEW STATE
  // -------------------------------------------------------------
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    search: '',
    technology: '',
    staff: '',
    membershipType: '',
    status: searchParams.get('status') === 'active' ? 'active' : '',
    sort: 'newest',
    countPreset: 'allTime',
    ...countRange('allTime'),
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const debouncedSearch = useDebouncedValue(filters.search);

  // -------------------------------------------------------------
  // DATE-WISE MATRIX VIEW STATE
  // -------------------------------------------------------------
  const [matrixPreset, setMatrixPreset] = useState('allTime');
  const [matrixRange, setMatrixRange] = useState(() => getMatrixPresetRange('allTime'));
  const [matrixStaff, setMatrixStaff] = useState('');
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixTechnology, setMatrixTechnology] = useState('');
  const [matrixStatus, setMatrixStatus] = useState('');
  const [matrixData, setMatrixData] = useState(null);
  const [matrixLoading, setMatrixLoading] = useState(true);
  const [matrixError, setMatrixError] = useState('');
  const [matrixExporting, setMatrixExporting] = useState(false);
  const debouncedMatrixSearch = useDebouncedValue(matrixSearch);

  // -------------------------------------------------------------
  // DATA LOADERS
  // -------------------------------------------------------------
  const effectiveFilters = useMemo(
    () => ({
      page: filters.page,
      limit: filters.limit,
      search: debouncedSearch,
      technology: filters.technology,
      staff: filters.staff,
      membershipType: filters.membershipType,
      status: filters.status,
      sort: filters.sort,
      countFrom: filters.countFrom,
      countTo: filters.countTo,
    }),
    [
      debouncedSearch,
      filters.limit,
      filters.membershipType,
      filters.page,
      filters.sort,
      filters.staff,
      filters.status,
      filters.technology,
      filters.countFrom,
      filters.countTo,
    ],
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = Object.fromEntries(
        Object.entries(effectiveFilters).filter(([, value]) => value !== ''),
      );
      const response = await apiClient.get('/students', { params });
      setSelectedIds([]);
      setStudents(response.data.data);
      setMeta(response.data.meta.pagination);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, [effectiveFilters]);

  const loadMatrix = useCallback(async () => {
    try {
      setMatrixLoading(true);
      setMatrixError('');
      const params = Object.fromEntries(
        Object.entries({
          from: matrixRange.from,
          to: matrixRange.to,
          staff: matrixStaff,
          search: debouncedMatrixSearch,
          technology: matrixTechnology,
          status: matrixStatus,
        }).filter(([, value]) => value !== '' && value !== undefined && value !== null),
      );
      const response = await apiClient.get('/dashboard/daily-matrix', { params });
      setMatrixData(response.data.data);
    } catch (requestError) {
      setMatrixError(getApiError(requestError, 'Failed to load date-wise matrix'));
    } finally {
      setMatrixLoading(false);
    }
  }, [matrixRange, matrixStaff, debouncedMatrixSearch, matrixTechnology, matrixStatus]);

  useEffect(() => {
    if (viewMode === 'list') load();
  }, [viewMode, load]);

  useEffect(() => {
    if (viewMode === 'matrix') loadMatrix();
  }, [viewMode, loadMatrix]);

  const loadTechnologies = useCallback(() => {
    apiClient
      .get('/technologies')
      .then((response) => setTechnologies(response.data.data.filter((item) => item.isActive)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadTechnologies();
  }, [loadTechnologies]);

  useEffect(() => {
    if (user?.role === 'admin') {
      apiClient
        .get('/students/owners')
        .then((response) =>
          setStaffUsers(
            response.data.data,
          ),
        )
        .catch((requestError) => enqueueSnackbar(
          `Unable to load staff categories: ${getApiError(requestError)}`,
          { variant: 'error' },
        ));
    }
  }, [user?.role, enqueueSnackbar]);

  // -------------------------------------------------------------
  // CRUD OPERATIONS
  // -------------------------------------------------------------
  const resolveTechnology = async (payload) => {
    const requestedName =
      payload.technology === '__other__'
        ? payload.customTechnology?.trim()
        : payload.technology.startsWith('__new__:')
          ? payload.technology.slice('__new__:'.length)
          : null;
    delete payload.customTechnology;
    if (!requestedName) return payload;
    const existing = technologies.find(
      (item) => item.name.toLowerCase() === requestedName.toLowerCase(),
    );
    if (existing) return { ...payload, technology: existing._id };
    const slug = requestedName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const response = await apiClient.post('/technologies', {
      name: requestedName,
      slug,
      description: 'Added while creating or editing a student profile.',
    });
    const technology = response.data.data;
    setTechnologies((current) => [...current, technology]);
    return { ...payload, technology: technology._id };
  };

  const save = async (payload) => {
    try {
      const resolvedPayload = await resolveTechnology({ ...payload });
      let response;
      if (form.student) {
        const currentTotalApplicationCount = Number(resolvedPayload.currentTotalApplicationCount);
        delete resolvedPayload.currentTotalApplicationCount;
        response = await apiClient.patch(`/students/${form.student._id}`, resolvedPayload);
        if (currentTotalApplicationCount !== Number(form.student.currentTotalApplicationCount)) {
          await apiClient.patch(`/students/${form.student._id}/application-count`, {
            currentTotalApplicationCount,
            note: 'Updated by staff while editing the student profile',
          });
        }
      } else {
        response = await apiClient.post('/students', resolvedPayload);
      }
      const detailResponse = await apiClient.get(`/students/${response.data.data._id}`);
      enqueueSnackbar(`Student ${form.student ? 'updated' : 'created'}`, { variant: 'success' });
      setForm({ open: false, student: null });
      setViewStudent(detailResponse.data.data);
      await Promise.all([load(), loadMatrix()]);
    } catch (requestError) {
      enqueueSnackbar(getApiError(requestError), { variant: 'error' });
    }
  };

  const updateCount = async (payload) => {
    try {
      const response = await apiClient.patch(
        `/students/${countStudent._id}/application-count`,
        payload,
      );
      enqueueSnackbar(`${response.data.data.history.dailyCount} applications recorded today`, {
        variant: 'success',
      });
      setCountStudent(null);
      await Promise.all([load(), loadMatrix()]);
    } catch (requestError) {
      enqueueSnackbar(getApiError(requestError), { variant: 'error' });
    }
  };

  const removeBulk = async () => {
    try {
      setDeleting(true);
      const response = await apiClient.post('/students/bulk-delete', bulkScope === 'all'
        ? { scope: 'all', confirmation: bulkConfirmation }
        : bulkScope === 'staff' ? { scope: 'staff', staff: filters.staff, confirmation: bulkConfirmation }
        : { scope: 'selected', ids: selectedIds });
      enqueueSnackbar(`${response.data.data.deletedCount} candidates deleted`, { variant: 'success' });
      setSelectedIds([]);
      setBulkScope(null);
      setBulkConfirmation('');
      if (filters.page === 1) await load();
      else setFilters(current => ({ ...current, page: 1 }));
      await loadMatrix();
    } catch (requestError) {
      enqueueSnackbar(getApiError(requestError), { variant: 'error' });
    } finally { setDeleting(false); }
  };
  const remove = async () => {
    try {
      setDeleting(true);
      await apiClient.delete(`/students/${deleteStudent._id}`);
      enqueueSnackbar('Student deleted', { variant: 'success' });
      setDeleteStudent(null);
      await Promise.all([load(), loadMatrix()]);
    } catch (requestError) {
      enqueueSnackbar(getApiError(requestError), { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const updateFilter = (name, value) =>
    setFilters((current) => ({ ...current, [name]: value, page: 1 }));

  const updateCountPreset = (preset) => {
    if (!preset) return;
    setFilters((current) => ({
      ...current,
      countPreset: preset,
      ...(preset === 'custom' ? {} : countRange(preset)),
      page: 1,
    }));
  };

  const openDetails = async (studentId) => {
    try {
      const response = await apiClient.get(`/students/${studentId}`);
      setViewStudent(response.data.data);
    } catch (requestError) {
      enqueueSnackbar(getApiError(requestError), { variant: 'error' });
    }
  };

  // -------------------------------------------------------------
  // EXPORT HANDLERS
  // -------------------------------------------------------------
  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const params = Object.fromEntries(
        Object.entries({ ...effectiveFilters, page: 1, limit: 5000 }).filter(
          ([, value]) => value !== '',
        ),
      );
      const response = await apiClient.get('/students', { params });
      await exportStudentsExcel(
        response.data.data || students,
        `SmartApply_Candidates_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      enqueueSnackbar('Candidate list exported successfully', { variant: 'success' });
    } catch (requestError) {
      enqueueSnackbar(getApiError(requestError), { variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleMatrixPresetChange = (preset) => {
    if (!preset) return;
    setMatrixPreset(preset);
    if (preset !== 'custom') {
      setMatrixRange(getMatrixPresetRange(preset));
    }
  };

  const handleExportMatrixExcel = async () => {
    if (!matrixData || matrixLoading || matrixError) return;
    try {
      setMatrixExporting(true);
      const selectedStaffObj = user.role === 'staff' ? user : staffUsers.find((s) => s._id === matrixStaff);
      await exportDateWiseMatrixExcel({
        dateRange: matrixData.dateRange,
        days: matrixData.days,
        students: matrixData.students,
        totals: matrixData.totals,
        selectedStaff: selectedStaffObj,
        includeAssignedTo: user.role === 'admin',
        filename: `SmartApply_Daily_Tracking_Matrix_${matrixData.dateRange.from?.slice(0, 10) || 'start'}_to_${matrixData.dateRange.to?.slice(0, 10) || 'now'}.xlsx`,
      });
      enqueueSnackbar('Date-wise Matrix Excel downloaded successfully', { variant: 'success' });
    } catch (requestError) {
      enqueueSnackbar(getApiError(requestError), { variant: 'error' });
    } finally {
      setMatrixExporting(false);
    }
  };

  const selectedStaffObj = staffUsers.find(
    (s) => s._id === (viewMode === 'matrix' ? matrixStaff : filters.staff),
  );

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ mb: 2.5 }}>
        <Typography component="h1" sx={{ fontSize: { xs: 24, sm: 28 }, fontWeight: 750, mb: 0.5 }}>{viewMode === 'list' ? 'Candidate Directory' : 'Daily Tracker'}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{viewMode === 'list' ? 'Manage profiles, assignments, and candidate records.' : 'Track daily applications and review progress by date.'}</Typography>
        {
          <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, '& > .MuiButton-root': { fontSize: 12, px: 1.5, borderRadius: 2, minHeight: 36 }, '& .MuiToggleButton-root': { fontSize: 12 } }}>
            {/* View Mode Toggle */}
            <ToggleButtonGroup
              exclusive
              size="small"
              value={viewMode}
              onChange={(_e, val) => val && setViewMode(val)}
              sx={{ bgcolor: 'background.paper', backdropFilter: 'blur(12px)' }}
            >
              <ToggleButton value="matrix" sx={{ gap: 0.75, px: 1.5, fontWeight: 700 }}>
                <CalendarMonth fontSize="small" />
                Daily Tracker
              </ToggleButton>
              <ToggleButton value="list" sx={{ gap: 0.75, px: 1.5, fontWeight: 700 }}>
                <TableRows fontSize="small" />
                Candidate Directory
              </ToggleButton>
            </ToggleButtonGroup>

            {viewMode === 'matrix' ? (
              <Button
                startIcon={<Download />}
                variant="contained"
                disabled={matrixExporting || matrixLoading || Boolean(matrixError) || !matrixData?.students?.length}
                onClick={handleExportMatrixExcel}
              >
                {matrixExporting ? 'Generating…' : 'Download Excel'}
              </Button>
            ) : (
              <Button
                startIcon={<Download />}
                variant="outlined"
                disabled={exporting || loading}
                onClick={handleExportExcel}
              >
                {exporting ? 'Exporting…' : 'Export Excel'}
              </Button>
            )}

            <Button
              startIcon={<UploadFile />}
              variant="outlined"
              onClick={() => setImportOpen(true)}
            >
              Import Candidates
            </Button>
            <Button
              startIcon={<Add />}
              variant="contained"
              onClick={() => setForm({ open: true, student: null })}
            >
              Add Candidate
            </Button>
          </Stack>
        }
      </Box>

      {/* Staff Scope Indicator Banner for Admin */}
      {user?.role === 'admin' && selectedStaffObj && (
        <Paper
          sx={{
            p: 1.5,
            mb: 2.5,
            bgcolor: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid',
            borderColor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Chip
              label="Staff Scope Active"
              color="primary"
              size="small"
              sx={{ fontWeight: 750 }}
            />
            <Typography variant="body2">
              Displaying candidates and application activity for <strong>{selectedStaffObj.name}</strong>{' '}
              ({selectedStaffObj.email})
            </Typography>
          </Stack>
          <Button
            size="small"
            variant="text"
            onClick={() => {
              if (viewMode === 'matrix') setMatrixStaff('');
              else updateFilter('staff', '');
            }}
          >
            Clear Filter
          </Button>
        </Paper>
      )}

      {/* ========================================================= */}
      {/* 1. DATE-WISE MATRIX VIEW                                 */}
      {/* ========================================================= */}
      {viewMode === 'matrix' && (
        <>
          <FilterPanel title="Choose what to view" sx={{ p: 2, mb: 2, borderRadius: 2.5,
            '& .MuiInputLabel-root': { position: 'static', transform: 'none', fontSize: 12, mb: 0.75 },
            '& .MuiInputBase-root': { mt: 0, minHeight: 40, borderRadius: 1.5 },
            '& .MuiInputBase-input': { fontSize: 13 },
            '& .MuiFormControl-root': { minWidth: 0 },
          }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: user?.role === 'admin' ? '180px minmax(0, 1fr)' : 'minmax(0, 1fr)' }, gap: 2, alignItems: 'start' }}>
              {user?.role === 'admin' && <TextField select size="small" label="Assigned staff" value={matrixStaff} onChange={(event) => setMatrixStaff(event.target.value)} slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}>
                <MenuItem value="">All staff</MenuItem>
                {staffUsers.map((staff) => <MenuItem key={staff._id} value={staff._id}>{staff.name}</MenuItem>)}
              </TextField>}
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="caption" sx={{ display: 'block', fontWeight: 650, mb: 0.75 }}>Reporting period</Typography>
                <ToggleButtonGroup exclusive size="small" aria-label="Reporting period" value={matrixPreset} onChange={(_event, value) => value && handleMatrixPresetChange(value)}
                  sx={{ display: 'flex', width: 'fit-content', maxWidth: '100%', flexWrap: 'wrap', gap: 0.5, '& .MuiToggleButton-root': { px: 1.25, py: 0.5, fontSize: 12, minHeight: 30 } }}>
                  {[['allTime', 'All time'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['last7', 'Last 7 days'], ['last15', 'Last 15 days'], ['thisMonth', 'This month'], ['lastMonth', 'Last month'], ['custom', 'Custom dates']].map(([value, label]) => <ToggleButton key={value} value={value}>{label}</ToggleButton>)}
                </ToggleButtonGroup>
              </Box>
              {matrixPreset === 'custom' && <Box sx={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 180px))' }, gap: 1.5 }}>
                <TextField size="small" type="date" label="From date" value={matrixRange.from} onChange={(event) => setMatrixRange((current) => ({ ...current, from: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField size="small" type="date" label="To date" value={matrixRange.to} onChange={(event) => setMatrixRange((current) => ({ ...current, to: event.target.value }))} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: matrixRange.from } }} />
              </Box>}

            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'minmax(0, 1.5fr) repeat(2, minmax(0, 1fr)) auto' }, gap: 1.5, alignItems: 'end', mt: 1.5 }}>
                <SearchField
                  size="small"
                  placeholder="Search by name or email…"
                  value={matrixSearch}
                  onChange={(event) => setMatrixSearch(event.target.value)}
                />

                <TextField
                  select
                  slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
                  size="small"
                  label="Technology"
                  value={matrixTechnology}
                  onChange={(event) => setMatrixTechnology(event.target.value)}
                >
                  <MenuItem value="">All Technologies</MenuItem>
                  {technologies.map((item) => (
                    <MenuItem key={item._id} value={item._id}>
                      {item.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
                  size="small"
                  label="Status"
                  value={matrixStatus}
                  onChange={(event) => setMatrixStatus(event.target.value)}
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="placed">Placed</MenuItem>
                </TextField>

                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={loadMatrix}
                  disabled={matrixLoading}
                  sx={{ height: 40, borderRadius: 1.5 }}
                >
                  Refresh
                </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>Results update automatically. Download Excel to save the selected period and filters.</Typography>
          </FilterPanel>

          {/* Matrix Top Summary KPI Chips */}
          {matrixData && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
                gap: 2,
                mb: 2.5,
              }}
            >
              <Paper sx={{ p: 1.5, borderRadius: '16px', backgroundImage: 'linear-gradient(135deg, transparent, #6366f112)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Candidates
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 850, mt: 0.5 }}>
                  {matrixData.totals.totalStudents}
                </Typography>
              </Paper>
              <Paper sx={{ p: 1.5, borderRadius: '16px', backgroundImage: 'linear-gradient(135deg, transparent, #4338ca12)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Before this period
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 850, mt: 0.5, color: 'primary.main' }}>
                  {matrixData.totals.startingTotal}
                </Typography>
              </Paper>
              <Paper sx={{ p: 1.5, borderRadius: '16px', backgroundImage: 'linear-gradient(135deg, transparent, #10b98112)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Applied in this period
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 850, mt: 0.5, color: 'success.main' }}>
                  +{matrixData.totals.periodAppliedTotal}
                </Typography>
              </Paper>
              <Paper sx={{ p: 1.5, borderRadius: '16px', backgroundImage: 'linear-gradient(135deg, transparent, #0d948812)' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Total at period end
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 850, mt: 0.5 }}>
                  {matrixData.totals.endingTotal}
                </Typography>
              </Paper>
            </Box>
          )}

          {/* Matrix Table Container */}
          <Paper sx={{ overflow: 'hidden', borderRadius: 2.5 }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="subtitle2">Daily application activity</Typography>
              <Typography variant="caption" color="text.secondary">Each date shows new applications. Scroll sideways for more dates and totals.</Typography>
            </Box>
            {matrixLoading ? (
              <Stack sx={{ alignItems: 'center', py: 6 }}>
                <CircularProgress />
              </Stack>
            ) : matrixError ? (
              <Box sx={{ p: 3 }}>
                <EmptyState error={matrixError} onRetry={loadMatrix} />
              </Box>
            ) : !matrixData?.students?.length ? (
              <EmptyState
                title="No candidates found"
                description="Adjust your filters or selected date range to view activity."
              />
            ) : (
              <TableContainer sx={{ maxHeight: 600, borderRadius: 0 }}>
                <Table size="small" stickyHeader aria-label="Daily application activity" sx={{ '& .MuiTableCell-root': { fontSize: 12, py: 1, px: 1.5 }, '& .MuiTableCell-head': { fontSize: 11 }, '& .MuiTableCell-root:first-of-type': { position: 'sticky', left: 0, zIndex: 2, bgcolor: (theme) => theme.palette.mode === 'light' ? '#f2f7fd' : '#142239', maxWidth: { xs: 160, sm: 240 }, minWidth: { xs: 160, sm: 200 }, overflowWrap: 'anywhere' }, '& .MuiTableCell-head:first-of-type': { zIndex: 4 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ minWidth: 200, zIndex: 3, fontWeight: 800 }}>
                        Candidate
                      </TableCell>
                      <TableCell sx={{ minWidth: 140, fontWeight: 800 }}>Stack</TableCell>
                      {user?.role === 'admin' && (
                        <TableCell sx={{ minWidth: 130, fontWeight: 800 }}>Assigned To</TableCell>
                      )}
                      <TableCell
                        align="right"
                        sx={{
                          minWidth: 120,
                          bgcolor: 'rgba(99, 102, 241, 0.12)',
                          fontWeight: 850,
                          color: 'primary.main',
                        }}
                      >
                        Opening Count
                      </TableCell>

                      {/* Day-by-Day Columns */}
                      {matrixData.days.map((d) => (
                        <TableCell
                          key={d.key}
                          align="center"
                          sx={{
                            minWidth: 70,
                            fontWeight: 750,
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Box>{d.label}</Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: '0.7rem' }}
                          >
                            {d.dayName}
                          </Typography>
                        </TableCell>
                      ))}

                      <TableCell
                        align="right"
                        sx={{
                          minWidth: 130,
                          bgcolor: 'rgba(16, 185, 129, 0.12)',
                          fontWeight: 850,
                          color: 'success.main',
                        }}
                      >
                        Period Applied
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          minWidth: 130,
                          bgcolor: 'rgba(15, 23, 42, 0.08)',
                          fontWeight: 850,
                        }}
                      >
                        Cumulative Total
                      </TableCell>
                      <TableCell align="right" sx={{ minWidth: 90, fontWeight: 800 }}>
                        Action
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {matrixData.students.map((student) => (
                      <TableRow hover key={student._id}>
                        <TableCell sx={{ fontWeight: 700 }}>
                          <Box>{student.candidateName}</Box>
                          <Typography variant="caption" color="text.secondary">
                            {student.personalEmail}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={student.technology?.name || 'General'}
                          />
                        </TableCell>
                        {user?.role === 'admin' && (
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 650 }}>
                              {student.createdBy?.name || 'Super admin'}
                            </Typography>
                          </TableCell>
                        )}
                        <TableCell
                          align="right"
                          sx={{ bgcolor: 'rgba(99, 102, 241, 0.04)', fontWeight: 800 }}
                        >
                          {student.startingCount}
                        </TableCell>

                        {/* Daily Counts */}
                        {matrixData.days.map((d) => {
                          const count = student.dailyCounts[d.key] || 0;
                          return (
                            <TableCell key={d.key} align="center">
                              {count > 0 ? (
                                <Tooltip
                                  title={`${student.candidateName} — ${d.label}: +${count} applied`}
                                >
                                  <Chip
                                    size="small"
                                    color="success"
                                    label={`+${count}`}
                                    sx={{
                                      fontWeight: 800,
                                      height: 22,
                                      fontSize: '0.75rem',
                                      cursor: 'default',
                                    }}
                                  />
                                </Tooltip>
                              ) : (
                                <Typography variant="caption" color="text.disabled">
                                  —
                                </Typography>
                              )}
                            </TableCell>
                          );
                        })}

                        <TableCell
                          align="right"
                          sx={{
                            bgcolor: 'rgba(16, 185, 129, 0.04)',
                            fontWeight: 850,
                            color: 'success.main',
                          }}
                        >
                          +{student.periodApplied}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ bgcolor: 'rgba(15, 23, 42, 0.03)', fontWeight: 850 }}
                        >
                          {student.endingCount}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Log today's applications">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => setCountStudent(student)}
                            >
                              <Update fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Matrix Bottom Totals Summary Row */}
                    <TableRow
                      sx={{
                        bgcolor: (theme) =>
                          theme.palette.mode === 'light'
                            ? 'rgba(241, 245, 249, 0.95)'
                            : 'rgba(30, 41, 59, 0.95)',
                        '& td': { fontWeight: 850, borderTop: '2px solid', borderColor: 'divider' },
                      }}
                    >
                      <TableCell colSpan={user?.role === 'admin' ? 3 : 2}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Chip
                            label="PERIOD TOTALS"
                            size="small"
                            color="primary"
                            sx={{ fontWeight: 800 }}
                          />
                          <Typography variant="body2" sx={{ fontWeight: 850 }}>
                            {matrixData.totals.totalStudents} Candidates
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'primary.main', fontSize: '0.95rem' }}>
                        {matrixData.totals.startingTotal}
                      </TableCell>

                      {/* Daily Totals */}
                      {matrixData.days.map((d) => {
                        const dayTotal = matrixData.totals.dailyTotals[d.key] || 0;
                        return (
                          <TableCell key={d.key} align="center">
                            {dayTotal > 0 ? (
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 850, color: 'success.main' }}
                              >
                                +{dayTotal}
                              </Typography>
                            ) : (
                              <Typography variant="caption" color="text.disabled">
                                0
                              </Typography>
                            )}
                          </TableCell>
                        );
                      })}

                      <TableCell align="right" sx={{ color: 'success.main', fontSize: '1rem' }}>
                        +{matrixData.totals.periodAppliedTotal}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '1rem' }}>
                        {matrixData.totals.endingTotal}
                      </TableCell>
                      <TableCell align="right" />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </>
      )}

      {/* ========================================================= */}
      {/* 2. STANDARD CANDIDATE DIRECTORY (LIST VIEW)              */}
      {/* ========================================================= */}
      {viewMode === 'list' && (
        <>
          <FilterPanel sx={{ p: 2, mb: 2, borderRadius: 2.5,
            '& .MuiInputLabel-root': { position: 'static', transform: 'none', mb: 0.75, fontSize: 12 },
            '& .MuiInputBase-root': { mt: 0, minHeight: 40, borderRadius: 1.5 },
            '& .MuiInputBase-input': { fontSize: 13 },
            '& .MuiFormControl-root': { minWidth: 0 },
          }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 1.25,
                alignItems: 'end',
                mb: 1.5,
              }}
            >
              <SearchField
                size="small"
                placeholder="Search by name, phone or email…"
                value={filters.search}
                onChange={(event) => updateFilter('search', event.target.value)}
              />
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={load}
                aria-label="Refresh candidates"
                sx={{ height: 40, minWidth: { xs: 44, sm: 112 }, px: { xs: 1.25, sm: 2 } }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                  Refresh
                </Box>
              </Button>
            </Box>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg:
                    user?.role === 'admin'
                      ? 'repeat(5, minmax(0, 1fr))'
                      : 'repeat(4, minmax(0, 1fr))',
                },
                gap: 1.25,
              }}
            >
              {user?.role === 'admin' && (
                <TextField
                  select
                  slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
                  size="small"
                  label="Assigned Staff"
                  value={filters.staff}
                  onChange={(event) => updateFilter('staff', event.target.value)}
                >
                  <MenuItem value="">All Staff</MenuItem>
                  {staffUsers.map((staff) => (
                    <MenuItem key={staff._id} value={staff._id}>
                      {staff.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                select
                slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
                size="small"
                label="Technology"
                value={filters.technology}
                onChange={(event) => updateFilter('technology', event.target.value)}
              >
                <MenuItem value="">All Technologies</MenuItem>
                {technologies.map((item) => (
                  <MenuItem key={item._id} value={item._id}>
                    {item.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
                size="small"
                label="Membership"
                value={filters.membershipType}
                onChange={(event) => updateFilter('membershipType', event.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="free">Free</MenuItem>
              </TextField>
              <TextField
                select
                slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
                size="small"
                label="Status"
                value={filters.status}
                onChange={(event) => updateFilter('status', event.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="placed">Placed</MenuItem>
              </TextField>
              <TextField
                select
                slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
                size="small"
                label="Sort By"
                value={filters.sort}
                onChange={(event) => updateFilter('sort', event.target.value)}
              >
                <MenuItem value="newest">Newest First</MenuItem>
                <MenuItem value="oldest">Oldest First</MenuItem>
                <MenuItem value="name_asc">Name A–Z</MenuItem>
                <MenuItem value="applications_high">Most Applications</MenuItem>
                <MenuItem value="applications_low">Fewest Applications</MenuItem>
              </TextField>
            </Box>
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              sx={{
                mt: 1.5,
                pt: 1.5,
                flexWrap: 'wrap',
                borderTop: '1px solid',
                borderColor: 'divider',
                gap: 1.5,
                alignItems: { xs: 'stretch', md: 'center' },
              }}
            >
              <Box sx={{ minWidth: 108, fontSize: 12 }}>
                <strong>Application Period</strong>
              </Box>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={filters.countPreset}
                onChange={(_event, value) => updateCountPreset(value)}
                sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { px: 1.6 } }}
              >
                <ToggleButton value="allTime">All Time</ToggleButton>
                <ToggleButton value="today">Today</ToggleButton>
                <ToggleButton value="yesterday">Yesterday</ToggleButton>
                <ToggleButton value="last7">Last 7 Days</ToggleButton>
                <ToggleButton value="last30">Last 30 Days</ToggleButton>
                <ToggleButton value="custom">Custom</ToggleButton>
              </ToggleButtonGroup>
              {filters.countPreset === 'custom' && (
                <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1, ml: { md: 'auto' } }}>
                  <TextField
                    size="small"
                    type="date"
                    label="From"
                    value={filters.countFrom}
                    onChange={(event) => updateFilter('countFrom', event.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="To"
                    value={filters.countTo}
                    onChange={(event) => updateFilter('countTo', event.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>
              )}
            </Stack>
          </FilterPanel>
          <Paper sx={{ minWidth: 0, borderRadius: 2.5, overflow: 'hidden' }}> 
            {loading ? (
              <Stack sx={{ alignItems: 'center', py: 6 }}>
                <CircularProgress />
              </Stack>
            ) : error ? (
              <Box sx={{ p: 2 }}>
                <EmptyState error={error} onRetry={load} />
              </Box>
            ) : !students.length ? (
              <EmptyState
                title="No candidates found"
                description="Adjust your filters or add a new candidate to get started."
              />
            ) : (
              <>
                <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ px: 2, py: 1.5, gap: 1, alignItems: { sm: 'center' }, flexWrap: 'wrap', borderBottom: 1, borderColor: 'divider', bgcolor: selectedIds.length ? 'action.selected' : 'transparent' }}>
                  <FormControlLabel label="Select this page" control={<Checkbox
                    checked={students.length > 0 && selectedIds.length === students.length}
                    indeterminate={selectedIds.length > 0 && selectedIds.length < students.length}
                    onChange={(_event, checked) => setSelectedIds(checked ? students.map(student => student._id) : [])}
                  />} />
                  <Typography variant="body2" sx={{ flex: 1, color: 'text.secondary', fontWeight: 600 }}>{selectedIds.length ? `${selectedIds.length} selected` : `${meta.total} candidates`}</Typography>
                  {selectedIds.length > 0 && <Button startIcon={<Delete />} color="error" variant="outlined" disabled={deleting} onClick={() => setBulkScope('selected')}>Delete selected</Button>}
                  {user.role === 'admin' && filters.staff && <Button color="error" variant="outlined" disabled={deleting} onClick={() => { setBulkScope('staff'); setBulkConfirmation(''); }}>Delete {staffUsers.find(item => item._id === filters.staff)?.name || 'selected staff'}’s candidates</Button>}
                  <Button size="small" color="error" sx={{ fontSize: 12, alignSelf: { xs: 'flex-start', sm: 'auto' } }} disabled={deleting} onClick={() => { setBulkScope('all'); setBulkConfirmation(''); }}>Delete all candidates</Button>
                </Stack>
                <TableContainer sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 0 }}> 
                  <Table size="small" aria-label="Candidate directory" sx={{ minWidth: 1100, '& th': { whiteSpace: 'nowrap' }, '& td:nth-of-type(2)': { minWidth: 200 }, '& td:last-of-type': { minWidth: 150 }, '& .MuiTableCell-root': { fontSize: 12, px: 1.5, py: 1.25, maxWidth: 220, overflowWrap: 'anywhere' }, '& .MuiTableCell-head': { fontSize: 10 }, '& .MuiIconButton-root': { p: 0.75 }, '& .MuiSvgIcon-root': { fontSize: 19 } }}>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" sx={{ width: 48, minWidth: 48 }}><Checkbox
                          checked={students.length > 0 && selectedIds.length === students.length}
                          indeterminate={selectedIds.length > 0 && selectedIds.length < students.length}
                          onChange={(_event, checked) => setSelectedIds(checked ? students.map(student => student._id) : [])}
                          slotProps={{ input: { 'aria-label': 'Select all candidates on this page' } }}
                        /></TableCell>
                        <TableCell>Candidate</TableCell>
                        <TableCell>Stack</TableCell>
                        <TableCell>Assigned To</TableCell>
                        <TableCell>Membership</TableCell>
                        <TableCell align="right">Total Applied</TableCell>
                        <TableCell align="right">{periodLabels[filters.countPreset]}</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow hover key={student._id} selected={selectedIds.includes(student._id)}>
                          <TableCell padding="checkbox"><Checkbox checked={selectedIds.includes(student._id)} onChange={() => toggleSelected(student._id)} slotProps={{ input: { 'aria-label': `Select ${student.candidateName}` } }} /></TableCell>
                          <TableCell>
                            <strong>{student.candidateName}</strong>
                            <Box color="text.secondary" fontSize={13}>
                              {student.personalEmail}
                              <br />
                              {student.mobileNumber}
                            </Box>
                          </TableCell>
                          <TableCell>{student.technology?.name}</TableCell>
                          <TableCell>
                            <strong>{student.createdBy?.name || 'Super admin'}</strong>
                            <Box color="text.secondary" fontSize={13}>
                              {student.createdBy?.email}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              color={student.membershipType === 'paid' ? 'warning' : 'default'}
                              label={
                                student.membershipType === 'paid' && student.membershipPaidMonth
                                  ? `paid · ${student.membershipPaidMonth}`
                                  : student.membershipType
                              }
                            />
                          </TableCell>
                          <TableCell align="right">
                            {student.currentTotalApplicationCount}
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              color="success"
                              label={`+${student.periodApplicationCount || 0}`}
                            />
                          </TableCell>
                          <TableCell>
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
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View Full Profile">
                              <IconButton onClick={() => openDetails(student._id)}>
                                <Visibility />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Log Applications">
                              <IconButton onClick={() => setCountStudent(student)} color="primary">
                                <Update />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Candidate">
                              <IconButton onClick={() => setForm({ open: true, student })}>
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Remove Candidate">
                              <IconButton color="error" onClick={() => setDeleteStudent(student)}>
                                <Delete />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box data-testid="candidate-cards" sx={{ display: { xs: 'grid', md: 'none' }, gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5, p: 1.5 }}>
                  {students.map((student) => <Box key={student._id} sx={{ minWidth: 0, p: 2, border: 1, borderRadius: 2, borderColor: 'divider', overflowWrap: 'anywhere', display: 'flex', flexDirection: 'column' }}>
                    <FormControlLabel sx={{ m: 0 }} label={<Typography variant="body2" sx={{ fontWeight: 750 }}>{student.candidateName}</Typography>} control={<Checkbox checked={selectedIds.includes(student._id)} onChange={() => toggleSelected(student._id)} slotProps={{ input: { 'aria-label': `Select ${student.candidateName}` } }} />} />
                    <Typography variant="caption" color="text.secondary">{student.personalEmail} · {student.mobileNumber}</Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>{student.technology?.name || 'General'}</Typography>
                    <Typography variant="caption" color="text.secondary">Assigned to {student.createdBy?.name || 'Super admin'}</Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, my: 1 }}>
                      <Chip size="small" label={student.status} color={student.status === 'active' ? 'success' : 'default'} />
                      <Chip size="small" label={`${student.membershipType}${student.membershipType === 'paid' && student.membershipPaidMonth ? ` · ${student.membershipPaidMonth}` : ''}`} variant="outlined" />
                    </Box>
                    <Typography variant="caption">Total applied: <strong>{student.currentTotalApplicationCount}</strong> · {periodLabels[filters.countPreset]}: <strong>+{student.periodApplicationCount || 0}</strong></Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 0.5, pt: 1, mt: 'auto', '& .MuiIconButton-root': { width: 44, height: 44 } }}>
                      <IconButton aria-label="View Full Profile" onClick={() => openDetails(student._id)}><Visibility fontSize="small" /></IconButton>
                      <IconButton aria-label="Log Applications" color="primary" onClick={() => setCountStudent(student)}><Update fontSize="small" /></IconButton>
                      <IconButton aria-label="Edit Candidate" onClick={() => setForm({ open: true, student })}><Edit fontSize="small" /></IconButton>
                      <IconButton aria-label="Remove Candidate" color="error" onClick={() => setDeleteStudent(student)}><Delete fontSize="small" /></IconButton>
                    </Box>
                  </Box>)}
                </Box>
                <TablePagination
                  sx={{ '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', justifyContent: 'flex-end', px: 1 }, '& .MuiTablePagination-spacer': { display: 'none' }, '& .MuiTablePagination-actions': { ml: 1 } }}
                  component="div"
                  count={meta.total}
                  page={meta.page - 1}
                  rowsPerPage={meta.limit}
                  rowsPerPageOptions={[10, 20, 50, 100]}
                  onPageChange={(_event, page) =>
                    setFilters((current) => ({ ...current, page: page + 1 }))
                  }
                  onRowsPerPageChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      limit: Number(event.target.value),
                      page: 1,
                    }))
                  }
                />
              </>
            )}
          </Paper>
        </>
      )}

      <ConfirmDialog
        open={Boolean(bulkScope)}
        title={bulkScope === 'staff' ? `Delete all candidates assigned to ${staffUsers.find(item => item._id === filters.staff)?.name || 'selected staff'}?` : bulkScope === 'all' ? 'Delete all candidates?' : `Delete ${selectedIds.length} candidates?`}
        message={bulkScope === 'staff' ? 'Deletes every candidate assigned to this person across all pages, ignoring other filters. Other staff records are unaffected. Historical reporting data is retained.' : bulkScope === 'all' ? `This removes ALL candidates ${user.role === 'staff' ? 'assigned to you' : 'in the workspace'}, across every page, regardless of current filters. Historical reporting data is retained.` : 'The selected candidates will be removed from active records. Historical reporting data is retained.'}
        confirmLabel={bulkScope === 'staff' ? 'Delete staff candidates' : bulkScope === 'all' ? 'Delete all candidates' : 'Delete selected candidates'}
        busy={deleting}
        confirmDisabled={['all', 'staff'].includes(bulkScope) && bulkConfirmation !== 'DELETE ALL'}
        onClose={() => setBulkScope(null)}
        onConfirm={removeBulk}
      >
        {['all', 'staff'].includes(bulkScope) && <TextField sx={{ mt: 2 }} label="Type DELETE ALL to confirm" value={bulkConfirmation} onChange={event => setBulkConfirmation(event.target.value)} autoComplete="off" />}
      </ConfirmDialog>
      <StudentFormDialog
        open={form.open}
        student={form.student}
        technologies={technologies}
        onClose={() => setForm({ open: false, student: null })}
        onSubmit={save}
      />
      <StudentImportDialog
        open={importOpen}
        technologies={technologies}
        onClose={() => setImportOpen(false)}
        onImported={() => {
          if (viewMode === 'list') load();
          else loadMatrix();
          loadTechnologies();
        }}
      />
      <StudentDetailsDialog
        student={viewStudent}
        onClose={() => setViewStudent(null)}
        onEdit={(student) => {
          setViewStudent(null);
          setForm({ open: true, student });
        }}
      />
      <ApplicationCountDialog
        open={Boolean(countStudent)}
        student={countStudent}
        onClose={() => setCountStudent(null)}
        onSubmit={updateCount}
      />
      <ConfirmDialog
        open={Boolean(deleteStudent)}
        title="Remove Candidate?"
        message={`${deleteStudent?.candidateName || 'This candidate'} will be removed from active records. All historical reporting data remains intact.`}
        confirmLabel="Remove"
        busy={deleting}
        onClose={() => setDeleteStudent(null)}
        onConfirm={remove}
      />
    </Box>
  );
}
