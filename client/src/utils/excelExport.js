const loadXlsx = () =>
  import('xlsx-populate/browser/xlsx-populate').then((module) => module.default || module);

const safeSpreadsheetValue = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
};

const triggerDownload = async (workbook, filename) => {
  const blob = await workbook.outputAsync();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export async function exportDashboardExcel({
  cards = {},
  charts = {},
  range = {},
  selectedStaff = null,
}) {
  const XlsxPopulate = await loadXlsx();
  const workbook = await XlsxPopulate.fromBlankAsync();

  // ----------------------------------------------------
  // Sheet 1: Executive Summary
  // ----------------------------------------------------
  const sheet1 = workbook.sheet(0).name('Summary & Metrics');
  sheet1.column('A').width(28);
  sheet1.column('B').width(22);
  sheet1.column('C').width(28);
  sheet1.column('D').width(22);

  // Title Banner
  sheet1.cell('A1').value('SmartApply — Placement Analytics & Daily Application Report');
  sheet1.range('A1:D1').merged(true).style({
    bold: true,
    fontSize: 14,
    fontColor: 'FFFFFF',
    fill: '4F46E5',
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
  });
  sheet1.row(1).height(32);

  // Subtitle / Filters
  const staffName = selectedStaff?.name || (range.staff ? 'Filtered Staff' : 'All Staff Combined');
  sheet1
    .cell('A2')
    .value(
      `Period: ${range.from || 'Start'} to ${range.to || 'Present'}  |  Scope: ${staffName}  |  Exported: ${new Date().toLocaleString()}`,
    );
  sheet1.range('A2:D2').merged(true).style({
    italic: true,
    fontSize: 10,
    fontColor: '475569',
    fill: 'F1F5F9',
    horizontalAlignment: 'center',
  });
  sheet1.row(2).height(22);

  // KPI Metrics Table
  sheet1.cell('A4').value('KEY PERFORMANCE METRIC');
  sheet1.cell('B4').value('VALUE');
  sheet1.cell('C4').value('KEY PERFORMANCE METRIC');
  sheet1.cell('D4').value('VALUE');
  sheet1.range('A4:D4').style({ bold: true, fill: 'E2E8F0', fontColor: '1E293B' });

  const kpis = [
    [
      'Total Candidates Managed',
      cards.totalStudents || 0,
      "Today's Applications (+)",
      cards.todayApplications || 0,
    ],
    [
      'Active Candidates',
      cards.activeStudents || 0,
      "Yesterday's Applications",
      cards.yesterdayApplications || 0,
    ],
    [
      'Paid Memberships',
      cards.paidUsers || 0,
      'Selected Period Applications',
      cards.rangeApplications || cards.monthlyApplications || 0,
    ],
    [
      'Free Memberships',
      cards.freeUsers || 0,
      'Lifetime Overall Applications',
      cards.overallApplications || 0,
    ],
    [
      'Placed Candidates',
      cards.placedStudents || 0,
      'Average Applications / Student',
      cards.averageApplicationsPerStudent || 0,
    ],
  ];

  kpis.forEach((row, idx) => {
    const rowNum = 5 + idx;
    sheet1.cell(`A${rowNum}`).value(row[0]);
    sheet1.cell(`B${rowNum}`).value(row[1]).style({ horizontalAlignment: 'right', bold: true });
    sheet1.cell(`C${rowNum}`).value(row[2]);
    sheet1.cell(`D${rowNum}`).value(row[3]).style({ horizontalAlignment: 'right', bold: true });
  });

  // Technology Breakdown
  if (charts.technologyWise?.length) {
    const startRow = 12;
    sheet1.cell(`A${startRow}`).value('TECHNOLOGY DOMAIN');
    sheet1.cell(`B${startRow}`).value('PERIOD APPLICATIONS');
    sheet1
      .range(`A${startRow}:B${startRow}`)
      .style({ bold: true, fill: 'E2E8F0', fontColor: '1E293B' });
    charts.technologyWise.forEach((tech, i) => {
      const r = startRow + 1 + i;
      sheet1.cell(`A${r}`).value(safeSpreadsheetValue(tech.technology));
      sheet1.cell(`B${r}`).value(tech.applications).style({ horizontalAlignment: 'right' });
    });
  }

  // ----------------------------------------------------
  // Sheet 2: Day-by-Day Progression
  // ----------------------------------------------------
  if (charts.dailyTrend?.length) {
    const sheet2 = workbook.addSheet('Day-by-Day Applications');
    sheet2.column('A').width(18);
    sheet2.column('B').width(16);
    sheet2.column('C').width(24);
    sheet2.column('D').width(26);

    sheet2.cell('A1').value('DATE');
    sheet2.cell('B1').value('DAY');
    sheet2.cell('C1').value('APPLIED TODAY (+)');
    sheet2.cell('D1').value('CUMULATIVE RUNNING TOTAL');
    sheet2
      .range('A1:D1')
      .style({ bold: true, fontColor: 'FFFFFF', fill: '4F46E5', horizontalAlignment: 'center' });
    sheet2.row(1).height(26);

    charts.dailyTrend.forEach((day, index) => {
      const r = 2 + index;
      const d = new Date(day.date);
      const dayName = isNaN(d.getTime())
        ? ''
        : d.toLocaleDateString(undefined, { weekday: 'short' });
      sheet2
        .cell(`A${r}`)
        .value(safeSpreadsheetValue(day.date))
        .style({ horizontalAlignment: 'center' });
      sheet2.cell(`B${r}`).value(dayName).style({ horizontalAlignment: 'center' });
      sheet2
        .cell(`C${r}`)
        .value(day.applications)
        .style({ horizontalAlignment: 'right', bold: day.applications > 0 });
      sheet2
        .cell(`D${r}`)
        .value(day.cumulative || '')
        .style({ horizontalAlignment: 'right' });
    });
  }

  // ----------------------------------------------------
  // Sheet 3: Top Performing Candidates
  // ----------------------------------------------------
  if (charts.topStudents?.length) {
    const sheet3 = workbook.addSheet('Top Candidates');
    sheet3.column('A').width(26);
    sheet3.column('B').width(24);
    sheet3.column('C').width(22);
    sheet3.column('D').width(22);
    sheet3.column('E').width(24);

    sheet3.cell('A1').value('CANDIDATE NAME');
    sheet3.cell('B1').value('TECHNOLOGY');
    sheet3.cell('C1').value('PERIOD APPLIED (+)');
    sheet3.cell('D1').value('TODAY APPLIED');
    sheet3.cell('E1').value('CURRENT TOTAL COUNT');
    sheet3
      .range('A1:E1')
      .style({ bold: true, fontColor: 'FFFFFF', fill: '4F46E5', horizontalAlignment: 'center' });
    sheet3.row(1).height(26);

    charts.topStudents.forEach((st, idx) => {
      const r = 2 + idx;
      sheet3.cell(`A${r}`).value(safeSpreadsheetValue(st.candidateName));
      sheet3.cell(`B${r}`).value(safeSpreadsheetValue(st.technology || '-'));
      sheet3
        .cell(`C${r}`)
        .value(st.applications)
        .style({ horizontalAlignment: 'right', bold: true });
      sheet3
        .cell(`D${r}`)
        .value(st.todayApplications || 0)
        .style({ horizontalAlignment: 'right' });
      sheet3
        .cell(`E${r}`)
        .value(st.totalApplications || '')
        .style({ horizontalAlignment: 'right' });
    });
  }

  // ----------------------------------------------------
  // Sheet 4: Staff Leaderboard (if Admin)
  // ----------------------------------------------------
  if (charts.staffPerformance?.length) {
    const sheet4 = workbook.addSheet('Staff Performance');
    sheet4.column('A').width(24);
    sheet4.column('B').width(30);
    sheet4.column('C').width(18);
    sheet4.column('D').width(20);
    sheet4.column('E').width(20);
    sheet4.column('F').width(20);
    sheet4.column('G').width(20);

    sheet4.cell('A1').value('STAFF NAME');
    sheet4.cell('B1').value('EMAIL');
    sheet4.cell('C1').value('STUDENTS MANAGED');
    sheet4.cell('D1').value('PERIOD APPLIED (+)');
    sheet4.cell('E1').value('TODAY APPLIED');
    sheet4.cell('F1').value('OVERALL TOTAL');
    sheet4.cell('G1').value('AVG / STUDENT');
    sheet4
      .range('A1:G1')
      .style({ bold: true, fontColor: 'FFFFFF', fill: '4F46E5', horizontalAlignment: 'center' });
    sheet4.row(1).height(26);

    charts.staffPerformance.forEach((staff, idx) => {
      const r = 2 + idx;
      sheet4.cell(`A${r}`).value(safeSpreadsheetValue(staff.name));
      sheet4.cell(`B${r}`).value(safeSpreadsheetValue(staff.email));
      sheet4.cell(`C${r}`).value(staff.totalStudents).style({ horizontalAlignment: 'right' });
      sheet4
        .cell(`D${r}`)
        .value(staff.applications)
        .style({ horizontalAlignment: 'right', bold: true });
      sheet4.cell(`E${r}`).value(staff.todayApplications).style({ horizontalAlignment: 'right' });
      sheet4.cell(`F${r}`).value(staff.overallApplications).style({ horizontalAlignment: 'right' });
      sheet4.cell(`G${r}`).value(staff.averagePerStudent).style({ horizontalAlignment: 'right' });
    });
  }

  // ----------------------------------------------------
  // Sheet 5: Recent Application Logs
  // ----------------------------------------------------
  if (charts.recentActivity?.length) {
    const sheet5 = workbook.addSheet('Recent Activity Log');
    sheet5.column('A').width(16);
    sheet5.column('B').width(26);
    sheet5.column('C').width(28);
    sheet5.column('D').width(22);
    sheet5.column('E').width(18);
    sheet5.column('F').width(18);
    sheet5.column('G').width(18);

    sheet5.cell('A1').value('DATE');
    sheet5.cell('B1').value('CANDIDATE NAME');
    sheet5.cell('C1').value('EMAIL');
    sheet5.cell('D1').value('APPLIED BY (STAFF)');
    sheet5.cell('E1').value('PREVIOUS TOTAL');
    sheet5.cell('F1').value('APPLIED (+)');
    sheet5.cell('G1').value('NEW TOTAL');
    sheet5
      .range('A1:G1')
      .style({ bold: true, fontColor: 'FFFFFF', fill: '4F46E5', horizontalAlignment: 'center' });
    sheet5.row(1).height(26);

    charts.recentActivity.forEach((act, idx) => {
      const r = 2 + idx;
      const dStr = new Date(act.applicationDate).toLocaleDateString();
      sheet5.cell(`A${r}`).value(dStr).style({ horizontalAlignment: 'center' });
      sheet5.cell(`B${r}`).value(safeSpreadsheetValue(act.student?.candidateName));
      sheet5.cell(`C${r}`).value(safeSpreadsheetValue(act.student?.personalEmail));
      sheet5.cell(`D${r}`).value(safeSpreadsheetValue(act.recordedBy?.name || 'Staff'));
      sheet5.cell(`E${r}`).value(act.previousCount).style({ horizontalAlignment: 'right' });
      sheet5
        .cell(`F${r}`)
        .value(act.dailyCount)
        .style({ horizontalAlignment: 'right', bold: true });
      sheet5
        .cell(`G${r}`)
        .value(act.currentCount)
        .style({ horizontalAlignment: 'right', bold: true });
    });
  }

  const filename = `SmartApply_Dashboard_Report_${range.from || 'start'}_to_${range.to || 'now'}.xlsx`;
  await triggerDownload(workbook, filename);
}

export async function exportStudentsExcel(
  students = [],
  filename = 'SmartApply_Candidates_List.xlsx',
) {
  const XlsxPopulate = await loadXlsx();
  const workbook = await XlsxPopulate.fromBlankAsync();
  const sheet = workbook.sheet(0).name('Candidates');

  const headers = [
    ['Candidate Name', 26],
    ['Mobile Number', 18],
    ['Personal Email', 28],
    ['Naukri Email', 28],
    ['Technology', 20],
    ['Batch', 14],
    ['Trainer', 20],
    ['City', 16],
    ['College Name', 24],
    ['Membership', 16],
    ['Status', 14],
    ['Previous Count', 16],
    ['Today Applied (+)', 18],
    ['Total Applications', 18],
    ['Added By (Staff)', 20],
  ];

  headers.forEach(([title, width], index) => {
    const colLetter = String.fromCharCode(65 + index);
    sheet.column(colLetter).width(width);
    sheet.cell(`${colLetter}1`).value(title);
  });

  const lastCol = String.fromCharCode(65 + headers.length - 1);
  sheet.range(`A1:${lastCol}1`).style({
    bold: true,
    fontColor: 'FFFFFF',
    fill: '4F46E5',
    horizontalAlignment: 'center',
  });
  sheet.row(1).height(28);

  students.forEach((s, idx) => {
    const r = 2 + idx;
    sheet.cell(`A${r}`).value(safeSpreadsheetValue(s.candidateName));
    sheet.cell(`B${r}`).value(safeSpreadsheetValue(s.mobileNumber));
    sheet.cell(`C${r}`).value(safeSpreadsheetValue(s.personalEmail));
    sheet.cell(`D${r}`).value(safeSpreadsheetValue(s.naukriEmail || ''));
    sheet.cell(`E${r}`).value(safeSpreadsheetValue(s.technology?.name || s.technology || '-'));
    sheet.cell(`F${r}`).value(safeSpreadsheetValue(s.batch || '-'));
    sheet.cell(`G${r}`).value(safeSpreadsheetValue(s.trainerName || '-'));
    sheet.cell(`H${r}`).value(safeSpreadsheetValue(s.city || '-'));
    sheet.cell(`I${r}`).value(safeSpreadsheetValue(s.collegeName || '-'));
    sheet
      .cell(`J${r}`)
      .value(safeSpreadsheetValue(s.membershipType || 'free'))
      .style({ horizontalAlignment: 'center' });
    sheet
      .cell(`K${r}`)
      .value(safeSpreadsheetValue(s.status || 'active'))
      .style({ horizontalAlignment: 'center' });
    sheet
      .cell(`L${r}`)
      .value(s.previousDayApplicationCount || 0)
      .style({ horizontalAlignment: 'right' });
    sheet
      .cell(`M${r}`)
      .value(s.todayApplicationCount || 0)
      .style({ horizontalAlignment: 'right', bold: s.todayApplicationCount > 0 });
    sheet
      .cell(`N${r}`)
      .value(s.currentTotalApplicationCount || 0)
      .style({ horizontalAlignment: 'right', bold: true });
    sheet.cell(`O${r}`).value(safeSpreadsheetValue(s.createdBy?.name || '-'));
  });

  await triggerDownload(workbook, filename);
}

export async function exportHistoryExcel(
  historyItems = [],
  filename = 'SmartApply_History_Ledger.xlsx',
) {
  const XlsxPopulate = await loadXlsx();
  const workbook = await XlsxPopulate.fromBlankAsync();
  const sheet = workbook.sheet(0).name('Application History');

  const headers = [
    ['Application Date', 18],
    ['Candidate Name', 26],
    ['Personal Email', 28],
    ['Recorded By', 22],
    ['Previous Count', 16],
    ['Daily Applied (+)', 18],
    ['Current Total', 18],
    ['Source', 14],
    ['Note', 28],
  ];

  headers.forEach(([title, width], index) => {
    const colLetter = String.fromCharCode(65 + index);
    sheet.column(colLetter).width(width);
    sheet.cell(`${colLetter}1`).value(title);
  });

  const lastCol = String.fromCharCode(65 + headers.length - 1);
  sheet.range(`A1:${lastCol}1`).style({
    bold: true,
    fontColor: 'FFFFFF',
    fill: '4F46E5',
    horizontalAlignment: 'center',
  });
  sheet.row(1).height(28);

  historyItems.forEach((h, idx) => {
    const r = 2 + idx;
    const dateStr = new Date(h.applicationDate).toLocaleDateString();
    sheet.cell(`A${r}`).value(dateStr).style({ horizontalAlignment: 'center' });
    sheet.cell(`B${r}`).value(safeSpreadsheetValue(h.student?.candidateName || 'My Account'));
    sheet.cell(`C${r}`).value(safeSpreadsheetValue(h.student?.personalEmail || ''));
    sheet.cell(`D${r}`).value(safeSpreadsheetValue(h.recordedBy?.name || 'Staff'));
    sheet.cell(`E${r}`).value(h.previousCount).style({ horizontalAlignment: 'right' });
    sheet.cell(`F${r}`).value(h.dailyCount).style({ horizontalAlignment: 'right', bold: true });
    sheet.cell(`G${r}`).value(h.currentCount).style({ horizontalAlignment: 'right', bold: true });
    sheet
      .cell(`H${r}`)
      .value(safeSpreadsheetValue(h.source || ''))
      .style({ horizontalAlignment: 'center' });
    sheet.cell(`I${r}`).value(safeSpreadsheetValue(h.note || ''));
  });

  await triggerDownload(workbook, filename);
}

const getColLetter = (n) => {
  let s = '';
  let temp = n;
  while (temp > 0) {
    const m = (temp - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    temp = Math.floor((temp - m) / 26);
  }
  return s;
};

export async function exportDateWiseMatrixExcel({
  dateRange = {},
  days = [],
  students = [],
  totals = {},
  selectedStaff = null,
  includeAssignedTo = true,
  filename = 'SmartApply_DateWise_Tracking_Matrix.xlsx',
}) {
  const XlsxPopulate = await loadXlsx();
  const workbook = await XlsxPopulate.fromBlankAsync();
  const sheet = workbook.sheet(0).name('Daily Tracking Matrix');

  const baseHeaders = [
    ['Candidate', 34],
    ['Stack', 26],
    ...(includeAssignedTo ? [['Assigned To', 26]] : []),
  ];

  const matrixHeaders = [
    ['Opening Count', 16],
    ...days.map((d) => [`${d.label}\n${d.dayName || ''}`, 12]),
    ['Period Applied', 18],
    ['Cumulative Total', 18],
  ];

  const allHeaders = [...baseHeaders, ...matrixHeaders];
  const totalCols = allHeaders.length;
  const lastColLetter = getColLetter(totalCols);

  sheet.cell('A1').value('SmartApply — Date-wise Daily Application Tracking Matrix');
  sheet.range(`A1:${lastColLetter}1`).merged(true).style({
    bold: true,
    fontSize: 14,
    fontColor: 'FFFFFF',
    fill: '4F46E5',
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
  });
  sheet.row(1).height(32);

  const fromStr = dateRange.from ? new Date(dateRange.from).toLocaleDateString() : 'Start';
  const toStr = dateRange.to ? new Date(dateRange.to).toLocaleDateString() : 'Present';
  const staffStr = selectedStaff?.name || 'All Staff Combined';
  sheet
    .cell('A2')
    .value(
      `Period: ${fromStr} to ${toStr}  |  Staff Scope: ${staffStr}  |  Total Candidates: ${students.length}  |  Period Applied: +${totals.periodAppliedTotal || 0}  |  Exported: ${new Date().toLocaleString()}`,
    );
  sheet.range(`A2:${lastColLetter}2`).merged(true).style({
    italic: true,
    fontSize: 10,
    fontColor: '475569',
    fill: 'F1F5F9',
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
  });
  sheet.row(2).height(22);

  sheet.row(3).height(8);

  allHeaders.forEach(([title, width], idx) => {
    const col = getColLetter(idx + 1);
    sheet.column(col).width(width);
    sheet.cell(`${col}4`).value(title);
  });

  sheet.range(`A4:${getColLetter(baseHeaders.length)}4`).style({
    bold: true,
    fontColor: 'FFFFFF',
    fill: '334155',
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
  });

  const startColLetter = getColLetter(baseHeaders.length + 1);
  sheet.cell(`${startColLetter}4`).style({
    bold: true,
    fontColor: 'FFFFFF',
    fill: '312E81',
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
  });

  if (days.length > 0) {
    const firstDayCol = getColLetter(baseHeaders.length + 2);
    const lastDayCol = getColLetter(baseHeaders.length + 1 + days.length);
    sheet.range(`${firstDayCol}4:${lastDayCol}4`).style({
      bold: true,
      fontColor: 'FFFFFF',
      fill: '4F46E5',
      horizontalAlignment: 'center',
      verticalAlignment: 'center',
    });
  }

  const periodColLetter = getColLetter(baseHeaders.length + days.length + 2);
  sheet.cell(`${periodColLetter}4`).style({
    bold: true,
    fontColor: 'FFFFFF',
    fill: '0D9488',
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
  });

  const totalColLetter = getColLetter(baseHeaders.length + days.length + 3);
  sheet.cell(`${totalColLetter}4`).style({
    bold: true,
    fontColor: 'FFFFFF',
    fill: '1E1B4B',
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
  });

  sheet.row(4).height(36);
  sheet.range(`A4:${lastColLetter}4`).style({ wrapText: true });
  sheet.freezePanes(baseHeaders.length, 4);

  students.forEach((s, idx) => {
    const r = 5 + idx;
    sheet.row(r).height(36);
    sheet.range(`A${r}:${lastColLetter}${r}`).style({ verticalAlignment: 'center', fill: idx % 2 === 0 ? 'F0F7FF' : 'FFFFFF', fontSize: 11 });
    sheet.cell(`A${r}`).value(safeSpreadsheetValue([s.candidateName, s.personalEmail].filter(Boolean).join('\n'))).style({ wrapText: true });
    sheet.cell(`B${r}`).value(safeSpreadsheetValue(s.technology?.name || 'General')).style({ wrapText: true });
    if (includeAssignedTo) sheet.cell(`C${r}`).value(safeSpreadsheetValue(s.createdBy?.name || 'Super admin')).style({ wrapText: true });

    sheet
      .cell(`${startColLetter}${r}`)
      .value(s.startingCount || 0)
      .style({
        horizontalAlignment: 'right',
        bold: true,
        fill: idx % 2 === 0 ? 'EEF2FF' : 'FFFFFF',
      });

    days.forEach((d, dIdx) => {
      const col = getColLetter(baseHeaders.length + 2 + dIdx);
      const count = s.dailyCounts?.[d.key] || 0;
      const cell = sheet.cell(`${col}${r}`).value(count).style({ numberFormat: '+0;-0;"—"' });
      if (count > 0) {
        cell.style({
          horizontalAlignment: 'right',
          bold: true,
          fontColor: '047857',
          fill: idx % 2 === 0 ? 'ECFDF5' : 'F0FDF4',
        });
      } else {
        cell.style({
          horizontalAlignment: 'right',
          fontColor: '94A3B8',
          fill: idx % 2 === 0 ? 'F8FAFC' : 'FFFFFF',
        });
      }
    });

    sheet
      .cell(`${periodColLetter}${r}`)
      .value(s.periodApplied || 0)
      .style({
        horizontalAlignment: 'right',
        bold: true,
        fontColor: s.periodApplied > 0 ? '0F766E' : '64748B',
        fill: idx % 2 === 0 ? 'F0FDFA' : 'FFFFFF',
      });

    sheet
      .cell(`${totalColLetter}${r}`)
      .value(s.endingCount || 0)
      .style({
        horizontalAlignment: 'right',
        bold: true,
        fill: idx % 2 === 0 ? 'F1F5F9' : 'FFFFFF',
      });
  });

  const totalsRow = 5 + students.length;
  sheet.row(totalsRow).height(26);

  sheet.cell(`A${totalsRow}`).value('TOTALS');
  sheet.range(`A${totalsRow}:${getColLetter(baseHeaders.length)}${totalsRow}`).merged(true).style({
    bold: true,
    fontColor: '1E293B',
    fill: 'E2E8F0',
    horizontalAlignment: 'center',
    verticalAlignment: 'center',
  });

  sheet
    .cell(`${startColLetter}${totalsRow}`)
    .value(totals.startingTotal || 0)
    .style({
      bold: true,
      horizontalAlignment: 'right',
      fill: 'E0E7FF',
      fontColor: '312E81',
    });

  days.forEach((d, dIdx) => {
    const col = getColLetter(baseHeaders.length + 2 + dIdx);
    const dayTotal = totals.dailyTotals?.[d.key] || 0;
    sheet
      .cell(`${col}${totalsRow}`)
      .value(dayTotal)
      .style({
        bold: true,
        horizontalAlignment: 'right',
        fill: dayTotal > 0 ? 'DCFCE7' : 'F1F5F9',
        fontColor: dayTotal > 0 ? '166534' : '64748B',
      });
  });

  sheet
    .cell(`${periodColLetter}${totalsRow}`)
    .value(totals.periodAppliedTotal || 0)
    .style({
      bold: true,
      horizontalAlignment: 'right',
      fill: 'CCFBF1',
      fontColor: '115E59',
    });

  sheet
    .cell(`${totalColLetter}${totalsRow}`)
    .value(totals.endingTotal || 0)
    .style({
      bold: true,
      horizontalAlignment: 'right',
      fill: 'C7D2FE',
      fontColor: '1E1B4B',
    });

  await triggerDownload(workbook, filename);
}
