import { Router } from 'express';

import { handleRazorpayWebhook, handleResendWebhook, handleWhatsappWebhook } from '../controllers/webhookController.js';
import { verifyRazorpayWebhook, verifySimpleSecret } from '../middleware/webhookAuth.js';

const router = Router();

router.post('/razorpay', verifyRazorpayWebhook, handleRazorpayWebhook);
router.post('/whatsapp', verifySimpleSecret('x-webhook-secret', 'TWILIO_WEBHOOK_SECRET', 'INVALID_WHATSAPP_WEBHOOK'), handleWhatsappWebhook);
router.post('/resend', verifySimpleSecret('x-webhook-secret', 'RESEND_WEBHOOK_SECRET', 'INVALID_RESEND_WEBHOOK'), handleResendWebhook);

export default router;
