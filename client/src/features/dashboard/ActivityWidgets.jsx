import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Drawer,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBackIosNewRounded,
  ArrowForwardIosRounded,
  CheckRounded,
  CloseRounded,
  NotificationsNoneRounded,
  TrendingUpRounded,
} from '@mui/icons-material';
import { EmptyState, Panel } from './DashboardPrimitives.jsx';
import { businessToday, formatDate, formatNumber, percent } from './dashboardUtils.js';
export function ActivityTimeline({ rows, compact = false, seen = [], onRead }) {
  if (!rows.length)
    return (
      <EmptyState
        title="No activity yet"
        description="Recorded application updates will appear here."
        action={compact ? undefined : 'Open daily tracker'}
        to="/students?view=matrix"
      />
    );
  return (
    <Stack className="ats-timeline">
      {rows.slice(0, compact ? 20 : 5).map((item) => (
        <Box
          className={`ats-timeline-item ${seen.includes(item._id) ? 'ats-read' : ''}`}
          key={item._id}
        >
          <Avatar className="ats-timeline-avatar">
            <TrendingUpRounded fontSize="small" />
          </Avatar>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
            }}
          >
            <Typography variant="body2">
              <strong>{item.student?.candidateName || 'Candidate'}</strong>{' '}
              <span className="ats-muted">application total updated</span>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {item.recordedBy?.name || item.source || 'Workspace'} ·{' '}
              {formatDate(item.updatedAt || item.createdAt || item.applicationDate)}
              {(item.updatedAt || item.createdAt) &&
                `, ${new Date(item.updatedAt || item.createdAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'Asia/Kolkata',
                })}`}
            </Typography>
            <Chip
              className="ats-activity-chip"
              size="small"
              label={`+${formatNumber(item.dailyCount)} applications`}
            />
          </Box>
          {onRead && !seen.includes(item._id) && (
            <Tooltip title="Mark as read">
              <IconButton
                size="small"
                aria-label={`Mark ${item.student?.candidateName || 'candidate'} update as read`}
                onClick={() => onRead(item._id)}
              >
                <CheckRounded fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ))}
    </Stack>
  );
}
export function ActivityInbox({ open, onClose, rows, userId }) {
  const key = `smartapply-activity-read-${userId}`;
  const readStored = () => {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
      return [];
    }
  };
  const [seen, setSeen] = useState(readStored);
  const [cleared, setCleared] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`${key}-cleared`) || '[]');
    } catch {
      return [];
    }
  });
  const visible = rows.filter((row) => !cleared.includes(row._id));
  const mark = (ids) => {
    const next = [...new Set([...seen, ...ids])].slice(-500);
    setSeen(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          className: 'ats-dashboard ats-inbox',
          sx: {
            width: 400,
            maxWidth: '100vw',
            p: 3,
            borderRadius: 0,
            bgcolor: 'background.paper',
          },
        },
      }}
    >
      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="h6">Activity inbox</Typography>
        <IconButton aria-label="Close activity inbox" onClick={onClose}>
          <CloseRounded />
        </IconButton>
      </Stack>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          mt: 1,
        }}
      >
        Latest application updates in this reporting period.
      </Typography>
      <Stack
        direction="row"
        sx={{
          gap: 1,
          my: 2,
        }}
      >
        <Chip
          size="small"
          label={`${visible.filter((row) => !seen.includes(row._id)).length} unread`}
          color="primary"
        />
        <Button
          size="small"
          disabled={!visible.length}
          onClick={() => mark(visible.map((row) => row._id))}
        >
          Mark all as read
        </Button>
        <Button
          size="small"
          disabled={!visible.length}
          onClick={() => {
            const next = [...new Set([...cleared, ...visible.map((row) => row._id)])].slice(-500);
            setCleared(next);
            localStorage.setItem(`${key}-cleared`, JSON.stringify(next));
          }}
        >
          Clear all
        </Button>
      </Stack>
      {visible.length ? (
        <ActivityTimeline rows={visible} compact seen={seen} onRead={(id) => mark([id])} />
      ) : (
        <EmptyState
          icon={<NotificationsNoneRounded />}
          title="You're all caught up"
          description="New application updates will appear here. Cleared updates remain in application history."
        />
      )}
    </Drawer>
  );
}
export function ActivityCalendar({ rows, onSelect }) {
  const [month, setMonth] = useState(() => businessToday().slice(0, 7));
  const first = new Date(`${month}-01T00:00:00Z`);
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const offset = (first.getUTCDay() + 6) % 7;
  const counts = useMemo(
    () => new Map(rows.map((row) => [row.date.slice(0, 10), row.applications])),
    [rows],
  );
  const changeMonth = (amount) => {
    const date = new Date(first);
    date.setUTCMonth(date.getUTCMonth() + amount);
    setMonth(date.toISOString().slice(0, 7));
  };
  return (
    <Panel title="Activity calendar" description="Recorded applications · select a day">
      <Stack
        direction="row"
        sx={{
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{
            fontWeight: 750,
          }}
        >
          {first.toLocaleDateString('en-IN', {
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC',
          })}
        </Typography>
        <Box>
          <IconButton size="small" aria-label="Previous month" onClick={() => changeMonth(-1)}>
            <ArrowBackIosNewRounded
              sx={{
                fontSize: 14,
              }}
            />
          </IconButton>
          <IconButton size="small" aria-label="Next month" onClick={() => changeMonth(1)}>
            <ArrowForwardIosRounded
              sx={{
                fontSize: 14,
              }}
            />
          </IconButton>
        </Box>
      </Stack>
      <Box className="ats-calendar">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
          <span className="ats-calendar-weekday" key={i}>
            {day}
          </span>
        ))}
        {Array.from(
          {
            length: offset,
          },
          (_, i) => (
            <span key={`space-${i}`} />
          ),
        )}
        {Array.from(
          {
            length: days,
          },
          (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, '0')}`;
            const count = counts.get(date);
            return (
              <Tooltip
                key={date}
                title={
                  count == null ? 'Select to load this day' : `${formatNumber(count)} applications`
                }
              >
                <button
                  type="button"
                  className={`${date === businessToday() ? 'ats-calendar-today' : ''} ${count ? 'ats-calendar-active' : ''}`}
                  aria-label={`${formatDate(date)}, ${count == null ? 'load activity' : `${count} applications`}`}
                  onClick={() => onSelect(date)}
                >
                  {i + 1}
                  {!!count && <i />}
                </button>
              </Tooltip>
            );
          },
        )}
      </Box>
      <Stack
        direction="row"
        sx={{
          gap: 1,
          alignItems: 'center',
          mt: 2,
        }}
      >
        <span className="ats-dot" />
        <Typography variant="caption" color="text.secondary">
          Application activity in the loaded period
        </Typography>
      </Stack>
    </Panel>
  );
}
export function RecruiterPerformance({ rows, onSelect }) {
  const max = Math.max(...rows.map((row) => row.applications || 0), 1);
  return (
    <Panel
      title="Top recruiters"
      description="Ranked by applications recorded in this period"
      action={<Chip size="small" label="Staff performance" variant="outlined" />}
    >
      {!rows.length ? (
        <EmptyState
          title="No recruiter activity"
          description="Staff performance appears as application updates are recorded."
          action="Manage staff"
          to="/users"
        />
      ) : (
        <Stack
          sx={{
            gap: 2.5,
          }}
        >
          {rows.slice(0, 5).map((row, index) => (
            <Box key={row.staffId}>
              <Stack
                direction="row"
                sx={{
                  gap: 1.5,
                  alignItems: 'center',
                }}
              >
                <Avatar className="ats-person-avatar">{row.name?.[0]}</Avatar>
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <Button
                    onClick={() => onSelect(row.staffId)}
                    sx={{
                      p: 0,
                      minHeight: 24,
                      color: 'text.primary',
                      fontWeight: 750,
                    }}
                  >
                    {row.name}
                  </Button>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                    }}
                  >
                    {formatNumber(row.totalStudents)} candidates ·{' '}
                    {row.placedStudents == null
                      ? 'Placement data unavailable'
                      : `${formatNumber(row.placedStudents)} placed`}
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={`#${index + 1}`}
                  className={index === 0 ? 'ats-trend-positive' : ''}
                />
              </Stack>
              <Stack
                direction="row"
                sx={{
                  justifyContent: 'space-between',
                  mt: 1.5,
                  mb: 0.6,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Period applications
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 750,
                  }}
                >
                  {formatNumber(row.applications)}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={percent(row.applications, max)}
                aria-label={`${row.name} application activity relative to top recruiter`}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Panel>
  );
}
export function RecentActivityPanel({ rows }) {
  return (
    <Panel
      title="Recent activity"
      description="The latest updates from your workspace"
      action={
        <Button component={Link} to="/history" size="small">
          View all
        </Button>
      }
    >
      <ActivityTimeline rows={rows} />
    </Panel>
  );
}
