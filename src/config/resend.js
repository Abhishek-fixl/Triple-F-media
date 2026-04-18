import { Resend } from 'resend';

export const isResendConfigured =
  Boolean(process.env.RESEND_API_KEY) && process.env.RESEND_API_KEY !== 're_xxxx';

const resend = isResendConfigured ? new Resend(process.env.RESEND_API_KEY) : null;

export default resend;
