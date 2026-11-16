import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AccountBalanceWalletOutlined,
  ArrowForward,
  AssessmentOutlined,
  CheckCircleOutlined,
  CurrencyRupee,
  EmailOutlined,
  EventAvailable,
  NotificationsNoneRounded,
  PersonAddAlt1,
  Payments,
  WhatsApp,
  SettingsOutlined,
  TrendingUp,
  WarningAmber,
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
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
  Typography,
  useTheme,
} from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../app/AuthContext.jsx';
import { useApplicationRefresh } from '../../app/applicationRefresh.js';
import { apiClient, getApiError } from '../../services/apiClient.js';
import { useSnackbar } from 'notistack';
import { BrandLogo } from '../../components/BrandLogo.jsx';

const colors = ['#7546ff', '#4d65e8', '#efa51a', '#e95670', '#8057d9', '#34a879'];
const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const date = (value) => value
  ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
  : '—';
const panel = {
  p: { xs: 2, sm: 2.5 },
  minWidth: 0,
  height: '100%',
  borderRadius: 3.5,
  border: '1px solid',
  borderColor: 'divider',
  backgroundImage: 'none',
  boxShadow: '0 10px 30px rgba(21,52,86,.055)',
};
const statusRows = [
  { key: 'paidCandidates', label: 'Paid', color: '#24a879', tint: '#e7f7f0' },
  { key: 'pendingCandidates', label: 'Pending', color: '#4d65e8', tint: '#edf0ff' },
  { key: 'partiallyPaid', label: 'Partially paid', color: '#efa51a', tint: '#fff5e5' },
  { key: 'overdue', label: 'Overdue', color: '#e95670', tint: '#fff0f2' },
];

export function BDRecoveryDashboard() {
  const theme = useTheme();
  const darkMode = theme.palette.mode === 'dark';
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reminderChannel, setReminderChannel] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentCandidateId, setPaymentCandidateId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/bd-recovery', { params: { page: 1, limit: 100 } });
      setData(response.data.data);
      setError('');
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }, []);
  useApplicationRefresh(load);
  useEffect(() => { load(); }, [load]);

  const candidates = data?.items || [];
  const totals = data?.totals || {};
  const months = data?.monthlyTrend || [];
  const upcomingDue = data?.upcomingDue || [];
  const recentPayments = data?.recentPayments || [];
  const technologyBreakdown = data?.technologyBreakdown || [];
  const companyBreakdown = data?.companyBreakdown || [];
  const pendingList = [...candidates]
    .filter((item) => item.pendingAmount > 0)
    .sort((a, b) => b.pendingAmount - a.pendingAmount)
    .slice(0, 6);
  const collectionRate = totals.total ? Math.round((totals.paid / totals.total) * 100) : 0;
  const candidateCount = Number(data?.total || 0);
  const maxTechnologyPending = Math.max(1, ...technologyBreakdown.map((item) => item.pending));
  const recoveryMix = [
    { name: 'Collected', value: Number(totals.paid || 0) },
    { name: 'Pending', value: Number(totals.pending || 0) },
  ];
  const canWrite = user?.role === 'admin' || user?.recoveryAccess === 'read_write';
  const selectedPaymentCandidate = candidates.find((item) => item._id === paymentCandidateId);
  const pendingCount = Number(totals.pendingCandidates || 0) + Number(totals.partiallyPaid || 0) + Number(totals.overdue || 0);
  const sendStudentReminder = async () => {
    if (!reminderChannel) return;
    try {
      setSendingReminder(true);
      const response = await apiClient.post('/bd-recovery/alerts', { type: 'students', channel: reminderChannel });
      const sent = (response.data.data || []).filter((item) => item.status === 'Sent').length;
      const failed = (response.data.data || []).length - sent;
      enqueueSnackbar(`Reminder run complete: ${sent} sent${failed ? `, ${failed} failed` : ''}. Review Alert Log for details.`, { variant: failed ? 'warning' : 'success' });
      setReminderChannel('');
      await load();
    } catch (requestError) {
      enqueueSnackbar(getApiError(requestError), { variant: 'error' });
    } finally {
      setSendingReminder(false);
    }
  };
  const recordQuickPayment = async () => {
    const amount = Number(paymentAmount);
    if (!selectedPaymentCandidate || !Number.isFinite(amount) || amount <= 0 || amount > selectedPaymentCandidate.pendingAmount) {
      enqueueSnackbar('Choose a candidate and enter an amount within their pending balance.', { variant: 'error' });
      return;
    }
    try {
      setSavingPayment(true);
      await apiClient.post(`/bd-recovery/${selectedPaymentCandidate._id}/payments`, { amount, note: paymentNote });
      enqueueSnackbar('Payment recorded successfully.', { variant: 'success' });
      setPaymentOpen(false);
      setPaymentCandidateId('');
      setPaymentAmount('');
      setPaymentNote('');
      await load();
    } catch (requestError) {
      enqueueSnackbar(getApiError(requestError), { variant: 'error' });
    } finally {
      setSavingPayment(false);
    }
  };
  const metrics = [
    { label: 'Candidates', value: candidateCount.toLocaleString('en-IN'), note: 'In recovery portfolio', icon: <AssessmentOutlined />, color: '#4161ed' },
    { label: 'Total receivable', value: money(totals.total), note: 'Total selected amount', icon: <CurrencyRupee />, color: '#8057d9' },
    { label: 'Collected', value: money(totals.paid), note: `${collectionRate}% of receivable`, icon: <TrendingUp />, color: '#08a6a2' },
    { label: 'Pending balance', value: money(totals.pending), note: 'Outstanding amount', icon: <AccountBalanceWalletOutlined />, color: '#efa51a' },
    { label: 'Overdue', value: Number(totals.overdue || 0).toLocaleString('en-IN'), note: 'Need follow-up', icon: <WarningAmber />, color: '#e95670' },
  ];

  return (
    <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ width: '100%', minWidth: 0 }}>
      <Paper sx={{
        ...panel,
        p: { xs: 2.5, md: 3.25 },
        color: '#fff',
        border: 0,
        overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(112deg,#15123d 0%,#5128c5 56%,#7546ff 100%)',
        '&::after': {
          content: '""',
          position: 'absolute',
          width: 360,
          height: 360,
          borderRadius: '50%',
          border: '48px solid rgba(255,255,255,.075)',
          right: -105,
          top: -205,
          pointerEvents: 'none',
        },
      }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.1, flexWrap: 'wrap' }}>
              <Chip size="small" label="BD RECOVERY OVERVIEW" sx={{ color: '#e3ffff', bgcolor: 'rgba(255,255,255,.15)', fontWeight: 800, letterSpacing: '.075em' }} />
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.78)' }}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}
              </Typography>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 850, letterSpacing: '-.04em', fontSize: { xs: 27, md: 36 } }}>Recovery at a glance</Typography>
            <Typography sx={{ mt: .75, color: 'rgba(255,255,255,.84)', maxWidth: 680 }}>Collections, upcoming dues and candidate follow-ups, together in one view.</Typography>
          </Box>
          <Button component={Link} to="/bd-recovery" variant="contained" endIcon={<ArrowForward />} sx={{ flexShrink: 0, width: { xs: '100%', md: 'auto' }, alignSelf: { md: 'center' }, bgcolor: '#fff', color: '#075c70', fontWeight: 750, borderRadius: 2.5, px: 2.2, py: 1.2, '&:hover': { bgcolor: '#e8fbff' } }}>Open BD Recovery</Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error" action={<Button color="inherit" onClick={load}>Retry</Button>}>{error}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', sm: 'repeat(2,minmax(0,1fr))', md: 'repeat(3,minmax(0,1fr))', xl: 'repeat(5,minmax(0,1fr))' }, gap: { xs: 1.25, md: 1.75 } }}>
        {metrics.map((metric) => (
          <Paper key={metric.label} sx={{ ...panel, p: { xs: 1.5, sm: 2 }, minHeight: 132, background: (theme) => theme.palette.mode === 'light' ? `linear-gradient(145deg,#fff 0%,${metric.color}0a 100%)` : undefined }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={700}>{metric.label}</Typography>
                <Typography sx={{ mt: 1, fontSize: { xs: 22, sm: 23, md: 22, xl: 25 }, lineHeight: 1.15, fontWeight: 850, letterSpacing: '-.04em', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{loading ? '—' : metric.value}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: .8 }}>{metric.note}</Typography>
              </Box>
              <Avatar sx={{ flexShrink: 0, width: 38, height: 38, bgcolor: `${metric.color}18`, color: metric.color, borderRadius: 2 }}>{metric.icon}</Avatar>
            </Stack>
          </Paper>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', lg: 'repeat(2,minmax(0,1fr))', xl: 'repeat(12,minmax(0,1fr))' }, gap: { xs: 1.5, md: 2 } }}>
        <Paper sx={{ ...panel, gridColumn: { lg: '1 / -1', xl: 'span 6' } }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
            <Box sx={{ minWidth: 0 }}><Typography sx={{ fontSize: { xs: 18, sm: 20 }, fontWeight: 800 }}>Monthly recovery trend</Typography><Typography variant="body2" color="text.secondary">Receivable and collected amounts by selected month</Typography></Box>
            <Avatar sx={{ bgcolor: '#f0eaff', color: '#642dff', borderRadius: 2 }}><AssessmentOutlined /></Avatar>
          </Stack>
          {loading ? <Box sx={{ height: 260, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : <Box sx={{ width: '100%', height: 260 }}><ResponsiveContainer><BarChart data={months} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="4 4" stroke={darkMode ? 'rgba(185,181,212,.18)' : '#d9e3ec'} /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#b9b5d4' : '#718096', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: darkMode ? '#b9b5d4' : '#718096', fontSize: 11 }} tickFormatter={(value) => value >= 100000 ? `₹${(value / 100000).toFixed(0)}L` : value >= 1000 ? `₹${(value / 1000).toFixed(0)}k` : `₹${value}`} /><Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 12, border: `1px solid ${darkMode ? 'rgba(185,181,212,.24)' : '#e2e8f0'}`, backgroundColor: darkMode ? '#171936' : '#fff', color: darkMode ? '#f7f5ff' : '#11132f' }} /><Bar dataKey="receivable" name="Receivable" fill="#7546ff" radius={[7,7,0,0]} maxBarSize={38} /><Bar dataKey="collected" name="Collected" fill="#4d65e8" radius={[7,7,0,0]} maxBarSize={38} /></BarChart></ResponsiveContainer></Box>}
        </Paper>

        <Paper sx={{ ...panel, gridColumn: { lg: 'span 1', xl: 'span 3' } }}>
          <Typography variant="h6" fontWeight={800}>Recovery rate</Typography><Typography variant="body2" color="text.secondary">Collected against receivable</Typography>
          {loading ? <Box sx={{ height: 235, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : <Box sx={{ height: 200, position: 'relative', mt: 1 }}><ResponsiveContainer><PieChart><Pie data={recoveryMix.filter((item) => item.value > 0)} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={3} stroke="none"><Cell fill="#7546ff" /><Cell fill={darkMode ? '#292d4d' : '#dce5ef'} /></Pie><Tooltip formatter={(value) => money(value)} contentStyle={{ borderRadius: 12, border: `1px solid ${darkMode ? 'rgba(185,181,212,.24)' : '#e2e8f0'}`, backgroundColor: darkMode ? '#171936' : '#fff', color: darkMode ? '#f7f5ff' : '#11132f' }} /></PieChart></ResponsiveContainer><Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeContent: 'center', textAlign: 'center', pointerEvents: 'none' }}><Typography variant="h4" fontWeight={850}>{collectionRate}%</Typography><Typography variant="caption" color="text.secondary">recovered</Typography></Box></Box>}
          <Stack direction="row" sx={{ justifyContent: 'space-between', mt: .5 }}><Typography variant="caption" color="text.secondary">{money(totals.paid)} collected</Typography><Typography variant="caption" color="text.secondary">{money(totals.pending)} pending</Typography></Stack>
        </Paper>

        <Paper sx={{ ...panel, gridColumn: { lg: 'span 1', xl: 'span 3' } }}>
          <Typography variant="h6" fontWeight={800}>Payment status</Typography><Typography variant="body2" color="text.secondary">Candidates by current balance</Typography>
          <Stack spacing={1.1} sx={{ mt: 2.25 }}>{statusRows.map((row) => {
            const count = Number(totals[row.key] || 0);
            const percentage = candidateCount ? Math.round((count / candidateCount) * 100) : 0;
            return <Stack key={row.key} direction="row" spacing={1} sx={{ px: 1.25, py: 1, alignItems: 'center', borderRadius: 2, bgcolor: darkMode ? `${row.color}24` : row.tint, border: '1px solid', borderColor: darkMode ? `${row.color}42` : 'transparent' }}><Box sx={{ width: 9, height: 9, flexShrink: 0, borderRadius: '50%', bgcolor: row.color }} /><Typography variant="body2" color="text.primary" sx={{ flex: 1, minWidth: 0, fontWeight: 650 }}>{row.label}</Typography><Typography variant="body2" color="text.primary" fontWeight={800}>{count}</Typography><Typography variant="caption" color="text.secondary" sx={{ minWidth: 36, textAlign: 'right' }}>{percentage}%</Typography></Stack>;
          })}</Stack>
        </Paper>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2,minmax(0,1fr))', xl: 'repeat(4,minmax(0,1fr))' }, gap: { xs: 1.5, md: 2 } }}>
        <Paper sx={panel}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.5 }}><Avatar sx={{ bgcolor: '#edf1ff', color: '#4d65e8', borderRadius: 2, width: 40, height: 40 }}><AssessmentOutlined fontSize="small" /></Avatar><Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="h6" fontWeight={800}>Technology-wise pending</Typography><Typography variant="caption" color="text.secondary">Outstanding balance ranked by skill</Typography></Box><Chip size="small" label={technologyBreakdown.length} sx={{ fontWeight: 750, bgcolor: '#edf1ff', color: '#4058d8' }} /></Stack>
          {loading ? <Box sx={{ minHeight: 225, display: 'grid', placeItems: 'center' }}><CircularProgress size={22} /></Box> : technologyBreakdown.length ? <Stack spacing={1}>{technologyBreakdown.map((item, index) => <Box key={item.technology} sx={{ p: 1.15, borderRadius: 2.2, background: (theme) => theme.palette.mode === 'light' ? `linear-gradient(100deg,${colors[index % colors.length]}12, transparent)` : theme.palette.action.hover, border: '1px solid', borderColor: 'divider' }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Avatar sx={{ width: 30, height: 30, fontSize: 12, fontWeight: 800, bgcolor: `${colors[index % colors.length]}20`, color: colors[index % colors.length] }}>{String(index + 1).padStart(2, '0')}</Avatar><Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" fontWeight={750} noWrap>{item.technology}</Typography><Typography variant="caption" color="text.secondary">{item.candidates} {item.candidates === 1 ? 'candidate' : 'candidates'} · {money(item.collected)} collected</Typography></Box><Typography variant="body2" fontWeight={850} sx={{ whiteSpace: 'nowrap' }}>{money(item.pending)}</Typography></Stack><LinearProgress variant="determinate" value={Math.max(3, Math.min(100, item.pending / maxTechnologyPending * 100))} sx={{ mt: 1, height: 5, borderRadius: 8, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 8, bgcolor: colors[index % colors.length] } }} /></Box>)}</Stack> : <Typography variant="body2" color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>Add candidates to see technology balances.</Typography>}
        </Paper>

        <Paper sx={panel}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.5 }}><Avatar sx={{ bgcolor: '#e8f8f7', color: '#078c86', borderRadius: 2, width: 40, height: 40 }}><Payments fontSize="small" /></Avatar><Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="h6" fontWeight={800}>Company-wise recovery</Typography><Typography variant="caption" color="text.secondary">Recovery progress by selected company</Typography></Box><Chip size="small" label={companyBreakdown.length} sx={{ fontWeight: 750, bgcolor: '#e8f8f7', color: '#078c86' }} /></Stack>
          {loading ? <Box sx={{ minHeight: 225, display: 'grid', placeItems: 'center' }}><CircularProgress size={22} /></Box> : companyBreakdown.length ? <Stack spacing={1}>{companyBreakdown.map((item, index) => { const ratio = item.receivable ? Math.round(item.collected / item.receivable * 100) : 0; const companyColor = colors[(index + 1) % colors.length]; return <Box key={item.company} sx={{ p: 1.15, borderRadius: 2.2, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}><Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}><Avatar variant="rounded" sx={{ width: 34, height: 34, fontSize: 12, fontWeight: 800, bgcolor: `${companyColor}18`, color: companyColor }}>{item.company.slice(0, 1).toUpperCase()}</Avatar><Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" fontWeight={750} noWrap title={item.company}>{item.company}</Typography><Typography variant="caption" color="text.secondary">{item.candidates} {item.candidates === 1 ? 'candidate' : 'candidates'} · {ratio}% recovered</Typography></Box><Box sx={{ textAlign: 'right', flexShrink: 0 }}><Typography variant="body2" fontWeight={850}>{money(item.pending)}</Typography><Typography variant="caption" color="text.secondary">pending</Typography></Box></Stack><Stack direction="row" spacing={0} sx={{ mt: 1, height: 5, borderRadius: 5, overflow: 'hidden', bgcolor: 'action.hover' }}><Box sx={{ width: `${Math.min(100, ratio)}%`, bgcolor: companyColor }} /><Box sx={{ flex: 1, bgcolor: 'action.hover' }} /></Stack></Box>; })}</Stack> : <Typography variant="body2" color="text.secondary" sx={{ py: 5, textAlign: 'center' }}>Company balances will appear when candidates are added.</Typography>}
        </Paper>

        <Paper sx={panel}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1 }}><Avatar sx={{ bgcolor: '#fff4e5', color: '#df8a13', borderRadius: 2, width: 38, height: 38 }}><EventAvailable fontSize="small" /></Avatar><Box><Typography variant="h6" fontWeight={800}>Due dates</Typography><Typography variant="caption" color="text.secondary">Overdue and upcoming balances · 30 days</Typography></Box></Stack>
          {loading ? <CircularProgress size={22} /> : upcomingDue.length ? <Stack spacing={0}>{upcomingDue.map((item, index) => <Stack key={item._id} direction="row" spacing={1} sx={{ py: 1.25, alignItems: 'center', borderBottom: index < upcomingDue.length - 1 ? 1 : 0, borderColor: 'divider' }}><Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" fontWeight={700} noWrap>{item.name} {item.surname}</Typography><Typography variant="caption" color="text.secondary">{item.company} · Due {date(item.dueDate)}</Typography></Box><Stack sx={{ alignItems: 'flex-end', flexShrink: 0 }}><Typography variant="body2" fontWeight={800} color={item.status === 'Overdue' ? 'error.main' : 'warning.dark'}>{money(item.pendingAmount)}</Typography><Chip size="small" label={item.status === 'Overdue' ? 'Overdue' : 'Due soon'} color={item.status === 'Overdue' ? 'error' : 'warning'} variant="outlined" sx={{ mt: .35, height: 21, fontSize: 10 }} /></Stack></Stack>)}</Stack> : <Stack sx={{ alignItems: 'center', justifyContent: 'center', minHeight: 120, textAlign: 'center' }}><CheckCircleOutlined color="success" /><Typography variant="body2" fontWeight={700} sx={{ mt: 1 }}>No open dues in this period</Typography><Typography variant="caption" color="text.secondary">There are no overdue balances or payments due in the next 30 days.</Typography></Stack>}
        </Paper>

        <Paper sx={panel}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1 }}><Avatar sx={{ bgcolor: '#e8f8f7', color: '#078c86', borderRadius: 2, width: 38, height: 38 }}><Payments fontSize="small" /></Avatar><Box><Typography variant="h6" fontWeight={800}>Recent payments</Typography><Typography variant="caption" color="text.secondary">Latest recorded collections</Typography></Box></Stack>
          {loading ? <CircularProgress size={22} /> : recentPayments.length ? <Stack spacing={0}>{recentPayments.slice(0, 5).map((payment, index) => <Stack key={payment._id} direction="row" spacing={1} sx={{ py: 1.25, alignItems: 'center', borderBottom: index < Math.min(recentPayments.length, 5) - 1 ? 1 : 0, borderColor: 'divider' }}><Avatar sx={{ width: 32, height: 32, bgcolor: payment.note === 'Initial advance' ? '#edf1ff' : '#e8f8f7', color: payment.note === 'Initial advance' ? '#4d65e8' : '#078c86' }}><Payments sx={{ fontSize: 17 }} /></Avatar><Box sx={{ flex: 1, minWidth: 0 }}><Typography variant="body2" fontWeight={700} noWrap>{payment.name} {payment.surname}</Typography><Typography variant="caption" color="text.secondary">{date(payment.paidAt)} · {payment.note || 'Payment recorded'}</Typography></Box><Typography variant="body2" fontWeight={800} color="success.dark" sx={{ whiteSpace: 'nowrap' }}>+{money(payment.amount)}</Typography></Stack>)}</Stack> : <Stack sx={{ alignItems: 'center', justifyContent: 'center', minHeight: 120, textAlign: 'center' }}><Payments sx={{ color: 'text.disabled' }} /><Typography variant="body2" fontWeight={700} sx={{ mt: 1 }}>No payment activity yet</Typography><Typography variant="caption" color="text.secondary">Initial advances and new collections will appear here.</Typography>{canWrite && <Button size="small" onClick={() => { setPaymentCandidateId(''); setPaymentAmount(''); setPaymentNote(''); setPaymentOpen(true); }} sx={{ mt: .5 }}>Record a payment</Button>}</Stack>}
        </Paper>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0,2fr) minmax(280px,1fr)' }, gap: { xs: 1.5, md: 2 } }}>
        <Paper sx={panel}>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}><Box><Typography variant="h6" fontWeight={800}>Recent dues</Typography><Typography variant="body2" color="text.secondary">Candidates with the highest pending balances</Typography></Box><Button component={Link} to="/bd-recovery" endIcon={<ArrowForward />} size="small">View all</Button></Stack>
          {loading ? <Box sx={{ minHeight: 200, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box> : pendingList.length ? <TableContainer sx={{ overflowX: 'auto' }}><Table size="small" sx={{ minWidth: 650, '& .MuiTableCell-root': { px: 1, py: 1.15, whiteSpace: 'nowrap' }, '& .MuiTableHead-root .MuiTableCell-root': { color: 'text.secondary', fontSize: 10, fontWeight: 800, letterSpacing: '.04em' } }}><TableHead><TableRow><TableCell>#</TableCell><TableCell>Candidate</TableCell><TableCell>Technology / company</TableCell><TableCell>Total</TableCell><TableCell>Paid</TableCell><TableCell>Pending</TableCell><TableCell>Due date</TableCell></TableRow></TableHead><TableBody>{pendingList.map((item, index) => <TableRow key={item._id} hover><TableCell>{index + 1}</TableCell><TableCell><Typography variant="body2" fontWeight={750}>{item.name} {item.surname}</Typography></TableCell><TableCell><Typography variant="body2">{item.technology}</Typography><Typography variant="caption" color="text.secondary">{item.company}</Typography></TableCell><TableCell>{money(item.totalAmount)}</TableCell><TableCell>{money(item.paidAmount)}</TableCell><TableCell sx={{ color: 'error.main', fontWeight: 800 }}>{money(item.pendingAmount)}</TableCell><TableCell><Chip size="small" label={date(item.dueDate)} color={item.status === 'Overdue' ? 'error' : 'warning'} variant="outlined" /></TableCell></TableRow>)}</TableBody></Table></TableContainer> : <Stack sx={{ minHeight: 180, alignItems: 'center', justifyContent: 'center' }}><CheckCircleOutlined color="success" /><Typography variant="body2" fontWeight={700} sx={{ mt: 1 }}>No outstanding balances</Typography></Stack>}
        </Paper>

        <Paper sx={panel}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 1.5 }}><Avatar sx={{ bgcolor: '#edf1ff', color: '#4d65e8', borderRadius: 2, width: 40, height: 40 }}><NotificationsNoneRounded fontSize="small" /></Avatar><Box sx={{ flex: 1 }}><Typography variant="h6" fontWeight={800}>Quick actions</Typography><Typography variant="caption" color="text.secondary">Send branded reminders or update a candidate</Typography></Box><BrandLogo size={38} mode="light" sx={{ p: .25, borderRadius: 1.5, bgcolor: '#f1f5ff' }} /></Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 1 }}>
            {user?.role === 'admin' && <Button onClick={() => setReminderChannel('whatsapp')} startIcon={<WhatsApp />} disabled={pendingCount === 0} sx={{ minHeight: 78, flexDirection: 'column', gap: .35, borderRadius: 2.5, color: '#12805c', bgcolor: '#e8f8f0', '&:hover': { bgcolor: '#d7f2e5' }, '& .MuiButton-startIcon': { mr: 0 } }}><Typography variant="body2" fontWeight={800}>Send WhatsApp</Typography><Typography variant="caption" sx={{ color: 'text.secondary' }}>Pending students</Typography></Button>}
            {user?.role === 'admin' && <Button onClick={() => setReminderChannel('email')} startIcon={<EmailOutlined />} disabled={pendingCount === 0} sx={{ minHeight: 78, flexDirection: 'column', gap: .35, borderRadius: 2.5, color: '#2458d7', bgcolor: '#eaf1ff', '&:hover': { bgcolor: '#dce8ff' }, '& .MuiButton-startIcon': { mr: 0 } }}><Typography variant="body2" fontWeight={800}>Send email</Typography><Typography variant="caption" sx={{ color: 'text.secondary' }}>With SmartApply branding</Typography></Button>}
            {canWrite && <Button component={Link} to="/bd-recovery?action=add" startIcon={<PersonAddAlt1 />} sx={{ minHeight: 78, flexDirection: 'column', gap: .35, borderRadius: 2.5, color: '#7040c7', bgcolor: '#f2eaff', '&:hover': { bgcolor: '#e9dcff' }, '& .MuiButton-startIcon': { mr: 0 } }}><Typography variant="body2" fontWeight={800}>Add candidate</Typography><Typography variant="caption" sx={{ color: 'text.secondary' }}>Create recovery record</Typography></Button>}
            {canWrite && <Button onClick={() => { setPaymentCandidateId(''); setPaymentAmount(''); setPaymentNote(''); setPaymentOpen(true); }} startIcon={<Payments />} disabled={!candidates.some((item) => item.pendingAmount > 0)} sx={{ minHeight: 78, flexDirection: 'column', gap: .35, borderRadius: 2.5, color: '#a65a00', bgcolor: '#fff3df', '&:hover': { bgcolor: '#ffe9c5' }, '& .MuiButton-startIcon': { mr: 0 } }}><Typography variant="body2" fontWeight={800}>Record payment</Typography><Typography variant="caption" sx={{ color: 'text.secondary' }}>Update payment history</Typography></Button>}
            {user?.role !== 'admin' && <Button component={Link} to="/bd-recovery?section=alerts" startIcon={<NotificationsNoneRounded />} sx={{ minHeight: 78, flexDirection: 'column', gap: .35, borderRadius: 2.5, color: '#2458d7', bgcolor: '#eaf1ff', '& .MuiButton-startIcon': { mr: 0 } }}><Typography variant="body2" fontWeight={800}>Alert history</Typography><Typography variant="caption" sx={{ color: 'text.secondary' }}>Review delivery status</Typography></Button>}
          </Box>
          {user?.role === 'admin' && <Button component={Link} to="/bd-recovery?section=settings" startIcon={<SettingsOutlined />} fullWidth sx={{ mt: 1, justifyContent: 'flex-start', borderRadius: 2, color: 'text.secondary' }}>Reminder settings</Button>}
          {recentPayments.length > 0 && <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}><Typography variant="caption" color="text.secondary">Latest collection</Typography><Stack direction="row" sx={{ justifyContent: 'space-between', mt: .5 }}><Typography variant="body2" fontWeight={700} noWrap>{recentPayments[0].name} {recentPayments[0].surname}</Typography><Typography variant="body2" fontWeight={800} color="success.dark">+{money(recentPayments[0].amount)}</Typography></Stack></Box>}
        </Paper>
      </Box>
      <Dialog open={Boolean(reminderChannel)} onClose={() => !sendingReminder && setReminderChannel('')} fullWidth maxWidth="xs">
        <DialogTitle><Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}><BrandLogo size={42} mode="light" /><Box><Typography fontWeight={800}>Send {reminderChannel === 'whatsapp' ? 'WhatsApp' : 'email'} reminders</Typography><Typography variant="caption" color="text.secondary">SmartApply BD Recovery</Typography></Box></Stack></DialogTitle>
        <DialogContent><Typography variant="body2" color="text.secondary">This sends the branded payment reminder to pending candidates who have the selected contact channel. Candidates with no pending balance are excluded. Delivery results will appear in Alert Log.</Typography><Chip sx={{ mt: 2 }} color="primary" variant="outlined" label={`${pendingCount} candidates with outstanding balances`} /></DialogContent>
        <DialogActions><Button onClick={() => setReminderChannel('')} disabled={sendingReminder}>Cancel</Button><Button variant="contained" onClick={sendStudentReminder} disabled={sendingReminder}>{sendingReminder ? 'Sending…' : 'Send reminders'}</Button></DialogActions>
      </Dialog>
      <Dialog open={paymentOpen} onClose={() => !savingPayment && setPaymentOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Record a candidate payment</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}><TextField select label="Candidate" value={paymentCandidateId} onChange={(event) => { setPaymentCandidateId(event.target.value); setPaymentAmount(''); }} fullWidth required><MenuItem value="">Choose candidate</MenuItem>{candidates.filter((item) => item.pendingAmount > 0).map((item) => <MenuItem key={item._id} value={item._id}>{item.name} {item.surname} · {money(item.pendingAmount)} pending</MenuItem>)}</TextField>{selectedPaymentCandidate && <Alert severity="info">Remaining balance: {money(selectedPaymentCandidate.pendingAmount)}</Alert>}<TextField label="Amount received" type="number" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} inputProps={{ min: 0.01, max: selectedPaymentCandidate?.pendingAmount, step: 'any' }} required /><TextField label="Payment note (optional)" value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} /></Stack></DialogContent>
        <DialogActions><Button onClick={() => setPaymentOpen(false)} disabled={savingPayment}>Cancel</Button><Button variant="contained" onClick={recordQuickPayment} disabled={savingPayment || !selectedPaymentCandidate}>{savingPayment ? 'Saving…' : 'Save payment'}</Button></DialogActions>
      </Dialog>
    </Stack>
  );
}
