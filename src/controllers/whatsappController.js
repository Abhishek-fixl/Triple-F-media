import whatsappService from '../services/whatsappService.js';
import NotificationLog from '../models/NotificationLog.js';
import { asyncHandler, sendSuccess } from '../utils/helpers.js';

export const testWhatsApp = asyncHandler(async (req, res) => {
  const result = await whatsappService.sendMessage(req.body.to, req.body.message);
  const finalStatus = result?.sid ? await whatsappService.waitForFinalStatus(result.sid) : null;
  const whatsapp = finalStatus || result;
  await NotificationLog.create({
    channel: 'whatsapp',
    recipient: req.body.to,
    message: req.body.message,
    status: whatsapp?.accepted || whatsapp?.success ? 'sent' : 'failed',
    provider: whatsapp?.provider || null,
    providerMessageId: whatsapp?.sid || whatsapp?.messageId || null,
    module: 'whatsapp_test',
    metadata: whatsapp,
  });

  sendSuccess(
    res,
    200,
    {
      whatsapp,
    },
    'WhatsApp message accepted by provider',
  );
});
