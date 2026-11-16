import { useRef, useState } from 'react';
import { Download, UploadFile } from '@mui/icons-material';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, List, ListItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { apiClient, getApiError } from '../../services/apiClient.js';

const columns = [
  ['Full Name', 'fullName'], ['Mobile', 'mobile'], ['Email', 'email'],
  ['Technology', 'technology'], ['Selected Date', 'selectedDate'], ['Selected Company', 'company'],
  ['Total Amount', 'totalAmount'], ['Advance Paid Amount', 'advancePaidAmount'], ['Due Date', 'dueDate'],
];
const normalize = (value) => String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases = {
  fullName: ['fullname', 'name', 'candidatename', 'firstname'], name: ['name', 'candidatename', 'firstname'], surname: ['surname', 'lastname', 'familyname'],
  mobile: ['mobile', 'mobilenumber', 'phone', 'phonenumber', 'contactnumber'],
  email: ['email', 'personalemail', 'candidateemail'], technology: ['technology', 'role', 'domain'],
  selectedDate: ['selecteddate', 'selectiondate', 'joiningdate'], company: ['selectedcompany', 'company', 'companyname'],
  totalAmount: ['totalamount', 'totalamt', 'amount'], advancePaidAmount: ['advancepaidamount', 'advancepaid', 'paidamount', 'paidamt'],
  dueDate: ['duedate', 'nextduedate'],
};
const amountValue = (value) => typeof value === 'number' ? value : Number(String(value ?? '').replace(/[₹,\s]/g, ''));
const dateValue = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number' && value > 20000 && value < 100000) return new Date(Date.UTC(1899, 11, 30) + value * 86400000);
  const text = String(value ?? '').trim();
  const local = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const parsed = local ? new Date(Date.UTC(Number(local[3]), Number(local[2]) - 1, Number(local[1]))) : new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
const isoDate = (date) => date?.toISOString();
const randomDate = () => { const now = new Date(); const start = Date.UTC(now.getUTCFullYear() - 3, 0, 1); return new Date(start + Math.random() * (now.getTime() - start)); };
const cellText = (value) => String(value ?? '').trim();
const placeholder = (value) => cellText(value) || 'NA';

export function RecoveryImportDialog({ open, onClose, onImported }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0); const [error, setError] = useState('');
  const [rows, setRows] = useState([]); const [parsed, setParsed] = useState(false); const [validRows, setValidRows] = useState([]); const [invalidRows, setInvalidRows] = useState([]); const [result, setResult] = useState(null);
  const downloadTemplate = async () => {
    try {
      const XlsxPopulate = (await import('xlsx-populate/browser/xlsx-populate')).default;
      const workbook = await XlsxPopulate.fromBlankAsync(); const sheet = workbook.sheet(0).name('BD Recovery');
      sheet.row(1).style({ bold: true, fill: 'D9F0F2' });
      columns.forEach(([header], index) => sheet.cell(1, index + 1).value(header));
      sheet.range('A2:I2').value([['Anita Kumar', '9876543210', 'anita@example.com', 'Java Developer', '2026-04-10', 'Example Technologies', 200000, 15000, '2026-11-01']]);
      ['A','D','E','G'].forEach((column) => { sheet.column(column).width(25); });
      sheet.column('B').width(18); sheet.column('E').width(17); sheet.column('I').width(16);
      const blob = await workbook.outputAsync(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'bd-recovery-import-template.xlsx'; anchor.click(); URL.revokeObjectURL(url);
    } catch (err) { setError(getApiError(err, 'Could not create the Excel template.')); }
  };
  const parseFile = async (event) => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    setError(''); setResult(null); setRows([]); setParsed(false); setValidRows([]); setInvalidRows([]);
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error('Choose an .xlsx Excel file. Save older .xls files as .xlsx first.');
      if (file.size > 10 * 1024 * 1024) throw new Error('The Excel file must be 10 MB or smaller.');
      const { readSheet } = await import('read-excel-file/browser');
      const sheet = await readSheet(file, { trim: false }); if (sheet.length < 2) throw new Error('The spreadsheet has no candidate rows.');
      const headerIndexes = new Map(sheet[0].map((header, index) => [normalize(header), index]));
      const indexes = Object.fromEntries(Object.entries(aliases).map(([key, names]) => [key, names.map(normalize).map((name) => headerIndexes.get(name)).find((index) => index !== undefined) ?? -1]));
      if (indexes.fullName < 0 && indexes.surname < 0) throw new Error('Add a Full Name column (or legacy Name and Surname columns) to the spreadsheet.');
      const seenMobile = new Set(); const valid = []; const invalid = [];
      sheet.slice(1).forEach((cells, index) => {
        if (!cells?.some((cell) => String(cell ?? '').trim())) return;
        const rowNumber = index + 2; const read = (key) => indexes[key] < 0 ? '' : cells[indexes[key]];
        const rawMobile = cellText(read('mobile')).replace(/\.0$/, '');
        const mobile = rawMobile ? rawMobile.replace(/\D/g, '') : 'NA';
        const fullName = [cellText(read('fullName')), cellText(read('surname'))].filter(Boolean).join(' ') || cellText(read('name'));
        const nameParts = fullName.split(/\s+/).filter(Boolean);
        const selectedDate = cellText(read('selectedDate')) ? dateValue(read('selectedDate')) : randomDate(); const dueDate = cellText(read('dueDate')) ? dateValue(read('dueDate')) : randomDate();
        const totalAmount = cellText(read('totalAmount')) ? amountValue(read('totalAmount')) : 0; const advancePaidAmount = cellText(read('advancePaidAmount')) ? amountValue(read('advancePaidAmount')) : 0;
        const candidate = { name: nameParts.shift() || 'NA', surname: nameParts.join(' ') || 'NA', mobile, email: placeholder(read('email')).toLowerCase(), technology: placeholder(read('technology')), selectedDate: isoDate(selectedDate), company: placeholder(read('company')), totalAmount, advancePaidAmount, dueDate: isoDate(dueDate), sourceRow: rowNumber };
        let message = '';
        if (mobile !== 'NA' && !/^\d{10}$/.test(mobile)) message = 'Mobile must contain exactly 10 digits, or leave it blank.';
        else if (candidate.email !== 'na' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)) message = 'Enter a valid email address, or leave it blank.';
        else if (!selectedDate || !dueDate) message = 'Selected date or due date is invalid.';
        else if (!Number.isFinite(totalAmount) || totalAmount < 0 || !Number.isFinite(advancePaidAmount) || advancePaidAmount < 0 || advancePaidAmount > totalAmount) message = 'Amounts must be non-negative and advance paid cannot exceed total.';
        else if (mobile !== 'NA' && seenMobile.has(mobile)) message = 'Duplicate mobile number in this spreadsheet.';
        if (message) invalid.push({ row: rowNumber, message });
        else { if (mobile !== 'NA') seenMobile.add(mobile); valid.push(candidate); }
      });
      if (!valid.length && !invalid.length) throw new Error('The spreadsheet contains no candidate rows.');
      setRows(valid); setParsed(true); setValidRows(valid); setInvalidRows(invalid);
    } catch (err) { setError(getApiError(err, err.message || 'Could not read this Excel file.')); }
  };
  const importRows = async () => {
    if (!validRows.length) return;
    setBusy(true); setProgress(0); setError('');
    const combined = { imported: 0, failed: 0, results: [...invalidRows.map((item) => ({ ...item, success: false }))] };
    try {
      for (let index = 0; index < validRows.length; index += 50) {
        const response = await apiClient.post('/bd-recovery/import', { rows: validRows.slice(index, index + 50) });
        const chunk = response.data.data; combined.imported += chunk.imported; combined.failed += chunk.failed; combined.results.push(...chunk.results);
      }
      setResult(combined); setValidRows([]); if (combined.imported) onImported();
    } catch (err) { setError(getApiError(err, 'Import stopped before all rows were uploaded. You can retry the remaining valid rows.')); }
    finally { setBusy(false); }
  };
  const reset = () => { if (busy) return; setError(''); setRows([]); setParsed(false); setValidRows([]); setInvalidRows([]); setResult(null); onClose(); };
  return <Dialog open={open} onClose={reset} fullWidth maxWidth="md"><DialogTitle sx={{ pb: 1 }}>Import BD Recovery history</DialogTitle><DialogContent><Stack spacing={2.2} sx={{ pt: 1 }}>
    <Typography color="text.secondary">Import candidates using a Full Name column. Blank text fields are filled with NA, blank dates receive random dates, and blank amounts become 0. You can edit imported candidates later. Duplicate mobiles are reported and skipped.</Typography>
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}><Button startIcon={<Download />} onClick={downloadTemplate} variant="outlined" disabled={busy}>Download Excel template</Button><Button startIcon={<UploadFile />} onClick={() => inputRef.current?.click()} variant="contained" disabled={busy}>{rows.length ? 'Choose another file' : 'Choose Excel file'}</Button><input ref={inputRef} hidden type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={parseFile} /></Stack>
    {busy && <Box><LinearProgress variant="determinate" value={progress} /><Typography variant="caption" color="text.secondary">Importing rows… {progress}%</Typography></Box>}{error && <Alert severity="error">{error}</Alert>}
    {parsed && <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}><Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}><Typography fontWeight={750}>Import preview</Typography><Stack direction="row" spacing={1}><Alert icon={false} severity="success" sx={{ py: 0 }}>Ready: {validRows.length}</Alert><Alert icon={false} severity={invalidRows.length ? 'warning' : 'info'} sx={{ py: 0 }}>Needs review: {invalidRows.length}</Alert></Stack></Stack><Box sx={{ overflow: 'auto', maxHeight: 270 }}><Table size="small" stickyHeader><TableHead><TableRow>{['Full Name','Mobile','Email','Company','Total','Advance','Selected date'].map((header) => <TableCell key={header}>{header}</TableCell>)}</TableRow></TableHead><TableBody>{rows.slice(0, 8).map((row) => <TableRow key={row.sourceRow}><TableCell>{`${row.name} ${row.surname}`.replace(/\bNA\b/g, '').trim() || 'NA'}</TableCell><TableCell>{row.mobile}</TableCell><TableCell>{row.email}</TableCell><TableCell>{row.company}</TableCell><TableCell>{row.totalAmount.toLocaleString('en-IN')}</TableCell><TableCell>{row.advancePaidAmount.toLocaleString('en-IN')}</TableCell><TableCell>{row.selectedDate.slice(0, 10)}</TableCell></TableRow>)}</TableBody></Table></Box>{rows.length > 8 && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>Showing 8 of {rows.length} valid rows.</Typography>}{invalidRows.length > 0 && <List dense sx={{ maxHeight: 140, overflow: 'auto', mt: 1 }}>{invalidRows.slice(0, 30).map((item) => <ListItem key={`${item.row}-${item.message}`} disableGutters>Row {item.row}: {item.message}</ListItem>)}</List>}</Paper>}
    {result && <Alert severity={result.failed ? 'warning' : 'success'}>{result.imported} imported, {result.failed} skipped or failed.</Alert>}{result?.results.some((item) => !item.success) && <List dense sx={{ maxHeight: 150, overflow: 'auto' }}>{result.results.filter((item) => !item.success).slice(0, 100).map((item, index) => <ListItem key={`${item.row}-${index}`} disableGutters>Row {item.row}: {item.message}</ListItem>)}</List>}
  </Stack></DialogContent><DialogActions sx={{ p: 2.5, pt: 1 }}><Button onClick={reset} disabled={busy}>Close</Button><Button variant="contained" onClick={importRows} disabled={busy || !validRows.length} sx={{ minWidth: 160 }}>{busy ? 'Importing…' : `Import ${validRows.length} rows`}</Button></DialogActions></Dialog>;
}
