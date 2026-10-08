import { Link } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  Chip,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import {
  ArrowForwardRounded,
  AutoAwesomeRounded,
  TrendingDownRounded,
  TrendingUpRounded,
} from '@mui/icons-material';
import { motion, useReducedMotion } from 'framer-motion';
import { formatNumber } from './dashboardUtils.js';
export function AnimatedSection({ children, className, delay = 0 }) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      className={className}
      initial={
        reduced
          ? false
          : {
              opacity: 0,
              y: 12,
            }
      }
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.35,
        delay,
      }}
    >
      {children}
    </motion.section>
  );
}
export function Panel({ title, description, action, children, className = '', loading = false }) {
  return (
    <Paper component="section" className={`ats-panel ${className}`}>
      <Stack
        className="ats-panel-heading"
        direction="row"
        sx={{
          gap: 2,
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <Box
          sx={{
            minWidth: 0,
          }}
        >
          <Typography component="h2" variant="h6">
            {title}
          </Typography>
          {description && (
            <Typography variant="caption" color="text.secondary">
              {description}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>
      {loading ? <Skeleton variant="rounded" height={240} /> : children}
    </Paper>
  );
}
export function EmptyState({ title, description, action, to, icon }) {
  return (
    <Box className="ats-empty">
      <Box className="ats-empty-art">
        <span />
        <Avatar>{icon || <AutoAwesomeRounded />}</Avatar>
        <span />
      </Box>
      <Typography
        sx={{
          fontWeight: 750,
        }}
      >
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
      {action && (
        <Button
          component={Link}
          to={to}
          size="small"
          endIcon={<ArrowForwardRounded />}
          sx={{
            mt: 1,
          }}
        >
          {action}
        </Button>
      )}
    </Box>
  );
}
export function Sparkline({ values, color = '#3978f6', label }) {
  if (!values?.length) return null;
  const max = Math.max(...values, 1),
    min = Math.min(...values, 0);
  const points = values
    .map(
      (value, i) =>
        `${values.length > 1 ? (i / (values.length - 1)) * 88 : 44},${31 - ((value - min) / (max - min || 1)) * 26}`,
    )
    .join(' ');
  return (
    <svg width="90" height="36" viewBox="0 0 90 36" role="img" aria-label={label}>
      <title>{label}</title>
      <polygon points={`0,36 ${points} 88,36`} fill={color} opacity=".07" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function MetricCard({
  label,
  value,
  description,
  icon,
  to,
  onClick,
  color,
  trend,
  trendDescription,
  sparkline,
  sparklineLabel,
  loading,
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      whileHover={
        reduced
          ? undefined
          : {
              y: -3,
            }
      }
      transition={{
        duration: 0.18,
      }}
    >
      <Paper className="ats-metric">
        <ButtonBase
          component={onClick ? 'button' : Link}
          to={onClick ? undefined : to}
          onClick={onClick}
          className="ats-metric-button"
          aria-label={`${label}: ${loading ? 'Loading' : formatNumber(value)}. ${description}`}
        >
          <Stack
            direction="row"
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
            }}
          >
            <Avatar
              className="ats-gradient-icon"
              style={{
                '--icon-color': color,
              }}
            >
              {icon}
            </Avatar>
            <ArrowForwardRounded className="ats-card-arrow" />
          </Stack>
          <Typography className="ats-metric-label">{label}</Typography>
          {loading ? (
            <Skeleton width="65%" height={45} />
          ) : (
            <Typography className="ats-metric-value">
              {value == null ? '—' : formatNumber(value)}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
          <Stack
            className="ats-metric-footer"
            direction="row"
            sx={{
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box>
              {trend ? (
                <Chip
                  size="small"
                  icon={trend.positive ? <TrendingUpRounded /> : <TrendingDownRounded />}
                  label={trend.label}
                  className={trend.positive ? 'ats-trend-positive' : 'ats-trend-negative'}
                />
              ) : (
                <Typography variant="caption" color="text.secondary">
                  {trendDescription}
                </Typography>
              )}
              {trend && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    mt: 0.5,
                  }}
                >
                  {trendDescription}
                </Typography>
              )}
            </Box>
            <Sparkline
              values={sparkline}
              color={color}
              label={sparklineLabel || `${label} activity in the selected period`}
            />
          </Stack>
        </ButtonBase>
      </Paper>
    </motion.div>
  );
}
export function StatusBadge({ status }) {
  return (
    <Chip size="small" className={`ats-status ats-status-${status}`} label={status || 'Unknown'} />
  );
}
