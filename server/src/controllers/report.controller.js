import { Report } from '../models/Report.js';
import { recordActivity } from '../middlewares/activity.middleware.js';
import { getReportRows, renderReport, reportMimeTypes } from '../services/report.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const generate = asyncHandler(async (request, response) => {
  const { name, type, format, from, to, filters } = request.body;
  const report = await Report.create({
    name,
    type,
    format,
    dateRange: { from, to },
    filters,
    status: 'processing',
    generatedBy: request.user._id,
  });
  try {
    const rows = await getReportRows(request.body);
    const buffer = await renderReport(format, rows, name);
    report.status = 'completed';
    report.rowCount = rows.length;
    report.sizeBytes = buffer.length;
    report.fileName = `${
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'smartapply-report'
    }.${format}`;
    report.mimeType = reportMimeTypes[format];
    report.completedAt = new Date();
    await report.save();
    await recordActivity(request, 'report.generated', 'Report', report._id, {
      format,
      rowCount: rows.length,
    });
    response.set({
      'Content-Type': report.mimeType,
      'Content-Disposition': `attachment; filename="${report.fileName}"`,
      'X-Report-Id': report.id,
    });
    return response.status(200).send(buffer);
  } catch (error) {
    report.status = 'failed';
    report.failureReason = error.message;
    await report.save();
    throw error;
  }
});

export const list = asyncHandler(async (request, response) => {
  const filter = request.query.status ? { status: request.query.status } : {};
  const skip = (request.query.page - 1) * request.query.limit;
  const [items, total] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(request.query.limit),
    Report.countDocuments(filter),
  ]);
  return sendSuccess(response, {
    data: items,
    meta: {
      pagination: {
        page: request.query.page,
        limit: request.query.limit,
        total,
        pages: Math.ceil(total / request.query.limit),
      },
    },
  });
});
