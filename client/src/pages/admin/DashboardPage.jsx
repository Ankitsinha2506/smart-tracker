import { FilterPanel } from '../../components/FilterPanel.jsx';
import {
  Assessment,
  CalendarMonth,
  Clear,
  Download,
  FilterList,
  Groups,
  Person,
  PersonAdd,
  QueryStats,
  Refresh,
  Stars,
  Today,
  WorkspacePremium,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { exportDashboardExcel } from '../../utils/excelExport.js';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartCard } from '../../components/ChartCard.jsx';
import { PageHeader } from '../../components/PageHeader.jsx';
import { StatCard } from '../../components/StatCard.jsx';
import { apiClient, getApiError } from '../../services/apiClient.js';
import { useAuth } from '../../app/AuthContext.jsx';

const chartColors = ['#3157d5', '#00a389', '#f59e0b', '#e0528d', '#7c5ce7', '#3ba5d8'];
const isoDate = (date) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const getPresetRange = (preset) => {
  if (preset === 'allTime') return { from: '', to: '' };
  const now = new Date();
  if (preset === 'today') {
    const todayStr = isoDate(now);
    return { from: todayStr, to: todayStr };
  }
  if (preset === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = isoDate(yesterday);
    return { from: yesterdayStr, to: yesterdayStr };
  }
  if (preset === 'last7') {
    const from = new Date(now);
    from.setDate(now.getDate() - 6);
    return { from: isoDate(from), to: isoDate(now) };
  }
  if (preset === 'thisMonth') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: isoDate(from), to: isoDate(now) };
  }
  if (preset === 'lastMonth') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: isoDate(from), to: isoDate(to) };
  }
  if (preset === 'last30') {
    const from = new Date(now);
    from.setDate(now.getDate() - 29);
    return { from: isoDate(from), to: isoDate(now) };
  }
  return { from: isoDate(now), to: isoDate(now) };
};

export function DashboardPage() {
  const { user } = useAuth();
  const [preset, setPreset] = useState('allTime');
  const [range, setRange] = useState(() => ({
    ...getPresetRange('allTime'),
    staff: '',
  }));
  const [staffUsers, setStaffUsers] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) setLoading(true);
        setError('');
        const params = Object.fromEntries(
          Object.entries(range).filter(([, value]) => value !== '' && value !== null),
        );
        const response = await apiClient.get('/dashboard', { params });
        setData(response.data.data);
      } catch (requestError) {
        setError(getApiError(requestError));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [range],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const refreshSilently = () => load({ silent: true });
    window.addEventListener('focus', refreshSilently);
    const interval = window.setInterval(refreshSilently, 30_000);
    return () => {
      window.removeEventListener('focus', refreshSilently);
      window.clearInterval(interval);
    };
  }, [load]);

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

  const handlePresetChange = (newPreset) => {
    if (!newPreset) return;
    setPreset(newPreset);
    if (newPreset !== 'custom') {
      const dates = getPresetRange(newPreset);
      setRange((current) => ({ ...current, ...dates }));
    }
  };

  const handleStaffChange = (staffId) => {
    setRange((current) => ({ ...current, staff: staffId }));
  };

  const selectedStaffObj = useMemo(() => {
    if (!range.staff) return null;
    return staffUsers.find((s) => s._id === range.staff) || data?.selectedStaff || null;
  }, [range.staff, staffUsers, data?.selectedStaff]);

  const cards = data?.cards || {};
  const cardItems = [
    ['Total Candidates', cards.totalStudents, <Groups key="1" />],
    ['Active Candidates', cards.activeStudents, <PersonAdd key="2" />, 'success.main'],
    ['Paid Members', cards.paidUsers, <WorkspacePremium key="3" />, 'warning.main'],
    ['Free Members', cards.freeUsers, <Groups key="4" />, 'info.main'],
    ["Today's Applications", cards.todayApplications, <Today key="5" />, 'secondary.main'],
    ["Yesterday's Applications", cards.yesterdayApplications, <Assessment key="6" />],
    ['Period Applications', cards.rangeApplications, <QueryStats key="7" />, 'success.main'],
    ['All-Time Applications', cards.overallApplications, <Stars key="8" />, 'warning.main'],
    [
      'Avg. per Candidate',
      cards.averageApplicationsPerStudent,
      <Assessment key="9" />,
      'info.main',
    ],
  ];

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (!data) return;
    try {
      setExporting(true);
      await exportDashboardExcel({
        cards: data.cards,
        charts: data.charts,
        range,
        selectedStaff: selectedStaffObj,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={
          user.role === 'staff'
            ? 'My Workspace Dashboard'
            : selectedStaffObj
              ? `${selectedStaffObj.name} — Performance Overview`
              : 'Operations Dashboard'
        }
        description={
          user.role === 'staff'
            ? 'Monitor application activity and daily progress for your assigned candidates.'
            : selectedStaffObj
              ? `Viewing application activity and performance metrics for ${selectedStaffObj.name}.`
              : 'Aggregated view of candidate application activity, staff performance, and pipeline health.'
        }
        action={
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Button
              startIcon={<Download />}
              variant="contained"
              disabled={loading || exporting || !data}
              onClick={handleExportExcel}
            >
              {exporting ? 'Generating…' : 'Export Report'}
            </Button>
            <Button startIcon={<Refresh />} variant="outlined" onClick={() => load()}>
              Refresh
            </Button>
          </Stack>
        }
      />

      {/* Staff Scope Indicator Banner for Admin */}
      {user.role === 'admin' && selectedStaffObj && (
        <Paper
          sx={{
            p: 1.5,
            mb: 2.5,
            bgcolor: 'rgba(91,91,214,.08)',
            border: '1px solid',
            borderColor: 'primary.main',
            borderRadius: 2,
          }}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34, fontSize: 14 }}>
                {selectedStaffObj.name?.slice(0, 1)?.toUpperCase() || <Person />}
              </Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 750 }}>
                  Scope: {selectedStaffObj.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedStaffObj.email} · Candidate application activity
                </Typography>
              </Box>
            </Stack>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Clear />}
              onClick={() => handleStaffChange('')}
            >
              View All Staff
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Filter Control Toolbar */}
      <FilterPanel>
        <Stack spacing={2}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            sx={{
              alignItems: { xs: 'stretch', lg: 'center' },
              justifyContent: 'space-between',
              gap: 1.5,
            }}
          >
            {/* Quick Preset Buttons */}
            <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mr: 0.5 }}>
                <CalendarMonth fontSize="small" color="primary" />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Date Range:
                </Typography>
              </Box>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={preset}
                onChange={(_event, val) => handlePresetChange(val)}
                sx={{
                  flexWrap: 'wrap',
                  '& .MuiToggleButton-root': { px: 1.5, py: 0.5, fontSize: 13 },
                }}
              >
                <ToggleButton value="allTime">All Time</ToggleButton>
                <ToggleButton value="today">Today</ToggleButton>
                <ToggleButton value="yesterday">Yesterday</ToggleButton>
                <ToggleButton value="last7">Last 7 Days</ToggleButton>
                <ToggleButton value="thisMonth">This Month</ToggleButton>
                <ToggleButton value="lastMonth">Last Month</ToggleButton>
                <ToggleButton value="custom">Custom</ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {/* Staff Selector (Admin Only) */}
            {user.role === 'admin' && (
              <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                <FilterList fontSize="small" color="action" />
                <TextField
                  select
                  size="small"
                  label="Assigned Staff"
                  value={range.staff}
                  onChange={(event) => handleStaffChange(event.target.value)}
                  sx={{ minWidth: { xs: 0, sm: 220 }, flex: 1 }}
                >
                  <MenuItem value="">
                    <em>All Staff Combined</em>
                  </MenuItem>
                  {staffUsers.map((staff) => (
                    <MenuItem key={staff._id} value={staff._id}>
                      {staff.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            )}
          </Stack>

          {/* Custom Date Pickers (Shown if Custom preset selected or on demand) */}
          {preset === 'custom' && (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              sx={{ pt: 1, borderTop: '1px solid', borderColor: 'divider', alignItems: 'center' }}
            >
              <TextField
                size="small"
                type="date"
                label="From date"
                value={range.from}
                onChange={(event) =>
                  setRange((current) => ({ ...current, from: event.target.value }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                size="small"
                type="date"
                label="To date"
                value={range.to}
                onChange={(event) =>
                  setRange((current) => ({ ...current, to: event.target.value }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <Button variant="contained" size="small" onClick={() => load()}>
                Apply Range
              </Button>
            </Stack>
          )}
        </Stack>
      </FilterPanel>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Metrics Cards Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))', lg: 'repeat(3,minmax(0,1fr))' },
          gap: 2,
          mb: 3,
        }}
      >
        {cardItems.map(([label, value, icon, color]) => (
          <StatCard key={label} label={label} value={value} icon={icon} color={color} />
        ))}
      </Box>

      {/* Charts Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'repeat(2,minmax(0,1fr))' },
          gap: 2.5,
        }}
      >
        {/* 1. Day-by-Day Applications (Bar Chart) */}
        <ChartCard
          title={
            selectedStaffObj
              ? `${selectedStaffObj.name} — Daily Applications`
              : 'Daily Application Activity'
          }
          subheader="Applications logged per calendar date within the selected period"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.charts.dailyTrend || []}>
              <defs>
                <linearGradient id="barIndigo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                  <stop offset="100%" stopColor="#4338ca" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
                }
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: 12,
                  backdropFilter: 'blur(16px)',
                  backgroundColor: 'rgba(15, 23, 42, 0.92)',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                labelFormatter={(value) =>
                  new Date(value).toLocaleDateString(undefined, {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                }
                formatter={(value) => [`${value} applications`, 'Applied today']}
              />
              <Bar dataKey="applications" fill="url(#barIndigo)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2. Cumulative Application Growth (Area Chart) */}
        <ChartCard
          title="Cumulative Application Growth"
          subheader="Running total of applications over the selected period"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data?.charts.dailyTrend || []}>
              <defs>
                <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
                }
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: 12,
                  backdropFilter: 'blur(16px)',
                  backgroundColor: 'rgba(15, 23, 42, 0.92)',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value) => [`${value} total applications`, 'Cumulative']}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="#10b981"
                strokeWidth={3}
                fill="url(#growthGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 3. Technology-wise Applications */}
        <ChartCard
          title="Applications by Technology"
          subheader="Total applications grouped by technology domain"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.charts.technologyWise || []}>
              <defs>
                <linearGradient id="techGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={1} />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis dataKey="technology" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: 12,
                  backdropFilter: 'blur(16px)',
                  backgroundColor: 'rgba(15, 23, 42, 0.92)',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                formatter={(value) => [`${value} applications`, 'Applied']}
              />
              <Bar dataKey="applications" fill="url(#techGrad)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 4. Top-performing Students */}
        <ChartCard
          title="Top Performing Candidates"
          subheader="Candidates with the highest application count in the selected period"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart layout="vertical" data={data?.charts.topStudents || []}>
              <defs>
                <linearGradient id="topStudentsGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="candidateName" width={120} tick={{ fontSize: 11 }} />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: 12,
                  backdropFilter: 'blur(16px)',
                  backgroundColor: 'rgba(15, 23, 42, 0.92)',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                formatter={(value) => [`${value} applications`, 'In this period']}
              />
              <Bar dataKey="applications" fill="url(#topStudentsGrad)" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5. Paid vs Free Membership Distribution */}
        <ChartCard
          title="Membership Distribution"
          subheader="Breakdown of enrolled candidates by membership tier"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data?.charts.membershipDistribution || []}
                dataKey="students"
                nameKey="membershipType"
                innerRadius={68}
                outerRadius={96}
                paddingAngle={5}
                label
              >
                {(data?.charts.membershipDistribution || []).map((item, index) => (
                  <Cell
                    key={item.membershipType}
                    fill={chartColors[index % chartColors.length]}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <RechartsTooltip
                contentStyle={{
                  borderRadius: 12,
                  backdropFilter: 'blur(16px)',
                  backgroundColor: 'rgba(15, 23, 42, 0.92)',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
                formatter={(value) => [`${value} students`, 'Count']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 6. Batch-wise Performance */}
        <ChartCard
          title="Batch Performance"
          subheader="Application volume and candidate count by batch cohort"
          loading={loading}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.charts.batchWise || []}>
              <defs>
                <linearGradient id="batchAppGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
                  <stop offset="100%" stopColor="#7e22ce" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="batchStudentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0.85} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} vertical={false} />
              <XAxis dataKey="batch" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: 12,
                  backdropFilter: 'blur(16px)',
                  backgroundColor: 'rgba(15, 23, 42, 0.92)',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  color: '#fff',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
              />
              <Legend />
              <Bar
                dataKey="applications"
                name="Applications"
                fill="url(#batchAppGrad)"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="students"
                name="Students"
                fill="url(#batchStudentGrad)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </Box>

      {/* 7. Staff Performance Leaderboard Table (Admin Only, when viewing All Staff) */}
      {user.role === 'admin' &&
        !range.staff &&
        (data?.charts.staffPerformance || []).length > 0 && (
          <Paper sx={{ mt: 3, p: 2.5 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                mb: 2,
              }}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  Staff Performance Leaderboard
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Application volume and candidate coverage by staff member
                </Typography>
              </Box>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Staff Member</TableCell>
                    <TableCell align="right">Candidates Managed</TableCell>
                    <TableCell align="right">Period Applied</TableCell>
                    <TableCell align="right">Today's Applied</TableCell>
                    <TableCell align="right">All-Time Total</TableCell>
                    <TableCell align="right">Avg / Candidate</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.charts.staffPerformance.map((staff) => (
                    <TableRow hover key={staff.staffId}>
                      <TableCell>
                        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}
                          >
                            {staff.name?.slice(0, 1)?.toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {staff.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {staff.email}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Chip size="small" label={staff.totalStudents} />
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontWeight: 750, color: 'primary.main' }}>
                          +{staff.applications}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          color={staff.todayApplications > 0 ? 'success' : 'default'}
                          label={`+${staff.todayApplications}`}
                        />
                      </TableCell>
                      <TableCell align="right">{staff.overallApplications}</TableCell>
                      <TableCell align="right">{staff.averagePerStudent}</TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleStaffChange(staff.staffId)}
                        >
                          View Activity
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

      {/* 8. Recent Daily Applications Log */}
      {(data?.charts.recentActivity || []).length > 0 && (
        <Paper sx={{ mt: 3, p: 2.5 }}>
          <Stack
            direction="row"
            sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Recent Application Updates
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Latest application numbers recorded for candidates
              </Typography>
            </Box>
          </Stack>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Candidate</TableCell>
                  {user.role === 'admin' && <TableCell>Applied by</TableCell>}
                  <TableCell align="right">Previous total</TableCell>
                  <TableCell align="right">Applied</TableCell>
                  <TableCell align="right">New total</TableCell>
                  <TableCell>Source</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.charts.recentActivity.map((item) => (
                  <TableRow hover key={item._id}>
                    <TableCell>
                      {new Date(item.applicationDate).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <strong>{item.student?.candidateName}</strong>
                      <Box color="text.secondary" fontSize={12}>
                        {item.student?.personalEmail}
                      </Box>
                    </TableCell>
                    {user.role === 'admin' && (
                      <TableCell>
                        <strong>{item.recordedBy?.name || 'Super admin'}</strong>
                      </TableCell>
                    )}
                    <TableCell align="right">{item.previousCount}</TableCell>
                    <TableCell align="right">
                      <Chip
                        size="small"
                        color="success"
                        label={`+${item.dailyCount}`}
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <strong>{item.currentCount}</strong>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" variant="outlined" label={item.source} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {!loading && !error && !data?.charts.dailyTrend?.some((d) => d.applications > 0) && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography color="text.secondary" align="center">
            No daily application activity recorded in this date range yet.
          </Typography>
        </Paper>
      )}
    </>
  );
}
