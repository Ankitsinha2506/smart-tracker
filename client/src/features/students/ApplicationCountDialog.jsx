import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

export function ApplicationCountDialog({ open, student, onClose, onSubmit }) {
  const minimum = student?.currentTotalApplicationCount || 0;
  const dayBaseline = student?.previousDayApplicationCount ?? minimum;
  const schema = yup.object({
    currentTotalApplicationCount: yup
      .number()
      .integer()
      .min(minimum, `Total cannot be below ${minimum}`)
      .required(),
    note: yup.string().max(500),
  });
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: yupResolver(schema) });
  useEffect(() => {
    reset({ currentTotalApplicationCount: minimum, note: '' });
  }, [minimum, reset, open]);
  const current = watch('currentTotalApplicationCount');
  const difference = Math.max(0, Number(current || 0) - dayBaseline);
  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="sm"
      aria-labelledby="application-count-title"
      slotProps={{ paper: { sx: {
        maxWidth: 480,
        m: { xs: 2, sm: 4 },
        width: { xs: 'calc(100% - 32px)', sm: '100%' },
        borderRadius: 3,
        '& .MuiInputLabel-root': { position: 'static', transform: 'none', mb: 0.75, fontSize: 12 },
        '& .MuiInputBase-root': { mt: 0, borderRadius: 1.5 },
        '& .MuiInputBase-input': { fontSize: 14 },
      } } }}
    >
      <DialogTitle id="application-count-title" sx={{ px: 3, pt: 2.5, pb: 1.5, fontSize: 19 }}>Update application total</DialogTitle>
      <DialogContent sx={{ px: 3, pb: 2.5 }}>
        <Stack sx={{ gap: 2, pt: 0.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
            Enter the total displayed on Naukri for {student?.candidateName}. Today’s count is
            calculated automatically.
          </Typography>
          <Alert severity="info" sx={{ borderRadius: 1.5, py: 0.5, alignItems: 'center', '& .MuiAlert-message': { fontSize: 12, lineHeight: 1.7 } }}>
            Previous recorded total: <strong>{minimum}</strong> · New applications:{' '}
            <strong>{difference}</strong>
          </Alert>
          <TextField
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            type="number"
            label="Current total applications"
            autoFocus
            {...register('currentTotalApplicationCount')}
            error={Boolean(errors.currentTotalApplicationCount)}
            helperText={errors.currentTotalApplicationCount?.message}
          />
          <TextField
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            label="Note (optional)"
            multiline
            rows={2}
            {...register('note')}
            error={Boolean(errors.note)}
            helperText={errors.note?.message}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1, borderTop: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
        <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
          {isSubmitting ? 'Updating…' : 'Update total'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
