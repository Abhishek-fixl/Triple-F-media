import Application from '../models/Application.js';
import Lead from '../models/Lead.js';
import NotificationLog from '../models/NotificationLog.js';
import calculatorService from '../services/calculatorService.js';
import emailService from '../services/emailService.js';
import whatsappService from '../services/whatsappService.js';
import logger from '../utils/logger.js';
import { ApiError, asyncHandler, sendSuccess } from '../utils/helpers.js';

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

// Helper to process notifications asynchronously
const processApplicationNotifications = async (application) => {
  // WhatsApp notification
  try {
    const whatsappResult = await whatsappService.sendApplicationReceivedMessage(application);
    await safeCreateNotificationLog(
      {
        channel: 'whatsapp',
        recipient: application.whatsapp,
        message: `Application received: ${application._id}`,
        status: whatsappResult.success || whatsappResult.sent ? 'sent' : 'failed',
        provider: whatsappResult.provider,
        providerMessageId: whatsappResult.messageId || null,
        module: 'applications',
        referenceId: application._id,
        metadata: whatsappResult,
      },
      { module: 'applications', channel: 'whatsapp', referenceId: application._id.toString() },
    );
  } catch (error) {
    logger.warn('Creator application WhatsApp notification failed', {
      applicationId: application._id.toString(),
      whatsapp: application.whatsapp,
      error: error.message,
    });
    await safeCreateNotificationLog(
      {
        channel: 'whatsapp',
        recipient: application.whatsapp,
        message: `Application received: ${application._id}`,
        status: 'failed',
        provider: error.provider || null,
        error: error.message,
        module: 'applications',
        referenceId: application._id,
      },
      { module: 'applications', channel: 'whatsapp', referenceId: application._id.toString() },
    );
  }

  // Email confirmation to creator
  try {
    const response = await emailService.sendApplicationConfirmation(
      application.email,
      application.name,
      application._id,
    );
    await safeCreateNotificationLog(
      {
        channel: 'email',
        recipient: application.email,
        subject: 'Application Received - Triple F Media',
        message: 'Application confirmation email',
        status: response?.skipped ? 'failed' : 'sent',
        provider: response?.provider || null,
        providerMessageId: response?.id || null,
        module: 'applications',
        referenceId: application._id,
        metadata: response,
      },
      { module: 'applications', channel: 'email', referenceId: application._id.toString() },
    );
  } catch (emailError) {
    logger.error('Email send failed', {
      error: emailError.message,
      to: application.email,
    });
    await safeCreateNotificationLog(
      {
        channel: 'email',
        recipient: application.email,
        subject: 'Application Received - Triple F Media',
        message: 'Application confirmation email',
        status: 'failed',
        error: emailError.message,
        module: 'applications',
        referenceId: application._id,
      },
      { module: 'applications', channel: 'email', referenceId: application._id.toString() },
    );
  }

  // Admin notification
  try {
    const response = await emailService.notifyOnboardingSpecialist(application);
    await safeCreateNotificationLog(
      {
        channel: 'email',
        recipient: process.env.ONBOARDING_EMAIL || 'onboarding@triplef.com',
        subject: `New Creator Application: ${application.name}`,
        message: 'Creator application admin notification',
        status: response?.skipped ? 'failed' : 'sent',
        provider: response?.provider || null,
        providerMessageId: response?.id || null,
        module: 'applications_internal',
        referenceId: application._id,
        metadata: {
          cc: [process.env.SUPER_ADMIN_EMAIL || 'admin@triplef.com'],
          ...(response || {}),
        },
      },
      { module: 'applications_internal', channel: 'email', referenceId: application._id.toString() },
    );
  } catch (adminEmailError) {
    logger.warn('Admin email notification failed for creator application', {
      applicationId: application._id.toString(),
      error: adminEmailError.message,
    });
    await safeCreateNotificationLog(
      {
        channel: 'email',
        recipient: process.env.ONBOARDING_EMAIL || 'onboarding@triplef.com',
        subject: `New Creator Application: ${application.name}`,
        message: 'Creator application admin notification',
        status: 'failed',
        error: adminEmailError.message,
        module: 'applications_internal',
        referenceId: application._id,
        metadata: {
          cc: [process.env.SUPER_ADMIN_EMAIL || 'admin@triplef.com'],
        },
      },
      { module: 'applications_internal', channel: 'email', referenceId: application._id.toString() },
    );
  }
};

export const applyForCreator = asyncHandler(async (req, res) => {
  const {
    name,
    age,
    city,
    platform,
    followers,
    niche,
    profileLink,
    whatsapp,
    email,
    referral,
  } = req.body;

  const existingApplication = await Application.findOne({
    $or: [{ email: email.toLowerCase() }, { whatsapp }],
    status: { $in: ['pending', 'approved', 'on_hold'] },
  }).lean();

  if (existingApplication) {
    throw new ApiError(
      409,
      'An application with this email or WhatsApp already exists',
      'DUPLICATE_APPLICATION',
    );
  }

  const application = await Application.create({
    name,
    age,
    city,
    platform,
    followers,
    niche,
    profileLink,
    whatsapp,
    email,
    referral,
  });

  await Lead.create({
    type: 'creator',
    source: referral ? 'referral' : 'form',
    name,
    email,
    whatsapp,
    status: 'qualified',
    notes: `Application submitted for ${platform}`,
  });

  // Send response immediately - don't wait for notifications
  sendSuccess(
    res,
    201,
    {
      application,
      whatsapp: { attempted: true, sent: false, async: true },
      email: { attempted: true, sent: false, async: true },
    },
    'Application submitted successfully',
  );

  // Process notifications asynchronously (fire and forget)
  processApplicationNotifications(application);
});

export const calculateEarnings = asyncHandler(async (req, res) => {
  const calculation = calculatorService.calculate(req.query);

  await Lead.create({
    type: 'creator',
    source: 'calculator',
    name: req.query.name,
    email: req.query.email,
    whatsapp: req.query.whatsapp,
    calculatorInputs: {
      platform: req.query.platform,
      followers: Number(req.query.followers || 0),
      niche: req.query.niche,
      frequency: req.query.frequency,
      engagement: req.query.engagement,
      city: req.query.city,
    },
    estimatedEarning: calculation.estimatedBase,
  });

  sendSuccess(res, 200, calculation);
});
