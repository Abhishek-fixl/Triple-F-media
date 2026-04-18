import BrandLead from '../models/BrandLead.js';
import Lead from '../models/Lead.js';
import NotificationLog from '../models/NotificationLog.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';
import { asyncHandler, sendSuccess } from '../utils/helpers.js';

const safeCreateNotificationLog = async (payload, context = {}) => {
  try {
    await NotificationLog.create(payload);
  } catch (error) {
    logger.warn('NotificationLog write failed', {
      error: error.message,
      ...context,
    });
  }
};

export const submitBrandBrief = asyncHandler(async (req, res) => {
  const brandLead = await BrandLead.create(req.body);

  await Lead.create({
    type: 'brand',
    source: 'form',
    name: req.body.contactName,
    email: req.body.email,
    whatsapp: req.body.phone,
    status: 'qualified',
    notes: `Brand lead created for ${req.body.brandName}`,
  });

  // Send response IMMEDIATELY - no waiting for anything
  sendSuccess(res, 201, { brandLead }, 'Brand brief submitted successfully');

  // Process everything async (fire and forget)
  processBrandBriefNotifications(brandLead, req.body);
});

// Fire-and-forget: logs + emails (never blocks response)
const processBrandBriefNotifications = (brandLead, reqBody) => {
  // Don't await anything - truly async
  (async () => {
    // Create notification logs
    await safeCreateNotificationLog(
      {
        channel: 'email',
        recipient: reqBody.email,
        subject: `Your Campaign Brief - ${reqBody.brandName}`,
        message: 'Brand brief confirmation',
        status: 'pending',
        module: 'brand_leads',
        referenceId: brandLead._id,
      },
      { module: 'brand_leads', channel: 'email', referenceId: brandLead._id.toString() },
    );

    await safeCreateNotificationLog(
      {
        channel: 'email',
        recipient: process.env.CAMPAIGN_EMAIL || 'campaign@triplef.com',
        subject: `New Brand Brief: ${brandLead.brandName}`,
        message: 'Brand brief admin notification',
        status: 'pending',
        module: 'brand_leads_internal',
        referenceId: brandLead._id,
        metadata: {
          cc: [process.env.SUPER_ADMIN_EMAIL || 'admin@triplef.com'],
        },
      },
      { module: 'brand_leads_internal', channel: 'email', referenceId: brandLead._id.toString() },
    );

    // Send user confirmation email
    try {
      const response = await emailService.sendBrandBriefConfirmation(
        reqBody.email,
        reqBody.contactName,
        brandLead,
      );
      await NotificationLog.updateOne(
        { module: 'brand_leads', referenceId: brandLead._id, channel: 'email', recipient: reqBody.email },
        {
          $set: {
            status: response?.skipped ? 'failed' : 'sent',
            provider: response?.provider || null,
            providerMessageId: response?.id || null,
            metadata: response,
          },
        },
      );
    } catch (error) {
      logger.warn('Brand brief confirmation email failed', { email: reqBody.email, error: error.message });
      await NotificationLog.updateOne(
        { module: 'brand_leads', referenceId: brandLead._id, channel: 'email', recipient: reqBody.email },
        { $set: { status: 'failed', error: error.message } },
      );
    }

    // Send admin notification email
    try {
      const response = await emailService.notifyCampaignManager(brandLead);
      await NotificationLog.updateOne(
        { module: 'brand_leads_internal', referenceId: brandLead._id, channel: 'email' },
        {
          $set: {
            status: response?.skipped ? 'failed' : 'sent',
            provider: response?.provider || null,
            providerMessageId: response?.id || null,
            metadata: {
              cc: [process.env.SUPER_ADMIN_EMAIL || 'admin@triplef.com'],
              ...(response || {}),
            },
          },
        },
      );
    } catch (adminEmailError) {
      logger.warn('Admin email notification failed for brand brief', {
        brandLeadId: brandLead._id.toString(),
        error: adminEmailError.message,
      });
      await NotificationLog.updateOne(
        { module: 'brand_leads_internal', referenceId: brandLead._id, channel: 'email' },
        { $set: { status: 'failed', error: adminEmailError.message } },
      );
    }
  })().catch(err => logger.error('Unhandled error in brand brief notifications', err));
};
