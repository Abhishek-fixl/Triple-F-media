import NotificationLog from '../models/NotificationLog.js';
import Payment from '../models/Payment.js';
import { asyncHandler, sendSuccess } from '../utils/helpers.js';

export const handleRazorpayWebhook = asyncHandler(async (req, res) => {
  const event = req.body.event;
  const entity = req.body.payload?.payment?.entity;

  if (event === 'payment.captured' && entity?.order_id) {
    const payment = await Payment.findOne({ razorpayOrderId: entity.order_id });
    if (payment) {
      payment.status = 'paid';
      payment.razorpayPaymentId = entity.id;
      payment.paidAt = new Date();
      await payment.save();
    }
  }

  sendSuccess(res, 200, { received: true, event }, 'Razorpay webhook processed');
});

export const handleWhatsappWebhook = asyncHandler(async (req, res) => {
  const sid = req.body.MessageSid || req.body.sid || req.body.providerMessageId;
  const status = req.body.MessageStatus || req.body.status;
  if (sid) {
    await NotificationLog.findOneAndUpdate({ providerMessageId: sid }, { status: status === 'failed' ? 'failed' : 'sent', metadata: req.body }, { new: true });
  }
  sendSuccess(res, 200, { received: true, sid, status }, 'WhatsApp webhook processed');
});

export const handleResendWebhook = asyncHandler(async (req, res) => {
  const emailId = req.body.data?.email_id || req.body.data?.id;
  const type = req.body.type || 'unknown';
  if (emailId) {
    await NotificationLog.findOneAndUpdate({ providerMessageId: emailId }, { status: type.includes('fail') ? 'failed' : 'sent', metadata: req.body }, { new: true });
  }
  sendSuccess(res, 200, { received: true, type, emailId }, 'Resend webhook processed');
});
