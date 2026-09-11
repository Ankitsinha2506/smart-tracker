import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';
import XlsxPopulate from 'xlsx-populate';
import { ApplyHistory } from '../models/ApplyHistory.js';
import { endOfUtcDay, startOfUtcDay } from '../utils/date.js';

export async function getReportRows(input) {
  const studentMatch = {};
  if (input.filters.technologies?.length)
    studentMatch.technology = {
      $in: input.filters.technologies.map((id) => new mongoose.Types.ObjectId(id)),
    };
  if (input.filters.membershipType) studentMatch.membershipType = input.filters.membershipType;
  if (input.filters.studentStatus) studentMatch.status = input.filters.studentStatus;
  return ApplyHistory.aggregate([
    {
      $match: { applicationDate: { $gte: startOfUtcDay(input.from), $lte: endOfUtcDay(input.to) } },
    },
    {
      $lookup: { from: 'students', localField: 'student', foreignField: '_id', as: 'studentData' },
    },
    { $unwind: '$studentData' },
    {
      $match: Object.fromEntries(
        Object.entries(studentMatch).map(([key, value]) => [`studentData.${key}`, value]),
      ),
    },
    {
      $lookup: {
        from: 'technologies',
        localField: 'studentData.technology',
        foreignField: '_id',
        as: 'technologyData',
      },
    },
    { $unwind: { path: '$technologyData', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'studentData.createdBy',
        foreignField: '_id',
        as: 'creatorData',
      },
    },
    { $unwind: { path: '$creatorData', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$student',
        candidateName: { $first: '$studentData.candidateName' },
        mobileNumber: { $first: '$studentData.mobileNumber' },
        email: { $first: '$studentData.personalEmail' },
        naukriEmail: { $first: '$studentData.naukriEmail' },
        technology: { $first: '$technologyData.name' },
        batch: { $first: '$studentData.batch' },
        trainer: { $first: '$studentData.trainerName' },
        city: { $first: '$studentData.city' },
        collegeName: { $first: '$studentData.collegeName' },
        membership: { $first: '$studentData.membershipType' },
        status: { $first: '$studentData.status' },
        currentTotal: { $first: '$studentData.currentTotalApplicationCount' },
        staffName: { $first: '$creatorData.name' },
        applications: { $sum: '$dailyCount' },
        activeDays: { $sum: { $cond: [{ $gt: ['$dailyCount', 0] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        candidateName: 1,
        mobileNumber: 1,
        email: 1,
        naukriEmail: 1,
        technology: 1,
        batch: 1,
        trainer: 1,
        city: 1,
        collegeName: 1,
        membership: 1,
        status: 1,
        currentTotal: 1,
        staffName: 1,
        applications: 1,
        activeDays: 1,
      },
    },
    { $sort: { applications: -1, candidateName: 1 } },
  ]);
}

const columns = [
  ['Candidate Name', 'candidateName'],
  ['Mobile Number', 'mobileNumber'],
  ['Personal Email', 'email'],
  ['Naukri Email', 'naukriEmail'],
  ['Technology', 'technology'],
  ['Batch', 'batch'],
  ['Trainer', 'trainer'],
  ['City', 'city'],
  ['College', 'collegeName'],
  ['Membership', 'membership'],
  ['Status', 'status'],
  ['Period Applied (+)', 'applications'],
  ['Total Applications', 'currentTotal'],
  ['Active Days', 'activeDays'],
  ['Added By (Staff)', 'staffName'],
];
const safeSpreadsheetValue = (value) => {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
};
const csvCell = (value) => `"${safeSpreadsheetValue(value).replaceAll('"', '""')}"`;

export async function renderReport(format, rows, title) {
  if (format === 'csv')
    return Buffer.from(
      [
        columns.map(([label]) => csvCell(label)).join(','),
        ...rows.map((row) => columns.map(([, key]) => csvCell(row[key])).join(',')),
      ].join('\n'),
    );
  if (format === 'xlsx') {
    const workbook = await XlsxPopulate.fromBlankAsync();
    const sheet = workbook.sheet(0).name('Applications');
    const matrix = [
      columns.map(([header]) => header),
      ...rows.map((row) => columns.map(([, key]) => safeSpreadsheetValue(row[key]))),
    ];
    sheet.cell('A1').value(matrix);
    sheet.range('A1:O1').style({ bold: true, fill: '4F46E5', fontColor: 'FFFFFF' });
    sheet.row(1).height(28);
    sheet.column('A').width(26);
    sheet.column('B').width(18);
    sheet.column('C').width(30);
    sheet.column('D').width(30);
    sheet.column('E').width(22);
    sheet.column('F').width(16);
    sheet.column('G').width(20);
    sheet.column('H').width(18);
    sheet.column('I').width(24);
    sheet.column('J').width(16);
    sheet.column('K').width(16);
    sheet.column('L').width(20);
    sheet.column('M').width(20);
    sheet.column('N').width(16);
    sheet.column('O').width(22);
    return Buffer.from(await workbook.outputAsync());
  }
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);
    document.fontSize(16).text(title).moveDown();
    document.fontSize(8);
    rows.forEach((row) =>
      document.text(
        `${row.candidateName} | ${row.mobileNumber || '-'} | ${row.email} | ${row.technology || '-'} | ${row.membership} | ${row.applications} applied | Total: ${row.currentTotal || 0} | Staff: ${row.staffName || '-'}`,
      ),
    );
    document.end();
  });
}

export const reportMimeTypes = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};
