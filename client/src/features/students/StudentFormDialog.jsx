import { yupResolver } from '@hookform/resolvers/yup';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { PasswordField } from '../../components/PasswordField.jsx';

const requestedTechnologies = [
  'SQL Support / Developer',
  'AWS / DeveOps',
  'Testing',
  'PowerBI - Tableau / Data Analytics',
  'Data Science',
  'Python Developer',
  'AR-Caller',
  'Medical Coding / Medical Billing',
  'DV-360',
  'OSI Soft PI',
  'Full Stack Developer',
  'AI Engineer',
  'Java Developer',
  'Dotnet Developer',
];

const schema = yup.object({
  candidateName: yup.string().min(2).required(),
  mobileNumber: yup
    .string()
    .matches(/^\+?[1-9]\d{7,14}$/, 'Enter a valid phone number')
    .required(),
  personalEmail: yup.string().email().required(),
  technology: yup.string().required('Technology is required'),
  customTechnology: yup.string().when('technology', {
    is: '__other__',
    then: (field) =>
      field.trim().min(2, 'Enter at least 2 characters').required('Technology name is required'),
    otherwise: (field) => field.optional(),
  }),
  naukriEmail: yup.string().email().required(),
  naukriPassword: yup.string().when('$editing', {
    is: false,
    then: (field) => field.min(6).required('Naukri password is required'),
    otherwise: (field) => field.transform((value) => value || undefined).optional(),
  }),
  membershipType: yup.string().oneOf(['paid', 'free']).required(),
  membershipPaidMonth: yup.string().when('membershipType', {
    is: 'paid',
    then: (field) => field.required('Paid month is required'),
    otherwise: (field) => field.optional(),
  }),
  currentTotalApplicationCount: yup.number().integer().min(0),
  status: yup.string().oneOf(['active', 'inactive', 'placed']).required(),
});
const empty = {
  candidateName: '',
  mobileNumber: '',
  personalEmail: '',
  technology: '',
  customTechnology: '',
  naukriEmail: '',
  naukriPassword: '',
  membershipType: 'free',
  membershipPaidMonth: '',
  currentTotalApplicationCount: 0,
  status: 'active',
};

export function StudentFormDialog({ open, student, technologies, onClose, onSubmit }) {
  const editing = Boolean(student);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema, { context: { editing } }),
    context: { editing },
    defaultValues: empty,
  });
  const selectedTechnology = watch('technology');
  const membershipType = watch('membershipType');
  const technologyOptions = requestedTechnologies.map((name) => {
    const existing = technologies.find((item) => item.name.toLowerCase() === name.toLowerCase());
    return { name, value: existing?._id || `__new__:${name}` };
  });
  const additionalTechnologies = technologies.filter(
    (item) => !requestedTechnologies.some((name) => name.toLowerCase() === item.name.toLowerCase()),
  );
  useEffect(() => {
    reset(
      student
        ? {
            ...student,
            technology: student.technology?._id || student.technology,
            customTechnology: '',
            naukriPassword: '',
          }
        : empty,
    );
  }, [student, reset, open]);
  const submit = async (values) => {
    const payload = { ...values };
    if (payload.membershipType !== 'paid') delete payload.membershipPaidMonth;
    if (editing) {
      if (!payload.naukriPassword) delete payload.naukriPassword;
    }
    await onSubmit(payload);
  };
  const field = (name, label, props = {}) => (
    <TextField
      key={name}
      label={label}
      {...register(name)}
      error={Boolean(errors[name])}
      helperText={errors[name]?.message}
      {...props}
    />
  );
  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{editing ? 'Edit student' : 'Add student'}</DialogTitle>
      <DialogContent
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,minmax(0,1fr))' },
          gap: 2,
          pt: '16px !important',
        }}
      >
        {field('candidateName', 'Candidate name')}
        {field('mobileNumber', 'Mobile number')}
        {field('personalEmail', 'Personal email')}
        <TextField
          select
          label="Technology"
          defaultValue=""
          {...register('technology')}
          error={Boolean(errors.technology)}
          helperText={errors.technology?.message}
        >
          {technologyOptions.map((item) => (
            <MenuItem key={item.name} value={item.value}>
              {item.name}
            </MenuItem>
          ))}
          {additionalTechnologies.map((item) => (
            <MenuItem key={item._id} value={item._id}>
              {item.name}
            </MenuItem>
          ))}
          <MenuItem value="__other__">Other</MenuItem>
        </TextField>
        {selectedTechnology === '__other__' &&
          field('customTechnology', 'Enter technology', {
            placeholder: 'For example: React Native Developer',
            autoFocus: true,
          })}
        {field('naukriEmail', 'Naukri email')}
        <PasswordField
          label={editing ? 'New Naukri password (optional)' : 'Naukri password'}
          {...register('naukriPassword')}
          error={Boolean(errors.naukriPassword)}
          helperText={errors.naukriPassword?.message}
        />
        <TextField select label="Membership" defaultValue="free" {...register('membershipType')}>
          <MenuItem value="free">Free</MenuItem>
          <MenuItem value="paid">Paid</MenuItem>
        </TextField>
        {membershipType === 'paid' &&
          field('membershipPaidMonth', 'Paid month', {
            type: 'month',
            slotProps: { inputLabel: { shrink: true } },
          })}
        <TextField select label="Status" defaultValue="active" {...register('status')}>
          <MenuItem value="active">Active</MenuItem>
          <MenuItem value="inactive">Inactive</MenuItem>
          <MenuItem value="placed">Placed</MenuItem>
        </TextField>
        {field('currentTotalApplicationCount', 'Current total applications', {
          type: 'number',
          slotProps: { htmlInput: { min: 0, step: 1 } },
        })}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit(submit)} disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Save student'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
