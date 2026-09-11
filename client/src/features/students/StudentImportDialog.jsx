import { Download, UploadFile } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  List,
  ListItem,
  Stack,
  Typography,
} from '@mui/material';
import { useRef, useState } from 'react';
import { apiClient, getApiError } from '../../services/apiClient.js';

const loadXlsx = () =>
  import('xlsx-populate/browser/xlsx-populate').then((module) => module.default);

const columns = [
  ['Candidate Name', 'candidateName'],
  ['Mobile Number', 'mobileNumber'],
  ['Personal Email', 'personalEmail'],
  ['Technology', 'technology'],
  ['Naukri Email', 'naukriEmail'],
  ['Naukri Password', 'naukriPassword'],
  ['Membership', 'membershipType'],
  ['Paid Month', 'membershipPaidMonth'],
  ['Current Total Applications', 'currentTotalApplicationCount'],
  ['Status', 'status'],
];
const normalize = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

export function StudentImportDialog({ open, technologies, onClose, onImported }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const downloadTemplate = async () => {
    const XlsxPopulate = await loadXlsx();
    const workbook = await XlsxPopulate.fromBlankAsync();
    const sheet = workbook.sheet(0).name('Students');
    sheet.row(1).style({ bold: true, fill: 'DDE7FF' });
    columns.forEach(([header], index) => sheet.cell(1, index + 1).value(header));
    sheet
      .range('A2:J2')
      .value([
        [
          'Example Student',
          '919876543210',
          'student@example.com',
          technologies[0]?.name || 'Java Developer',
          'student@naukri.com',
          'password123',
          'paid',
          '2026-08',
          0,
          'active',
        ],
      ]);
    sheet.column('A').width(22);
    sheet.column('C').width(28);
    sheet.column('D').width(28);
    sheet.column('E').width(28);
    const blob = await workbook.outputAsync();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'student-import-template.xlsx';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setBusy(true);
      setError('');
      setResult(null);
      const XlsxPopulate = await loadXlsx();
      const workbook = await XlsxPopulate.fromDataAsync(await file.arrayBuffer());
      const values = workbook.sheet(0).usedRange()?.value() || [];
      if (values.length < 2) throw new Error('The spreadsheet has no student rows');
      const headers = values[0].map(normalize);
      const indexes = Object.fromEntries(
        columns.map(([header, key]) => [key, headers.indexOf(normalize(header))]),
      );
      const missing = columns
        .slice(0, 6)
        .filter(([, key]) => indexes[key] < 0)
        .map(([header]) => header);
      if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}`);
      const rows = values
        .slice(1)
        .map((cells, index) => {
          const read = (key) => (indexes[key] < 0 ? '' : cells[indexes[key]]);
          const membershipType = String(read('membershipType') || 'free')
            .trim()
            .toLowerCase();
          return {
            candidateName: String(read('candidateName') || '').trim(),
            mobileNumber: String(read('mobileNumber') || '')
              .replace(/\.0$/, '')
              .trim(),
            personalEmail: String(read('personalEmail') || '').trim(),
            technology: String(read('technology') || '').trim(),
            naukriEmail: String(read('naukriEmail') || '').trim(),
            naukriPassword: String(read('naukriPassword') || ''),
            membershipType,
            ...(membershipType === 'paid' && {
              membershipPaidMonth: String(read('membershipPaidMonth') || '').trim(),
            }),
            currentTotalApplicationCount: Number(read('currentTotalApplicationCount') || 0),
            status: String(read('status') || 'active')
              .trim()
              .toLowerCase(),
            sourceRow: index + 2,
          };
        })
        .filter((row) => row.candidateName);
      if (!rows.length) throw new Error('The spreadsheet has no student rows');
      const combined = { imported: 0, failed: 0, results: [], createdTechnologies: [] };
      for (let index = 0; index < rows.length; index += 25) {
        const response = await apiClient.post('/students/import', {
          rows: rows.slice(index, index + 25),
        });
        const data = response.data.data;
        combined.imported += data.imported;
        combined.failed += data.failed;
        combined.results.push(...data.results);
        combined.createdTechnologies.push(...(data.createdTechnologies || []));
      }
      setResult(combined);
      if (combined.imported) onImported();
    } catch (requestError) {
      setError(getApiError(requestError, requestError.message));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (!busy) {
      setError('');
      setResult(null);
      onClose();
    }
  };
  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>Import students from Excel</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {busy && <LinearProgress />}
          <Typography color="text.secondary">
            Download the template, keep its column names, then upload the completed .xlsx file. New
            technology names are added to the dropdown automatically. Paid rows require Paid Month
            in YYYY-MM format.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              startIcon={<Download />}
              variant="outlined"
              onClick={downloadTemplate}
              disabled={busy}
            >
              Download template
            </Button>
            <Button
              startIcon={<UploadFile />}
              variant="contained"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {busy ? 'Importing…' : 'Choose Excel file'}
            </Button>
            <input
              ref={inputRef}
              hidden
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={importFile}
            />
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
          {result && (
            <Alert severity={result.failed ? 'warning' : 'success'}>
              {result.imported} imported, {result.failed} failed.
            </Alert>
          )}
          {result?.createdTechnologies.length > 0 && (
            <Alert severity="info">
              Added technologies: {[...new Set(result.createdTechnologies)].join(', ')}
            </Alert>
          )}
          {result?.failed > 0 && (
            <Box sx={{ maxHeight: 180, overflow: 'auto' }}>
              <List dense>
                {result.results
                  .filter((item) => !item.success)
                  .map((item) => (
                    <ListItem key={item.row}>
                      Row {item.row}: {item.message}
                    </ListItem>
                  ))}
              </List>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={busy}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
