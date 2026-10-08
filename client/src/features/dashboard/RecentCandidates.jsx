import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DownloadRounded, MoreHorizRounded, OpenInNewRounded } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { apiClient, getApiError } from '../../services/apiClient.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { SearchField } from '../../components/SearchField.jsx';
import { StudentDetailsDialog } from '../students/StudentDetailsDialog.jsx';
import { Panel, EmptyState, StatusBadge } from './DashboardPrimitives.jsx';
import { csv, downloadFile, formatDate, formatNumber } from './dashboardUtils.js';
export function RecentCandidates({ filters, refreshKey }) {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menu, setMenu] = useState(null);
  const [selected, setSelected] = useState(null);
  const requestId = useRef(0);
  const previousQuery = useRef('');
  const query = useDebouncedValue(search);
  const { staff, technology, membershipType, status } = filters;
  useEffect(() => {
    setPage(0);
  }, [query, sort, staff, technology, membershipType, status]);
  useEffect(() => {
    const id = ++requestId.current;
    setError('');
    const params = Object.fromEntries(
      Object.entries({
        page: page + 1,
        limit: 5,
        sort,
        search: query,
        staff,
        technology,
        membershipType,
        status,
      }).filter(([, value]) => value !== ''),
    );
    const signature = JSON.stringify(params);
    if (previousQuery.current !== signature) setLoading(true);
    previousQuery.current = signature;
    apiClient
      .get('/students', {
        params,
      })
      .then((response) => {
        if (id === requestId.current) {
          setRows(response.data.data);
          setTotal(response.data.meta?.pagination?.total || 0);
        }
      })
      .catch((err) => {
        if (id === requestId.current) setError(getApiError(err));
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
    return () => {
      requestId.current += 1;
    };
  }, [page, query, sort, staff, technology, membershipType, status, refreshKey]);
  const viewDetails = async (row) => {
    setMenu(null);
    try {
      const response = await apiClient.get(`/students/${row._id}`);
      setSelected(response.data.data);
    } catch (err) {
      enqueueSnackbar(getApiError(err), {
        variant: 'error',
      });
    }
  };
  const exportRows = () =>
    downloadFile(
      'smartapply-candidates-current-page.csv',
      csv([
        [
          'Name',
          'Email',
          'Phone',
          'Technology',
          'Membership',
          'Status',
          'Assigned staff',
          'Applications',
          'Registered',
        ],
        ...rows.map((row) => [
          row.candidateName,
          row.personalEmail,
          row.mobileNumber,
          row.technology?.name,
          row.membershipType,
          row.status,
          row.createdBy?.name,
          row.currentTotalApplicationCount,
          row.createdAt || '',
        ]),
      ]),
    );
  return (
    <Panel
      title="Recent candidates"
      description="Your candidate directory, at a glance"
      action={
        <Button component={Link} to="/students" size="small" endIcon={<OpenInNewRounded />}>
          View all
        </Button>
      }
      className="ats-candidates-panel"
    >
      <Stack
        className="ats-table-tools"
        direction={{
          xs: 'column',
          sm: 'row',
        }}
        sx={{
          gap: 1.5,
        }}
      >
        <SearchField
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
          label="Search recent candidates"
          sx={{
            flex: 1,
          }}
        />
        <TextField
          select
          label="Sort candidates"
          size="small"
          value={sort}
          onChange={(event) => {
            setSort(event.target.value);
            setPage(0);
          }}
          sx={{
            width: {
              xs: '100%',
              sm: 190,
            },
          }}
        >
          <MenuItem value="newest">Newest first</MenuItem>
          <MenuItem value="oldest">Oldest first</MenuItem>
          <MenuItem value="name_asc">Name A–Z</MenuItem>
          <MenuItem value="applications_high">Most applications</MenuItem>
        </TextField>
        <Tooltip title="Export current page as CSV">
          <span>
            <IconButton
              aria-label="Export candidates CSV"
              disabled={loading || !rows.length}
              onClick={exportRows}
            >
              <DownloadRounded />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      <TableContainer>
        <Table size="small" aria-label="Recent candidates">
          <TableHead>
            <TableRow>
              {[
                'Candidate',
                'Technology',
                'Membership',
                'Status',
                'Assigned staff',
                'Applications',
                'Registered',
                'Actions',
              ].map((label) => (
                <TableCell key={label}>{label}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading
              ? Array.from(
                  {
                    length: 3,
                  },
                  (_, i) => (
                    <TableRow key={i}>
                      {Array.from(
                        {
                          length: 8,
                        },
                        (_, j) => (
                          <TableCell key={j}>
                            <Skeleton height={38} />
                          </TableCell>
                        ),
                      )}
                    </TableRow>
                  ),
                )
              : rows.map((row) => (
                  <TableRow key={row._id} hover>
                    <TableCell>
                      <Stack
                        direction="row"
                        sx={{
                          gap: 1.2,
                          alignItems: 'center',
                        }}
                      >
                        <Avatar className="ats-person-avatar">{row.candidateName?.[0]}</Avatar>
                        <Box>
                          <Button
                            onClick={() => viewDetails(row)}
                            sx={{
                              p: 0,
                              justifyContent: 'flex-start',
                              minHeight: 24,
                              fontWeight: 700,
                              color: 'text.primary',
                            }}
                          >
                            {row.candidateName}
                          </Button>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: 'block',
                            }}
                          >
                            {row.personalEmail}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {row.mobileNumber}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>{row.technology?.name || '—'}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.membershipType} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell>{row.createdBy?.name || '—'}</TableCell>
                    <TableCell>
                      <strong>{formatNumber(row.currentTotalApplicationCount)}</strong>
                    </TableCell>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <TableCell>
                      <IconButton
                        aria-label={`Actions for ${row.candidateName}`}
                        onClick={(event) =>
                          setMenu({
                            anchor: event.currentTarget,
                            row,
                          })
                        }
                      >
                        <MoreHorizRounded />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </TableContainer>
      {!loading && !error && !rows.length && (
        <EmptyState
          title="No candidates found"
          description={
            query
              ? 'Try a different search or reset your filters.'
              : 'Add your first candidate to start tracking applications.'
          }
          action="Add candidate"
          to="/students?action=add"
        />
      )}
      <TablePagination
        component="div"
        count={total}
        page={page}
        rowsPerPage={5}
        rowsPerPageOptions={[5]}
        onPageChange={(_, next) => setPage(next)}
      />
      <Menu anchorEl={menu?.anchor} open={Boolean(menu)} onClose={() => setMenu(null)}>
        <MenuItem onClick={() => viewDetails(menu.row)}>View candidate details</MenuItem>
        <MenuItem
          component={Link}
          to={`/history?student=${menu?.row?._id || ''}`}
          onClick={() => setMenu(null)}
        >
          Application history
        </MenuItem>
      </Menu>
      <StudentDetailsDialog
        student={selected}
        onClose={() => setSelected(null)}
        onEdit={(student) => navigate(`/students?view=list&edit=${student._id}`)}
      />
    </Panel>
  );
}
