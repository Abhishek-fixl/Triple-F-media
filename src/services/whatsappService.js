import axios from 'axios';

import twilioClient, { isTwilioConfigured } from '../config/twilio.js';
import logger from '../utils/logger.js';

// Cloud API Configuration
const isCloudApiEnabled = () =>
  process.env.WHATSAPP_CLOUD_ENABLED === 'true' &&
  Boolean(process.env.WHATSAPP_CLOUD_ACCESS_TOKEN) &&
  Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID) &&
  process.env.WHATSAPP_CLOUD_ACCESS_TOKEN !== 'your_permanent_token_here';

/**
 * Format phone number for Cloud API
 * Removes + and ensures proper country code
 */
const formatForCloudApi = (number) => {
  let clean = String(number || '').trim().replace(/\s+/g, '').replace(/\+/g, '');
  // Remove any existing country code prefix issues
  clean = clean.replace(/^(whatsapp:)/, '');
  // Ensure it starts with country code (default to 91 for India if not present)
  if (!/^\d{10,}$/.test(clean)) {
    // If less than 10 digits, might already have country code or be invalid
    if (clean.length < 10) {
      return null;
    }
  }
  return clean;
};

/**
 * Format number for Twilio (adds whatsapp: prefix)
 */
const normalizeWhatsapp = (number) => {
  const clean = String(number || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/(?!^\+)[^\d]/g, '');
  if (!clean) return clean;
  return clean.startsWith('whatsapp:') ? clean : `whatsapp:${clean}`;
};

/**
 * Send WhatsApp message using Meta Cloud API (primary)
 * Returns { success: boolean, provider: string, messageId: string, error: null or error }
 */
const sendViaCloudApi = async (to, message) => {
  if (!isCloudApiEnabled()) {
    return { success: false, provider: 'cloud', error: 'Cloud API disabled or not configured' };
  }

  const formattedTo = formatForCloudApi(to);
  if (!formattedTo) {
    return { success: false, provider: 'cloud', error: 'Invalid phone number format' };
  }

  const apiVersion = process.env.WHATSAPP_CLOUD_API_VERSION || 'v20.0';
  const url = `https://graph.facebook.com/${apiVersion}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  try {
    const response = await axios({
      method: 'POST',
      url,
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      data: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: 'text',
        text: { body: message },
      },
      timeout: 30000,
    });

    const messageId = response.data.messages?.[0]?.id;

    logger.info('WhatsApp message sent via Cloud API', {
      messageId,
      to: formattedTo,
    });

    return {
      success: true,
      provider: 'cloud',
      messageId,
      error: null,
      raw: response.data,
    };
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    const errorCode = error.response?.data?.error?.code;

    logger.error('Cloud API WhatsApp send failed', {
      to: formattedTo,
      error: errorMsg,
      code: errorCode,
      status: error.response?.status,
    });

    return {
      success: false,
      provider: 'cloud',
      error: errorMsg,
      errorCode,
      raw: error.response?.data,
    };
  }
};

/**
 * Send WhatsApp message using Twilio (fallback)
 * Returns { success: boolean, provider: string, messageId: string, error: null or error }
 */
const sendViaTwilio = async (to, message) => {
  if (!isTwilioConfigured || !twilioClient) {
    return { success: false, provider: 'twilio', error: 'Twilio not configured' };
  }

  const payload = {
    from: normalizeWhatsapp(process.env.TWILIO_WHATSAPP_NUMBER),
    to: normalizeWhatsapp(to),
    body: message,
  };

  try {
    const response = await twilioClient.messages.create(payload);

    logger.info('WhatsApp message sent via Twilio', {
      sid: response.sid,
      status: response.status,
      to: payload.to,
    });

    return {
      success: true,
      provider: 'twilio',
      messageId: response.sid,
      error: null,
      status: response.status,
      raw: response,
    };
  } catch (error) {
    logger.error('Twilio WhatsApp send failed', {
      to: payload.to,
      code: error.code,
      status: error.status,
      message: error.message,
    });

    return {
      success: false,
      provider: 'twilio',
      error: error.message,
      errorCode: error.code,
      raw: error,
    };
  }
};

/**
 * Main function to send WhatsApp message
 * Tries Cloud API first, falls back to Twilio
 * Returns { success: boolean, provider: string, messageId: string, sent: boolean, error: string|null }
 */
const sendMessage = async (to, message) => {
  if (!to || !message) {
    throw new Error('WhatsApp recipient and message are required');
  }

  logger.info(`📱 Sending WhatsApp to ${to}: ${message.substring(0, 50)}...`);

  // Try Cloud API first
  const cloudResult = await sendViaCloudApi(to, message);

  if (cloudResult.success) {
    logger.info(`✅ WhatsApp sent via Cloud API. Message ID: ${cloudResult.messageId}`);
    return {
      success: true,
      provider: 'cloud',
      messageId: cloudResult.messageId,
      sent: true,
      error: null,
    };
  }

  logger.warn(`⚠️ Cloud API failed: ${cloudResult.error}. Trying Twilio...`);

  // Fallback to Twilio
  const twilioResult = await sendViaTwilio(to, message);

  if (twilioResult.success) {
    logger.info(`✅ WhatsApp sent via Twilio. SID: ${twilioResult.messageId}`);
    return {
      success: true,
      provider: 'twilio',
      messageId: twilioResult.messageId,
      sent: true,
      error: null,
    };
  }

  logger.error(`❌ Both providers failed. Cloud: ${cloudResult.error}, Twilio: ${twilioResult.error}`);

  // Throw error with both failures for upstream handling
  const combinedError = new Error(
    `Cloud: ${cloudResult.error} | Twilio: ${twilioResult.error}`,
  );
  combinedError.code = 'WHATSAPP_SEND_FAILED';
  combinedError.cloudError = cloudResult.error;
  combinedError.twilioError = twilioResult.error;
  throw combinedError;
};

const getMessageStatus = async (sid) => {
  if (!sid) {
    throw new Error('Message SID is required');
  }

  // For Cloud API messages, we can't fetch status via Twilio
  // Return a mock status for Cloud API messages (wamid. prefix)
  if (sid.startsWith('wamid.')) {
    return {
      sid,
      status: 'sent',
      to: null,
      from: null,
      errorCode: null,
      errorMessage: null,
      accepted: true,
      provider: 'cloud',
    };
  }

  if (!isTwilioConfigured) {
    return { skipped: true };
  }

  const response = await twilioClient.messages(sid).fetch();
  return {
    sid: response.sid,
    status: response.status,
    to: response.to,
    from: response.from,
    errorCode: response.errorCode || null,
    errorMessage: response.errorMessage || null,
    accepted: ['queued', 'accepted', 'scheduled', 'sending', 'sent', 'delivered', 'read'].includes(
      response.status,
    ),
    raw: response,
  };
};

const waitForFinalStatus = async (sid, options = {}) => {
  const { attempts = 4, delayMs = 2500 } = options;

  // Cloud API messages don't support status polling
  if (sid?.startsWith('wamid.')) {
    return {
      sid,
      status: 'sent',
      provider: 'cloud',
    };
  }

  if (!sid || !isTwilioConfigured) {
    return null;
  }

  let latest = null;

  for (let index = 0; index < attempts; index += 1) {
    if (index > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    latest = await getMessageStatus(sid);
    if (!['queued', 'accepted', 'scheduled', 'sending'].includes(latest.status)) {
      break;
    }
  }

  return latest;
};

/**
 * Send sandbox join code (only for Twilio testing)
 * Not needed for Cloud API, but kept for compatibility
 */
const sendSandboxJoinCode = async (to, joinCode) => {
  if (isCloudApiEnabled()) {
    logger.info('Cloud API enabled — sandbox join not needed');
    return { success: true, message: 'Cloud API active, no join needed' };
  }

  return sendViaTwilio(to, `join ${joinCode}`);
};

const sendApplicationReceivedMessage = async (application) => {
  const message = `🎉 Welcome to Triple F Media, ${application.name}!\n\nYour application has been received. Our team will review it within 48 hours.\n\nApplication ID: ${application._id}\n\n— Triple F Team`;

  return sendMessage(application.whatsapp, message);
};

const sendCampaignBrief = async (creator, campaign) => {
  const message = `Hi ${creator.name}, you have been invited to the "${campaign.campaignName}" campaign for ${campaign.brandName}. Please review the brief and confirm participation.`;

  return sendMessage(creator.whatsapp, message);
};

const sendPaymentConfirmation = async (creator, amount, campaign) => {
  const message = `Hi ${creator.name}, your payment of INR ${amount} for the "${campaign.campaignName}" campaign has been processed by Triple F Media.`;

  return sendMessage(creator.whatsapp, message);
};

const sendWelcomeMessage = async (creator) => {
  const message = `Welcome to Triple F Media, ${creator.name}. Your creator profile is now approved and active.`;

  return sendMessage(creator.whatsapp, message);
};

export default {
  sendMessage,
  sendViaCloudApi,
  sendViaTwilio,
  getMessageStatus,
  waitForFinalStatus,
  sendApplicationReceivedMessage,
  sendCampaignBrief,
  sendPaymentConfirmation,
  sendWelcomeMessage,
  sendSandboxJoinCode,
};
