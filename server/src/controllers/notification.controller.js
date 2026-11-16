import { Notification } from '../models/Notification.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list = asyncHandler(async (request, response) => {
  const filter = { recipient: request.user._id };
  const [items, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(30).populate('students', 'candidateName'),
    Notification.countDocuments({ ...filter, readAt: null }),
  ]);
  return sendSuccess(response, { data: { items, unreadCount } });
});

export const markRead = asyncHandler(async (request, response) => {
  const item = await Notification.findOneAndUpdate(
    { _id: request.params.id, recipient: request.user._id, readAt: null },
    { $set: { readAt: new Date() } },
    { new: true },
  );
  return sendSuccess(response, { data: item });
});

export const markAllRead = asyncHandler(async (request, response) => {
  const result = await Notification.updateMany(
    { recipient: request.user._id, readAt: null },
    { $set: { readAt: new Date() } },
  );
  return sendSuccess(response, { data: { modifiedCount: result.modifiedCount } });
});
