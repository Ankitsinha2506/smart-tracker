import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AddRounded,
  ArrowForwardRounded,
  AssessmentRounded,
  AutoAwesomeRounded,
  CalendarMonthRounded,
  CheckCircleRounded,
  CloseRounded,
  CodeRounded,
  DownloadRounded,
  FilterAltRounded,
  GroupsRounded,
  HistoryRounded,
  PersonAddRounded,
  PersonOutlineRounded,
  PrintRounded,
  RefreshRounded,
  StarsRounded,
  TrendingUpRounded,
  UploadFileRounded,
  WorkspacePremiumRounded,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useSnackbar } from 'notistack';
import { useAuth } from '../../app/AuthContext.jsx';
import { apiClient, getApiError } from '../../services/apiClient.js';
import { exportDashboardExcel } from '../../utils/excelExport.js';
import {
  AnimatedSection,
  EmptyState,
  MetricCard,
  Panel,
} from '../../features/dashboard/DashboardPrimitives.jsx';
import {
  ActivityCalendar,
  ActivityInbox,
  RecentActivityPanel,
  RecruiterPerformance,
} from '../../features/dashboard/ActivityWidgets.jsx';
import { RecentCandidates } from '../../features/dashboard/RecentCandidates.jsx';
import {
  bucketTrend,
  comparison,
  csv,
  downloadFile,
  formatDate,
  formatNumber,
  percent,
  presetRange,
  presets,
} from '../../features/dashboard/dashboardUtils.js';
import './dashboard.css';
const colors = ['#3978f6', '#9aa9bf', '#15b79e'];
const baseFilters = {
  staff: '',
  technology: '',
  status: '',
  membershipType: '',
};
const chartTip = {
  borderRadius: 12,
  background: 'var(--ats-surface)',
  border: '1px solid var(--ats-border)',
  color: 'var(--ats-ink)',
  boxShadow: '0 8px 30px #14264a18',
};
export function AnalyticsPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [searchParams, setSearchParams] = useSearchParams();
  const [preset, setPreset] = useState('last30');
  const [range, setRange] = useState(() => presetRange('last30'));
  const [filters, setFilters] = useState(baseFilters);
  const [draft, setDraft] = useState(baseFilters);
  const [custom, setCustom] = useState(() => presetRange('last30'));
  const [filterOpen, setFilterOpen] = useState(false);
  const [options, setOptions] = useState({
    staff: [],
    technologies: [],
  });
  const [optionsError, setOptionsError] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [granularity, setGranularity] = useState('daily');
  const [chartSeries, setChartSeries] = useState('activity');
  const [techMetric, setTechMetric] = useState('applications');
  const [inboxOpen, setInboxOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const controller = useRef(null);
  const inFlight = useRef(false);
  const load = useCallback(
    async ({ silent = false } = {}) => {
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      inFlight.current = true;
      if (!silent) setLoading(true);
      try {
        const params = Object.fromEntries(
          Object.entries({
            ...range,
            ...filters,
          }).filter(([, value]) => value !== '' && value !== false),
        );
        const response = await apiClient.get('/dashboard', {
          params,
          signal: abort.signal,
        });
        if (!abort.signal.aborted) {
          setData(response.data.data);
          setLastSync(new Date());
          setRefreshKey((key) => key + 1);
          setError('');
        }
      } catch (err) {
        if (!abort.signal.aborted) setError(getApiError(err));
      } finally {
        if (!abort.signal.aborted) {
          setLoading(false);
          inFlight.current = false;
        }
      }
    },
    [range, filters],
  );
  useEffect(() => {
    load();
    return () => controller.current?.abort();
  }, [load]);
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible' && !inFlight.current)
        load({
          silent: true,
        });
    };
    const interval = window.setInterval(refresh, 15_000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
    };
  }, [load]);
  useEffect(() => {
    const clock = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(clock);
  }, []);
  useEffect(() => {
    let active = true;
    const requests = [
      apiClient.get('/technologies'),
      user.role === 'admin' ? apiClient.get('/auth/users') : Promise.resolve(null),
    ];
    Promise.allSettled(requests).then(([tech, staff]) => {
      if (!active) return;
      setOptions({
        technologies: tech.status === 'fulfilled' ? tech.value.data.data : [],
        staff:
          staff.status === 'fulfilled' && staff.value
            ? staff.value.data.data.filter((row) => row.role === 'staff' && row.status === 'active')
            : [],
      });
      if (tech.status === 'rejected' || staff.status === 'rejected')
        setOptionsError('Some filter options could not be loaded. Refresh the page to retry.');
    });
    return () => {
      active = false;
    };
  }, [user.role]);
  useEffect(() => {
    if (searchParams.get('inbox') === '1') {
      setInboxOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('inbox');
      setSearchParams(next, {
        replace: true,
      });
    }
  }, [searchParams, setSearchParams]);
  const cards = data?.cards || {};
  const charts = data?.charts || {};
  const rows = charts.dailyTrend || [];
  const plot = useMemo(
    () => bucketTrend(data?.charts?.dailyTrend || [], granularity),
    [data, granularity],
  );
  const currentStaff =
    options.staff.find((row) => row._id === filters.staff) || data?.selectedStaff;
  const inactive = Math.max(
    0,
    (cards.totalStudents || 0) - (cards.activeStudents || 0) - (cards.placedStudents || 0),
  );
  const distribution = [
    {
      name: 'Active',
      value: cards.activeStudents || 0,
      status: 'active',
    },
    {
      name: 'Inactive',
      value: inactive,
      status: 'inactive',
    },
    {
      name: 'Placed',
      value: cards.placedStudents || 0,
      status: 'placed',
    },
  ];
  const placementRate = percent(cards.placedStudents, cards.totalStudents);
  const paidRate = percent(cards.paidUsers, cards.totalStudents);
  const monthTrend = comparison(
    data?.comparisons?.monthlyApplications?.current,
    data?.comparisons?.monthlyApplications?.previous,
  );
  const dailyTrend = comparison(cards.todayApplications, cards.yesterdayApplications);
  const appSpark = rows.slice(-14).map((row) => row.applications);
  const candidateSpark = rows.some((row) => row.candidates != null)
    ? rows.slice(-14).map((row) => row.candidates)
    : null;
  const scope = (params) =>
    `/students?${new URLSearchParams({
      view: 'list',
      ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
      ...params,
    })}`;
  const selectStatus = (status) => {
    setFilters((current) => ({
      ...current,
      status,
    }));
    setDraft((current) => ({
      ...current,
      status,
    }));
  };
  const metrics = [
    {
      label: 'Total Candidates',
      value: cards.totalStudents,
      icon: <GroupsRounded />,
      description: 'Across your selected workspace',
      color: '#3978f6',
      to: scope({}),
      sparkline: candidateSpark,
      sparklineLabel: 'Daily new registrations in the selected period',
      trendDescription: 'Current candidate count',
    },
    {
      label: 'Active Candidates',
      value: cards.activeStudents,
      icon: <PersonAddRounded />,
      description: 'Actively applying for opportunities',
      color: '#15b79e',
      to: scope({
        status: 'active',
      }),
      trendDescription: `${percent(cards.activeStudents, cards.totalStudents)}% of candidates`,
    },
    {
      label: 'Inactive Candidates',
      value: data ? inactive : null,
      icon: <PersonOutlineRounded />,
      description: 'Profiles currently on pause',
      color: '#e79432',
      to: scope({
        status: 'inactive',
      }),
      trendDescription: `${percent(inactive, cards.totalStudents)}% of candidates`,
    },
    {
      label: 'Total Placed Students',
      value: cards.placedStudents,
      icon: <StarsRounded />,
      description: 'Candidates marked as placed',
      color: '#8b65d8',
      to: scope({
        status: 'placed',
      }),
      trendDescription: `${placementRate}% placement success`,
    },
    {
      label: 'Paid Members',
      value: cards.paidUsers,
      icon: <WorkspacePremiumRounded />,
      description: 'Candidates with paid membership',
      color: '#e79432',
      to: scope({
        membershipType: 'paid',
      }),
      trendDescription: `${paidRate}% membership share`,
    },
    {
      label: 'Free Members',
      value: cards.freeUsers,
      icon: <GroupsRounded />,
      description: 'Candidates with free membership',
      color: '#52a9bd',
      to: scope({
        membershipType: 'free',
      }),
      trendDescription: `${percent(cards.freeUsers, cards.totalStudents)}% membership share`,
    },
    {
      label: "Today's Applications",
      value: cards.todayApplications,
      icon: <TrendingUpRounded />,
      description: 'Applications recorded today',
      color: '#3978f6',
      to: '/history',
      trend: dailyTrend,
      trendDescription: 'compared with yesterday',
      sparkline: appSpark,
    },
    {
      label: "Yesterday's Applications",
      value: cards.yesterdayApplications,
      icon: <HistoryRounded />,
      description: 'Previous business-day activity',
      color: '#8b65d8',
      to: '/history',
      trendDescription: 'Recorded daily total',
    },
    {
      label: "This Month's Applications",
      value: cards.monthlyApplications,
      icon: <CalendarMonthRounded />,
      description: 'Month to date',
      color: '#15b79e',
      to: '/history',
      trend: monthTrend,
      trendDescription: 'vs same elapsed days last month',
      sparkline: appSpark,
    },
    {
      label: 'Period Applications',
      value: cards.rangeApplications,
      icon: <AssessmentRounded />,
      description: 'Within your reporting period',
      color: '#3978f6',
      onClick: () =>
        document.getElementById('ats-application-chart')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        }),
      trendDescription: 'Recorded applications',
      sparkline: appSpark,
    },
    {
      label: 'All-Time Applications',
      value: cards.overallApplications,
      icon: <AutoAwesomeRounded />,
      description: 'Current cumulative profile totals',
      color: '#8b65d8',
      to: '/history',
      trendDescription: 'Includes starting application totals',
    },
    {
      label: 'Total Recruiters',
      value: cards.totalRecruiters,
      icon: <PersonOutlineRounded />,
      description: 'Active staff accounts in scope',
      color: '#52a9bd',
      onClick: () =>
        document.getElementById('ats-recruiter-performance')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        }),
      trendDescription: user.role === 'admin' ? 'Your recruitment team' : 'Your assigned workspace',
    },
  ];
  const changePreset = (value) => {
    if (!value) return;
    setPreset(value);
    if (value !== 'custom') {
      const next = presetRange(value);
      setRange(next);
      setCustom(next);
    }
  };
  const selectDay = (date) => {
    setPreset('custom');
    setRange({
      from: date,
      to: date,
      allTime: false,
    });
    setCustom({
      from: date,
      to: date,
    });
    document.getElementById('ats-application-chart')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };
  const reset = () => {
    setFilters(baseFilters);
    setDraft(baseFilters);
    changePreset('last30');
  };
  const doExport = async (type) => {
    if (!data) return;
    setExporting(type);
    try {
      if (type === 'excel')
        await exportDashboardExcel({
          cards,
          charts,
          range: {
            from: (data.range?.from || range.from || '').slice(0, 10),
            to: (data.range?.to || range.to || '').slice(0, 10),
          },
          selectedStaff: currentStaff,
        });
      if (type === 'csv')
        downloadFile(
          'smartapply-dashboard.csv',
          csv([
            ['Metric', 'Value'],
            ...metrics.map((metric) => [metric.label, metric.value]),
            [],
            ['Date', 'Applications', 'New candidates'],
            ...rows.map((row) => [row.date, row.applications, row.candidates ?? '']),
          ]),
        );
      if (type === 'charts') {
        const svg = document
          .getElementById('ats-application-chart')
          ?.querySelector('svg.recharts-surface');
        if (!svg) throw new Error('No chart is available to download.');
        const clone = svg.cloneNode(true);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        downloadFile(
          'smartapply-application-chart.svg',
          new XMLSerializer().serializeToString(clone),
          'image/svg+xml',
        );
      }
      if (type === 'print') {
        setExportOpen(false);
        window.setTimeout(() => window.print(), 200);
      }
    } catch (err) {
      enqueueSnackbar(getApiError(err), {
        variant: 'error',
      });
    } finally {
      setExporting('');
    }
  };
  const timeHour = Number(
    new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      hourCycle: 'h23',
      timeZone: 'Asia/Kolkata',
    }).format(now),
  );
  const greeting =
    timeHour < 12 ? 'Good morning' : timeHour < 17 ? 'Good afternoon' : 'Good evening';
  const reportingRange =
    data?.range ||
    (rows.length
      ? {
          from: rows[0].date,
          to: rows.at(-1).date,
        }
      : range);
  const techRows =
    techMetric === 'applications'
      ? charts.technologyWise || []
      : charts.candidateTechnologies || [];
  const techTotal = techRows.reduce((sum, row) => sum + (row[techMetric] || 0), 0);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const quickActions = [
    [
      'Add candidate',
      'Start a new candidate profile',
      '/students?action=add',
      <PersonAddRounded key="add" />,
    ],
    [
      'Import candidates',
      'Bring your Excel data into SmartApply',
      '/students?action=import',
      <UploadFileRounded key="import" />,
    ],
    [
      'Daily tracker',
      'Review and update application totals',
      '/students?view=matrix',
      <CalendarMonthRounded key="daily" />,
    ],
    [
      'Add technology',
      'Manage your technology domains',
      '/technologies',
      <CodeRounded key="tech" />,
    ],
    ...(user.role === 'admin'
      ? [
          [
            'Generate report',
            'Download candidate application reports',
            '/reports',
            <AssessmentRounded key="report" />,
          ],
          [
            'Manage recruiters',
            'Manage staff accounts and access',
            '/users',
            <GroupsRounded key="staff" />,
          ],
        ]
      : []),
  ];
  if (error && !data)
    return (
      <Box className="operations-dashboard ats-dashboard">
        <Typography component="h1" sx={{ mb: 3 }}>
          Dashboard
        </Typography>
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => load()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
        <EmptyState
          title="Workspace data unavailable"
          description="Retry to load your candidate and application records."
        />
      </Box>
    );
  return (
    <Box className="operations-dashboard ats-dashboard">
      <AnimatedSection>
        <Stack
          className="ats-page-heading"
          direction={{
            xs: 'column',
            sm: 'row',
          }}
          sx={{
            gap: 2,
            justifyContent: 'space-between',
            alignItems: {
              xs: 'flex-start',
              sm: 'center',
            },
          }}
        >
          <Box>
            <Typography className="ats-eyebrow">WORKSPACE OVERVIEW</Typography>
            <Typography component="h1">Dashboard</Typography>
          </Box>
          <Stack
            direction="row"
            sx={{
              gap: 1,
            }}
          >
            <Tooltip title="Export Report">
              <span>
                <IconButton
                  aria-label="Export Report"
                  disabled={!data || loading}
                  onClick={() => setExportOpen(true)}
                  className="ats-icon-button ats-primary-icon"
                >
                  <DownloadRounded />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Refresh">
              <span>
                <IconButton
                  aria-label="Refresh"
                  disabled={loading}
                  onClick={() => {
                    load();
                  }}
                  className="ats-icon-button"
                >
                  {loading ? <CircularProgress size={20} /> : <RefreshRounded />}
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Stack>
        <Box className="ats-welcome">
          <Box className="ats-welcome-content">
            <Chip
              className="ats-welcome-chip"
              icon={<AutoAwesomeRounded />}
              size="small"
              label="Your placement workspace"
            />
            <Typography component="h2">
              {greeting}, {user.name?.split(' ')[0] || 'there'}
              <span className="ats-welcome-dot">.</span>
            </Typography>
            <Typography color="text.secondary">
              A clear view of your candidates, your team, and the progress that matters.
            </Typography>
            <Stack
              direction="row"
              sx={{
                gap: 1.5,
                alignItems: 'center',
                flexWrap: 'wrap',
                mt: 1,
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {formatDate(now, {
                  weekday: 'long',
                  year: 'numeric',
                })}{' '}
                ·{' '}
                {now.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Kolkata',
                })}{' '}
                IST
              </Typography>
              <Chip
                className="ats-sync-chip"
                size="small"
                label={
                  error
                    ? 'Sync needs attention'
                    : loading
                      ? 'Syncing workspace…'
                      : 'Auto-refresh · 15 sec'
                }
              />
            </Stack>
          </Box>
          <Box className="ats-welcome-action">
            <Button
              component={Link}
              to="/students?action=add"
              variant="contained"
              startIcon={<AddRounded />}
            >
              Add candidate
            </Button>
          </Box>
        </Box>
      </AnimatedSection>
      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={() => load()}>
              Retry
            </Button>
          }
          sx={{
            mb: 2,
          }}
        >
          Could not refresh dashboard: {error}
          {data && ' Showing the last successful data.'}
        </Alert>
      )}
      <AnimatedSection delay={0.05}>
        <Box className="ats-filters">
          <Stack
            direction={{
              xs: 'column',
              md: 'row',
            }}
            sx={{
              gap: 1.5,
              justifyContent: 'space-between',
              alignItems: {
                xs: 'stretch',
                md: 'center',
              },
            }}
          >
            <ToggleButtonGroup
              exclusive
              value={preset}
              onChange={(_, value) => changePreset(value)}
              size="small"
              aria-label="Dashboard date range"
            >
              {presets.map(([value, label]) => (
                <ToggleButton key={value} value={value}>
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Button
              className="ats-filter-button"
              startIcon={<FilterAltRounded />}
              onClick={() => setFilterOpen((value) => !value)}
              aria-expanded={filterOpen}
            >
              {filterOpen ? 'Hide filters' : 'Filters'}
              {activeFilterCount ? ` (${activeFilterCount})` : ''}
            </Button>
          </Stack>
          {preset === 'custom' && (
            <Stack
              direction={{
                xs: 'column',
                sm: 'row',
              }}
              sx={{
                gap: 1.5,
                mt: 2,
              }}
            >
              <TextField
                type="date"
                size="small"
                label="From date"
                value={custom.from || ''}
                onChange={(event) =>
                  setCustom((current) => ({
                    ...current,
                    from: event.target.value,
                  }))
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
              />
              <TextField
                type="date"
                size="small"
                label="To date"
                value={custom.to || ''}
                onChange={(event) =>
                  setCustom((current) => ({
                    ...current,
                    to: event.target.value,
                  }))
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
              />
              <Button
                variant="contained"
                disabled={!custom.from || !custom.to || custom.to < custom.from}
                onClick={() =>
                  setRange({
                    from: custom.from,
                    to: custom.to,
                    allTime: false,
                  })
                }
              >
                Apply range
              </Button>
            </Stack>
          )}
          {filterOpen && (
            <Box className="ats-filter-fields">
              {optionsError && (
                <Alert
                  severity="warning"
                  sx={{
                    gridColumn: '1 / -1',
                  }}
                >
                  {optionsError}
                </Alert>
              )}
              {user.role === 'admin' && (
                <TextField
                  select
                  label="Assigned Staff"
                  size="small"
                  value={draft.staff}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      staff: event.target.value,
                    }))
                  }
                >
                  <MenuItem value="">All recruiters</MenuItem>
                  {options.staff.map((row) => (
                    <MenuItem key={row._id} value={row._id}>
                      {row.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}
              <TextField
                select
                label="Technology"
                size="small"
                value={draft.technology}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    technology: event.target.value,
                  }))
                }
              >
                <MenuItem value="">All technologies</MenuItem>
                {options.technologies.map((row) => (
                  <MenuItem key={row._id} value={row._id}>
                    {row.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Candidate status"
                size="small"
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value,
                  }))
                }
              >
                <MenuItem value="">All statuses</MenuItem>
                {['active', 'inactive', 'placed'].map((status) => (
                  <MenuItem key={status} value={status}>
                    {status[0].toUpperCase() + status.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Membership"
                size="small"
                value={draft.membershipType}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    membershipType: event.target.value,
                  }))
                }
              >
                <MenuItem value="">All memberships</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
                <MenuItem value="free">Free</MenuItem>
              </TextField>
              <Stack
                direction="row"
                sx={{
                  gap: 1,
                }}
              >
                <Button onClick={reset}>Reset</Button>
                <Button
                  variant="contained"
                  onClick={() =>
                    setFilters({
                      ...draft,
                    })
                  }
                >
                  Apply filters
                </Button>
              </Stack>
            </Box>
          )}
          <Stack
            direction="row"
            sx={{
              gap: 1,
              flexWrap: 'wrap',
              alignItems: 'center',
              mt: 1.5,
            }}
          >
            <CalendarMonthRounded
              sx={{
                fontSize: 15,
                color: 'text.secondary',
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {reportingRange?.from && reportingRange?.to
                ? `${formatDate(reportingRange.from, {
                    year: 'numeric',
                  })} – ${formatDate(reportingRange.to, {
                    year: 'numeric',
                  })}`
                : 'Reporting period'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              · {currentStaff?.name || (user.role === 'staff' ? 'My candidates' : 'All recruiters')}
            </Typography>
            {activeFilterCount > 0 && (
              <Button size="small" onClick={reset}>
                Clear filters
              </Button>
            )}
            <Typography className="ats-last-sync" variant="caption" color="text.secondary">
              {lastSync
                ? `Last synced ${lastSync.toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Kolkata',
                  })}`
                : 'Connecting…'}
            </Typography>
          </Stack>
        </Box>
      </AnimatedSection>
      <AnimatedSection delay={0.1}>
        <Box className="ats-metrics-grid">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} loading={loading && !data} />
          ))}
        </Box>
      </AnimatedSection>
      <AnimatedSection className="ats-analytics-grid" delay={0.15}>
        <Box id="ats-application-chart" className="ats-chart-anchor">
          <Panel
            title="Application analytics"
            description="Applications and new candidate registrations over time"
            loading={loading && !data}
            action={
              <TextField
                select
                size="small"
                label="Group by"
                value={granularity}
                onChange={(event) => setGranularity(event.target.value)}
                sx={{
                  width: 110,
                }}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </TextField>
            }
          >
            <Stack
              className="ats-chart-stats"
              direction="row"
              sx={{
                gap: 3,
              }}
            >
              <Box>
                <Typography variant="caption" color="text.secondary">
                  PERIOD APPLICATIONS
                </Typography>
                <Typography component="p" variant="h4">
                  {formatNumber(cards.rangeApplications)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  DAILY AVERAGE
                </Typography>
                <Typography component="p" variant="h4">
                  {formatNumber(rows.length ? cards.rangeApplications / rows.length : 0)}
                </Typography>
              </Box>
              <Box
                sx={{
                  ml: 'auto !important',
                }}
              >
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={chartSeries}
                  onChange={(_, value) => value && setChartSeries(value)}
                  aria-label="Application chart view"
                >
                  <ToggleButton value="activity">Activity</ToggleButton>
                  <ToggleButton value="growth">Growth</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Stack>
            {rows.some((row) => row.applications > 0 || row.candidates > 0) ? (
              <ResponsiveContainer width="100%" height={270}>
                <ComposedChart
                  data={plot}
                  margin={{
                    top: 15,
                    right: 4,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient id="atsApplications" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#3978f6" stopOpacity={0.24} />
                      <stop offset="100%" stopColor="#3978f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="var(--ats-border)"
                    strokeDasharray="4 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={35}
                    tick={{
                      fill: 'var(--ats-muted)',
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    yAxisId="applications"
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{
                      fill: 'var(--ats-muted)',
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    yAxisId="candidates"
                    orientation="right"
                    width={35}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: '#15b79e',
                      fontSize: 11,
                    }}
                    allowDecimals={false}
                  />
                  <ChartTooltip contentStyle={chartTip} labelFormatter={formatDate} />
                  <Legend
                    iconType="circle"
                    iconSize={7}
                    wrapperStyle={{
                      fontSize: 12,
                      paddingTop: 15,
                    }}
                  />
                  <Area
                    yAxisId="applications"
                    type="monotone"
                    dataKey={chartSeries === 'growth' ? 'cumulative' : 'applications'}
                    name={chartSeries === 'growth' ? 'Cumulative applications' : 'Applications'}
                    stroke="#3978f6"
                    fill="url(#atsApplications)"
                    strokeWidth={2.5}
                    isAnimationActive={false}
                  />
                  {chartSeries === 'activity' && rows.some((row) => row.candidates != null) && (
                    <Line
                      yAxisId="candidates"
                      type="monotone"
                      dataKey="candidates"
                      name="New candidates (right scale)"
                      stroke="#15b79e"
                      dot={false}
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                title="No application activity"
                description="Record candidate application totals to see your progress here."
                action="Open daily tracker"
                to="/students?view=matrix"
              />
            )}
          </Panel>
        </Box>
        <Panel
          title="Candidate status"
          description="Current distribution in your workspace"
          loading={loading && !data}
        >
          {cards.totalStudents ? (
            <>
              <Box className="ats-donut">
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={distribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={72}
                      outerRadius={94}
                      paddingAngle={4}
                      cornerRadius={5}
                      stroke="none"
                      isAnimationActive={false}
                      onClick={(item) => selectStatus(item.status)}
                    >
                      {distribution.map((item, index) => (
                        <Cell key={item.name} fill={colors[index]} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      contentStyle={chartTip}
                      formatter={(value, name) => [
                        `${formatNumber(value)} · ${percent(value, cards.totalStudents)}%`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <Box className="ats-donut-center">
                  <Typography component="p" variant="h4">
                    {formatNumber(cards.totalStudents)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total candidates
                  </Typography>
                </Box>
              </Box>
              <Stack
                sx={{
                  gap: 1.3,
                }}
              >
                {distribution.map((item, index) => (
                  <Button
                    key={item.name}
                    className="ats-status-legend"
                    onClick={() => selectStatus(item.status)}
                  >
                    <span
                      className="ats-dot"
                      style={{
                        background: colors[index],
                      }}
                    />
                    <span>{item.name}</span>
                    <strong>{formatNumber(item.value)}</strong>
                    <span className="ats-muted">{percent(item.value, cards.totalStudents)}%</span>
                  </Button>
                ))}
              </Stack>
            </>
          ) : (
            <EmptyState
              title="No candidates yet"
              description="Your candidate statuses will appear once profiles are added."
              action="Add candidate"
              to="/students?action=add"
            />
          )}
        </Panel>
      </AnimatedSection>
      <AnimatedSection className="ats-insights-grid" delay={0.2}>
        <Panel
          title="Workspace insights"
          description="Useful signals from your actual candidate and application data"
        >
          <Box className="ats-insight-items">
            {[
              [
                'Placement success',
                `${placementRate}%`,
                'Placed / total candidates',
                <StarsRounded key="placed" />,
              ],
              [
                'Paid membership share',
                `${paidRate}%`,
                `${formatNumber(cards.paidUsers)} paid members`,
                <WorkspacePremiumRounded key="paid" />,
              ],
              [
                'Applications per candidate',
                formatNumber(cards.averageApplicationsPerStudent),
                'Current profile totals / candidates',
                <TrendingUpRounded key="avg" />,
              ],
              [
                'New registrations this month',
                data?.comparisons?.registrations?.current == null
                  ? '—'
                  : formatNumber(data.comparisons.registrations.current),
                data?.comparisons?.registrations
                  ? `${formatNumber(data.comparisons.registrations.previous)} in the same days last month`
                  : 'No registration comparison available',
                <PersonAddRounded key="new" />,
              ],
            ].map(([label, value, description, icon]) => (
              <Box className="ats-insight" key={label}>
                <Avatar>{icon}</Avatar>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 650,
                  }}
                >
                  {label}
                </Typography>
                <Typography component="p" variant="h5">
                  {value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Panel>
      </AnimatedSection>
      <Box className="ats-two-column">
        <Panel
          title="Technology analytics"
          description="The technology domains used by your candidates"
          loading={loading && !data}
          action={
            <ToggleButtonGroup
              exclusive
              size="small"
              value={techMetric}
              onChange={(_, value) => value && setTechMetric(value)}
              aria-label="Technology metric"
            >
              <ToggleButton value="applications">Applications</ToggleButton>
              <ToggleButton value="candidates">Candidates</ToggleButton>
            </ToggleButtonGroup>
          }
        >
          {techRows.length ? (
            <>
              <ResponsiveContainer
                width="100%"
                height={Math.max(220, Math.min(techRows.length, 10) * 36)}
              >
                <BarChart
                  layout="vertical"
                  data={techRows.slice(0, 10)}
                  margin={{
                    top: 5,
                    left: 0,
                    right: 25,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    stroke="var(--ats-border)"
                    horizontal={false}
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{
                      fill: 'var(--ats-muted)',
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="technology"
                    width={100}
                    tick={{
                      fill: 'var(--ats-muted)',
                      fontSize: 11,
                    }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip
                    contentStyle={chartTip}
                    formatter={(value) => [
                      `${formatNumber(value)} · ${percent(value, techTotal)}%`,
                      techMetric === 'applications' ? 'Applications' : 'Candidates',
                    ]}
                  />
                  <Bar
                    dataKey={techMetric}
                    fill="#3978f6"
                    radius={[0, 5, 5, 0]}
                    barSize={16}
                    isAnimationActive={false}
                  />
                </BarChart>
              </ResponsiveContainer>
              <Typography variant="caption" color="text.secondary">
                Top {Math.min(techRows.length, 10)} domains · {formatNumber(techTotal)} {techMetric}{' '}
                across all domains
              </Typography>
            </>
          ) : (
            <EmptyState
              title="No technology activity"
              description="Technology data appears as candidates and applications are added."
              action="Manage technologies"
              to="/technologies"
            />
          )}
        </Panel>
        <Panel
          title="Candidate workspace"
          description="Current statuses, membership, and today's update coverage"
        >
          <Box className="ats-status-flow">
            {distribution.map((item, index) => (
              <Link
                key={item.name}
                to={scope({
                  status: item.status,
                })}
              >
                <span
                  className="ats-dot"
                  style={{
                    background: colors[index],
                  }}
                />
                <Typography variant="body2">{item.name}</Typography>
                <Typography component="p" variant="h4">
                  {formatNumber(item.value)}
                </Typography>
                <LinearProgress
                  aria-label={`${item.name} candidate share`}
                  variant="determinate"
                  value={percent(item.value, cards.totalStudents)}
                  sx={{
                    '& .MuiLinearProgress-bar': {
                      bgcolor: colors[index],
                    },
                  }}
                />
              </Link>
            ))}
          </Box>
          <Box className="ats-membership-bar">
            <Stack
              direction="row"
              sx={{
                justifyContent: 'space-between',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                }}
              >
                Membership mix
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {paidRate}% paid
              </Typography>
            </Stack>
            <LinearProgress
              aria-label="Paid membership share"
              variant="determinate"
              value={paidRate}
            />
            <Stack
              direction="row"
              sx={{
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Paid · {formatNumber(cards.paidUsers)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Free · {formatNumber(cards.freeUsers)}
              </Typography>
            </Stack>
          </Box>
          <Box className="ats-daily-summary">
            <CheckCircleRounded />
            <Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                }}
              >
                Daily activity summary
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {cards.updatedToday == null
                  ? 'Update coverage unavailable'
                  : `${formatNumber(cards.updatedToday)} candidates have a recorded update today`}
              </Typography>
            </Box>
            <Button component={Link} to="/students?view=matrix" size="small">
              Review
            </Button>
          </Box>
        </Panel>
        <RecentActivityPanel rows={charts.recentActivity || []} />
        <ActivityCalendar rows={rows} onSelect={selectDay} />
      </Box>
      <Box className="ats-candidate-section">
        <RecentCandidates filters={filters} refreshKey={refreshKey} />
      </Box>
      <Box className="ats-two-column ats-bottom-grid">
        <Box id="ats-recruiter-performance" className="ats-chart-anchor">
          {user.role === 'admin' ? (
            <RecruiterPerformance
              rows={charts.staffPerformance || []}
              onSelect={(staff) => {
                setFilters((current) => ({
                  ...current,
                  staff,
                }));
                setDraft((current) => ({
                  ...current,
                  staff,
                }));
                window.scrollTo({
                  top: 0,
                  behavior: 'smooth',
                });
              }}
            />
          ) : (
            <Panel
              title="My application progress"
              description="Your assigned candidates and daily progress"
            >
              <EmptyState
                title={`${formatNumber(cards.todayApplications)} applications today`}
                description={`${formatNumber(cards.totalStudents)} candidates in your workspace. Keep totals current using the daily tracker.`}
                action="Open daily tracker"
                to="/students?view=matrix"
              />
            </Panel>
          )}
        </Box>
        <Panel title="Quick actions" description="Keep your placement operations moving">
          <Box className="ats-quick-actions">
            {quickActions.map(([label, description, to, icon]) => (
              <Button key={label} component={Link} to={to}>
                <Avatar>{icon}</Avatar>
                <Box>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 750,
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {description}
                  </Typography>
                </Box>
                <ArrowForwardRounded
                  sx={{
                    ml: 'auto',
                    fontSize: 17,
                  }}
                />
              </Button>
            ))}
          </Box>
        </Panel>
      </Box>
      <Typography className="ats-footer" variant="caption" color="text.secondary">
        SmartApply · Candidate and application intelligence · Times shown in IST
      </Typography>
      <ActivityInbox
        key={user._id}
        userId={user._id}
        open={inboxOpen}
        onClose={() => setInboxOpen(false)}
        rows={charts.recentActivity || []}
      />
      <Dialog
        open={exportOpen}
        onClose={() => !exporting && setExportOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            Export workspace report
            <IconButton
              aria-label="Close export panel"
              disabled={Boolean(exporting)}
              onClick={() => setExportOpen(false)}
            >
              <CloseRounded />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 2,
            }}
          >
            Export the current dashboard scope and reporting period.
          </Typography>
          <Stack
            sx={{
              gap: 1,
            }}
          >
            {[
              [
                'excel',
                'Export Excel',
                'Metrics, charts, and staff performance',
                <DownloadRounded key="excel" />,
              ],
              [
                'csv',
                'Export CSV',
                'Dashboard metrics and daily activity',
                <DownloadRounded key="csv" />,
              ],
              [
                'print',
                'Print / Save PDF',
                'Use your browser’s print and PDF options',
                <PrintRounded key="print" />,
              ],
              [
                'charts',
                'Download chart',
                'Export the application chart as SVG',
                <AssessmentRounded key="chart" />,
              ],
            ].map(([type, label, description, icon]) => (
              <Button
                key={type}
                onClick={() => doExport(type)}
                disabled={Boolean(exporting) || !data}
                variant="outlined"
                sx={{
                  py: 1.5,
                  justifyContent: 'flex-start',
                  gap: 2,
                }}
              >
                {exporting === type ? <CircularProgress size={22} /> : icon}
                <Box
                  sx={{
                    textAlign: 'left',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 750,
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {description}
                  </Typography>
                </Box>
              </Button>
            ))}
            {user.role === 'admin' && (
              <Button
                component={Link}
                to="/reports"
                endIcon={<ArrowForwardRounded />}
                onClick={() => setExportOpen(false)}
              >
                Generate a monthly report
              </Button>
            )}
          </Stack>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
