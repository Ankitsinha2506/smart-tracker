import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { Add, ArrowForward, AssessmentOutlined, CheckCircleOutlined, GroupsOutlined, History, Refresh, TrendingUp, Update } from '@mui/icons-material';
import { Alert, Avatar, Box, Button, ButtonBase, Chip, CircularProgress, LinearProgress, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../app/AuthContext.jsx';
import { ApplicationCountDialog } from '../../features/students/ApplicationCountDialog.jsx';
import { apiClient, getApiError } from '../../services/apiClient.js';

const panel = { p: { xs: 2, sm: 3 }, borderRadius: 3, border: 1, borderColor: 'divider', backgroundImage: 'none' };
const formatDate = value => value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : 'Never';
const number = value => Number(value || 0).toLocaleString('en-IN');

const OriginalDashboard = lazy(() => import('./AnalyticsPage.jsx').then(module => ({ default: module.AnalyticsPage })));

export function DashboardPage() {
  const { user } = useAuth();
  return user.role === 'student' ? <WorkspaceDashboardPage /> : (
    <Suspense fallback={<CircularProgress aria-label="Loading dashboard" />}>
      <OriginalDashboard />
    </Suspense>
  );
}

export function WorkspaceDashboardPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(7);
  const [selected, setSelected] = useState(null);
  const requestId = useRef(0);
  const attentionRef = useRef(null);
  const candidate = user.role === 'student';
  const staff = user.role === 'staff';
  const load = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/dashboard/workspace');
      if (id === requestId.current) setData(response.data.data);
    } catch (err) {
      if (id === requestId.current) setError(getApiError(err));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);
  useEffect(() => { load(); return () => { requestId.current += 1; }; }, [load]);
  const update = async payload => {
    try {
      await apiClient.patch(candidate ? '/students/me/application-count' : `/students/${selected._id}/application-count`, payload);
      enqueueSnackbar('Application total updated', { variant: 'success', style: { backgroundColor: '#166534', color: '#fff' } });
      setSelected(null);
      await load();
    } catch (err) {
      enqueueSnackbar(getApiError(err), { variant: 'error' });
    }
  };
  const cards = data?.cards || {};
  const summary = candidate ? [
    ['Total applications', cards.applications, <TrendingUp key="total" />, '/history', 'primary.main'],
    ["Today's applications", cards.todayApplications, <Update key="today" />, '/history', 'success.main'],
    ['Membership', data?.profile?.membershipType || '—', <CheckCircleOutlined key="member" />, '/my-profile', 'secondary.main'],
    ['Last update', formatDate(data?.profile?.lastApplicationUpdateDate), <History key="last" />, '/history', 'warning.main'],
  ] : [
    [staff ? 'My active candidates' : 'Active candidates', cards.active, <GroupsOutlined key="active" />, '/students?status=active', 'primary.main'],
    ["Today's applications", cards.todayApplications, <TrendingUp key="today" />, '/history', 'success.main'],
    ['Updated today', cards.updated, <CheckCircleOutlined key="updated" />, '#attention', 'secondary.main'],
    ['Awaiting update', cards.pending, <Update key="pending" />, '#attention', 'warning.main'],
  ];
  const actions = candidate ? [
    ['My profile', '/my-profile', <GroupsOutlined key="profile" />], ['Application history', '/history', <History key="history" />],
  ] : [
    ['Daily tracker', '/students?view=matrix', <Update key="tracker" />],
    ['Add candidate', '/students?action=add', <Add key="add" />],
    ['Import candidates', '/students?action=import', <GroupsOutlined key="import" />],
    ['Detailed analytics', '/analytics', <AssessmentOutlined key="analytics" />],
    ...(user.role === 'admin' ? [['Download reports', '/reports', <AssessmentOutlined key="reports" />]] : []),
  ];
  const progress = cards.active ? Math.round(cards.updated / cards.active * 100) : 0;
  return (
    <Stack spacing={3}>
      <Paper sx={{ ...panel, color: '#fff', background: 'linear-gradient(115deg, #283fa4, #5d50c8)', position: 'relative', overflow: 'hidden', '&::after': { content: '""', position: 'absolute', width: 240, height: 240, right: -65, top: -110, borderRadius: '50%', border: '40px solid rgba(255,255,255,.06)', pointerEvents: 'none' } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}>
          <Box>
            <Typography variant="overline" sx={{ opacity: .8, letterSpacing: '.12em' }}>{candidate ? 'Your application journey' : staff ? 'Your daily workspace' : 'Team overview'}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, fontSize: { xs: 25, md: 32 }, mt: .5 }}>Welcome back, {user.name?.split(' ')[0] || 'there'}</Typography>
            <Typography sx={{ mt: 1, opacity: .85 }}>{candidate ? 'Follow your progress and keep your application total up to date.' : 'A clear view of today’s progress and what needs your attention.'}</Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 2, opacity: .8 }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}</Typography>
          </Box>
          <Button variant="contained" startIcon={<Update />} disabled={candidate && !data?.profile} onClick={candidate ? () => setSelected(data.profile) : () => attentionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} sx={{ bgcolor: '#fff', color: '#343fa6', flexShrink: 0, '&:hover': { bgcolor: '#eef0ff' } }}>{candidate ? 'Update my total' : 'Review pending updates'}</Button>
        </Stack>
      </Paper>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={750}>Today at a glance</Typography>
        <Button size="small" startIcon={loading ? <CircularProgress aria-label="Refreshing dashboard" size={14} /> : <Refresh />} disabled={loading} onClick={load}>Refresh</Button>
      </Stack>
      {error && <Alert severity="error" action={<Button color="inherit" onClick={load}>Retry</Button>}>{error}</Alert>}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
        {summary.map(([label, value, icon, to, color]) => <Paper key={label} sx={{ ...panel, p: 0, overflow: 'hidden' }}>
          <ButtonBase component={to.startsWith('#') ? 'button' : Link} to={to.startsWith('#') ? undefined : to} onClick={to.startsWith('#') ? () => attentionRef.current?.scrollIntoView({ behavior: 'smooth' }) : undefined} sx={{ p: { xs: 2, sm: 2.5 }, width: '100%', display: 'block', textAlign: 'left', '&:hover': { bgcolor: 'action.hover' } }}>
            <Avatar sx={{ bgcolor: 'action.hover', color, borderRadius: 2, mb: 2 }}>{icon}</Avatar>
            <Typography color="text.secondary" variant="body2">{label}</Typography>
            <Typography sx={{ fontSize: { xs: 25, sm: 30 }, fontWeight: 800, mt: .5, textTransform: 'capitalize' }}>{loading && !data ? '—' : typeof value === 'string' ? value : number(value)}</Typography>
          </ButtonBase>
        </Paper>)}
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' }, gap: 3 }}>
        <Paper ref={attentionRef} sx={{ ...panel, scrollMarginTop: 100 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6" fontWeight={750}>{candidate ? 'Your next step' : 'Needs attention'}</Typography>
            {!candidate && <Chip size="small" label={`${number(cards.pending)} pending`} color={cards.pending ? 'warning' : 'success'} variant="outlined" />}
          </Stack>
          {candidate ? <Box sx={{ py: 3 }}><Typography variant="h6">Keep your progress current</Typography><Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>Record the total shown on Naukri. Your daily application count is calculated automatically.</Typography><Button variant="contained" disabled={!data?.profile} onClick={() => setSelected(data.profile)} startIcon={<Update />}>Update application total</Button></Box> : <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Active candidates with no recorded application update today.</Typography>
            {loading && !data ? <CircularProgress aria-label="Loading pending updates" size={24} /> : !error && !data?.attention?.length ? <Stack spacing={1} sx={{ alignItems: 'center', py: 4 }}><CheckCircleOutlined color="success" sx={{ fontSize: 40 }} /><Typography fontWeight={700}>{cards.active ? 'All active candidates are up to date' : 'No active candidates yet'}</Typography><Typography variant="body2" color="text.secondary">{cards.active ? 'Today’s updates are complete.' : 'Add a candidate to get started.'}</Typography></Stack> : data?.attention?.map(student => <Stack key={student._id} direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, py: 1.75, borderBottom: 1, borderColor: 'divider' }}>
              <Box><Typography fontWeight={700}>{student.candidateName}</Typography><Typography variant="caption" color="text.secondary">{student.createdBy?.name || 'Staff unavailable'} · Last update: {formatDate(student.lastApplicationUpdateDate)}</Typography></Box>
              <Button size="small" variant="outlined" startIcon={<Update />} onClick={() => setSelected(student)}>Update count</Button>
            </Stack>)}
            {!!cards.active && <Box sx={{ mt: 3 }}><Stack direction="row" sx={{ justifyContent: 'space-between', mb: 1 }}><Typography variant="caption" color="text.secondary">{number(cards.updated)} of {number(cards.active)} active candidates updated</Typography><Typography variant="caption" fontWeight={700}>{progress}%</Typography></Stack><LinearProgress aria-label="Today’s candidate update completion" variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} /></Box>}
            <Button component={Link} to="/students" endIcon={<ArrowForward />} sx={{ mt: 2 }}>Open candidate workspace</Button>
          </>}
        </Paper>
        <Paper sx={panel}>
          <Typography variant="h6" fontWeight={750}>Quick actions</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: .5, mb: 2 }}>Everything you need to keep moving.</Typography>
          <Stack spacing={1}>{actions.map(([label, to, icon]) => <Button key={label} component={Link} to={to} startIcon={icon} endIcon={<ArrowForward />} sx={{ justifyContent: 'flex-start', px: 2, py: 1.6, bgcolor: 'action.hover', color: 'text.primary', '& .MuiButton-endIcon': { ml: 'auto' } }}>{label}</Button>)}</Stack>
          {!candidate && <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}><Typography variant="caption" color="text.secondary">Placement progress</Typography><Typography sx={{ fontWeight: 750 }}>{number(cards.placed)} placed · {number(cards.total)} total candidates</Typography></Box>}
        </Paper>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(0, 1fr)' }, gap: 3 }}>
        <Paper sx={panel}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', mb: 3 }}><Box><Typography variant="h6" fontWeight={750}>Application activity</Typography><Typography variant="body2" color="text.secondary">Daily applications in your workspace</Typography></Box><ToggleButtonGroup size="small" exclusive value={days} onChange={(_, value) => value && setDays(value)} aria-label="Activity period"><ToggleButton value={1}>Today</ToggleButton><ToggleButton value={7}>7 days</ToggleButton><ToggleButton value={30}>30 days</ToggleButton></ToggleButtonGroup></Stack>
          <Box sx={{ height: 250, minWidth: 0 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={data?.dailyTrend?.slice(-days) || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}><defs><linearGradient id="workspaceActivity" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#635bd7" stopOpacity={.3} /><stop offset="100%" stopColor="#635bd7" stopOpacity={.02} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b833" /><XAxis dataKey="date" tickFormatter={formatDate} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={25} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip labelFormatter={formatDate} contentStyle={{ borderRadius: 12 }} /><Area type="monotone" dataKey="applications" name="Applications" stroke="#635bd7" strokeWidth={3} fill="url(#workspaceActivity)" dot={days === 1} /></AreaChart></ResponsiveContainer></Box>
        </Paper>
        <Paper sx={panel}><Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="h6" fontWeight={750}>Recent updates</Typography><Button component={Link} to="/history" size="small">View all</Button></Stack>
          {!data?.recent?.length && <Typography color="text.secondary" variant="body2" sx={{ py: 4 }}>{loading ? 'Loading updates…' : 'Application updates will appear here.'}</Typography>}
          {data?.recent?.map(item => <Stack key={item._id} direction="row" spacing={1.5} sx={{ py: 2, borderBottom: 1, borderColor: 'divider' }}><Avatar sx={{ width: 34, height: 34, bgcolor: 'action.hover', color: 'success.main' }}><TrendingUp fontSize="small" /></Avatar><Box sx={{ minWidth: 0 }}><Typography variant="body2" fontWeight={700}>{item.student?.candidateName || 'Candidate'}</Typography><Typography variant="caption" color="text.secondary">+{number(item.dailyCount)} applications · {formatDate(item.applicationDate)}</Typography>{!candidate && <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>Recorded by {item.recordedBy?.name || 'Staff'}</Typography>}</Box></Stack>)}
        </Paper>
      </Box>
      {data && <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>Last refreshed {new Date(data.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Typography>}
      <ApplicationCountDialog open={Boolean(selected)} student={selected} onClose={() => setSelected(null)} onSubmit={update} />
    </Stack>
  );
}
