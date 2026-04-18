import NotificationLog from '../models/NotificationLog.js';
import emailService from '../services/emailService.js';
import whatsappService from '../services/whatsappService.js';
import { ApiError, asyncHandler, buildPagination, sendSuccess } from '../utils/helpers.js';

const retryNotification = async (log) => {
  try {
    if (log.channel === 'whatsapp') {
      const result = await whatsappService.sendMessage(log.recipient, log.message);
      log.status = result.success || result.accepted || result.sent ? 'sent' : 'failed';
      log.provider = result.provider;
      log.providerMessageId = result.messageId || result.sid || null;
      log.error = result.error || null;
      await log.save();
      return log;
    }

    if (log.channel === 'email') {
      const result = await emailService.sendEmail(log.recipient, log.subject || 'Notification retry', log.message || '<p>Retry</p>');
      log.status = result.skipped ? 'failed' : 'sent';
      log.provider = result.provider || 'email';
      log.providerMessageId = result.id || null;
      log.error = result.skipped ? 'Provider skipped notification' : null;
      await log.save();
      return log;
    }
  } catch (error) {
    log.status = 'failed';
    log.error = error.message;
    await log.save();
    return log;
  }

  throw new ApiError(400, 'Unsupported notification channel', 'INVALID_NOTIFICATION_CHANNEL');
};

export const retryWhatsappNotification = asyncHandler(async (req, res) => {
  const log = await NotificationLog.findById(req.params.id);
  if (!log || log.channel !== 'whatsapp') throw new ApiError(404, 'WhatsApp notification log not found', 'NOTIFICATION_NOT_FOUND');
  const notification = await retryNotification(log);
  sendSuccess(res, 200, { notification }, 'WhatsApp notification retried');
});

export const retryEmailNotification = asyncHandler(async (req, res) => {
  const log = await NotificationLog.findById(req.params.id);
  if (!log || log.channel !== 'email') throw new ApiError(404, 'Email notification log not found', 'NOTIFICATION_NOT_FOUND');
  const notification = await retryNotification(log);
  sendSuccess(res, 200, { notification }, 'Email notification retried');
});

export const listFailedNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const filter = { status: 'failed' };
  if (req.query.channel) filter.channel = req.query.channel;
  if (req.query.module) filter.module = req.query.module;

  const sort = {};
  sort[sortBy] = sortOrder;

  const [notifications, total] = await Promise.all([
    NotificationLog.find(filter).sort(sort).skip(skip).limit(limit),
    NotificationLog.countDocuments(filter),
  ]);

  sendSuccess(res, 200, { notifications, pagination: buildPagination({ page, limit, total }) });
});
