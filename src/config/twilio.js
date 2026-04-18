import twilio from 'twilio';

const hasRealValue = (value) => Boolean(value) && !String(value).startsWith('your_');

export const isTwilioConfigured =
  hasRealValue(process.env.TWILIO_ACCOUNT_SID) &&
  process.env.TWILIO_ACCOUNT_SID.startsWith('AC') &&
  hasRealValue(process.env.TWILIO_AUTH_TOKEN) &&
  process.env.TWILIO_AUTH_TOKEN !== process.env.TWILIO_ACCOUNT_SID &&
  hasRealValue(process.env.TWILIO_WHATSAPP_NUMBER);

const twilioClient = isTwilioConfigured
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

export default twilioClient;
