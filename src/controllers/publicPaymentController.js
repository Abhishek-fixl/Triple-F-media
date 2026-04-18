import { body } from 'express-validator';

import Campaign from '../models/Campaign.js';
import BrandLead from '../models/BrandLead.js';
import { isRazorpayConfigured } from '../config/razorpay.js';
import emailService from '../services/emailService.js';
import paymentService from '../services/paymentService.js';
import { ApiError, asyncHandler, sendSuccess } from '../utils/helpers.js';
import logger from '../utils/logger.js';

export const createOrderValidation = [
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be a number greater than 0'),
  body('currency').optional().isString().isLength({ min: 3, max: 3 }).withMessage('currency must be a 3-letter code'),
  body('notes').optional().isObject().withMessage('notes must be an object'),
];

export const createBrandPaymentOrderValidation = [
  body('campaignId').trim().notEmpty().withMessage('campaignId is required'),
];

export const createBrandPaymentOrder = asyncHandler(async (req, res) => {
  if (!isRazorpayConfigured) {
    throw new ApiError(500, 'Razorpay is not configured on the server', 'RAZORPAY_NOT_CONFIGURED');
  }

  const { campaignId } = req.body;

  const campaign = await Campaign.findById(campaignId);
  if (!campaign) {
    throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');
  }

  if (campaign.brandPaymentStatus === 'paid') {
    throw new ApiError(400, 'Campaign has already been paid for', 'CAMPAIGN_ALREADY_PAID');
  }

  const amount = campaign.budget || campaign.brandPaymentAmount || 0;
  if (amount <= 0) {
    throw new ApiError(400, 'Invalid campaign amount', 'INVALID_CAMPAIGN_AMOUNT');
  }

  const order = await paymentService.createOrder(amount, 'INR', {
    campaignId: campaign._id.toString(),
    brandName: campaign.brandName,
    campaignName: campaign.campaignName,
    source: 'brand_campaign_payment',
  });

  sendSuccess(res, 201, {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
    campaignId: campaign._id,
    campaignName: campaign.campaignName,
    brandName: campaign.brandName,
  });
});

export const verifyPaymentValidation = [
  body('orderId').optional().trim().notEmpty().withMessage('orderId is required if razorpay_order_id not provided'),
  body('paymentId').optional().trim().notEmpty().withMessage('paymentId is required if razorpay_payment_id not provided'),
  body('signature').optional().trim().notEmpty().withMessage('signature is required if razorpay_signature not provided'),
  body('razorpay_order_id').optional().trim().notEmpty(),
  body('razorpay_payment_id').optional().trim().notEmpty(),
  body('razorpay_signature').optional().trim().notEmpty(),
  body().custom((value) => {
    const hasCamelCase = value.orderId && value.paymentId && value.signature;
    const hasRazorpay = value.razorpay_order_id && value.razorpay_payment_id && value.razorpay_signature;
    const hasMixed1 = value.orderId && value.razorpay_payment_id && value.razorpay_signature;
    const hasMixed2 = value.razorpay_order_id && value.paymentId && value.signature;
    
    if (!hasCamelCase && !hasRazorpay && !hasMixed1 && !hasMixed2) {
      throw new Error('Please provide either (orderId, paymentId, signature) or (razorpay_order_id, razorpay_payment_id, razorpay_signature) or compatible mixed formats');
    }
    return true;
  }),
];

export const createOrder = asyncHandler(async (req, res) => {
  if (!isRazorpayConfigured) {
    throw new ApiError(500, 'Razorpay is not configured on the server', 'RAZORPAY_NOT_CONFIGURED');
  }

  const { amount, currency = 'INR', notes = {} } = req.body;

  const order = await paymentService.createOrder(amount, currency, {
    ...notes,
    source: 'frontend_test',
  });

  sendSuccess(res, 201, {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  if (!isRazorpayConfigured) {
    throw new ApiError(500, 'Razorpay is not configured on the server', 'RAZORPAY_NOT_CONFIGURED');
  }

  // Accept both razorpay_* and camelCase formats
  const orderId = req.body.orderId || req.body.razorpay_order_id;
  const paymentId = req.body.paymentId || req.body.razorpay_payment_id;
  const signature = req.body.signature || req.body.razorpay_signature;
  const campaignId = req.body.campaignId;

  if (!orderId || !paymentId || !signature) {
    throw new ApiError(400, 'Missing required fields: orderId/razorpay_order_id, paymentId/razorpay_payment_id, signature/razorpay_signature', 'MISSING_PAYMENT_FIELDS');
  }

  const ok = paymentService.verifyPayment(paymentId, orderId, signature);

  if (!ok) {
    throw new ApiError(400, 'Payment signature verification failed', 'PAYMENT_SIGNATURE_INVALID');
  }

  // If campaignId is provided, activate the campaign and send confirmation emails
  if (campaignId) {
    try {
      const campaign = await Campaign.findById(campaignId);
      if (campaign) {
        campaign.brandPaymentStatus = 'paid';
        campaign.brandPaymentAmount = campaign.budget;
        campaign.brandPaymentReceivedAt = new Date();
        campaign.status = 'active';
        await campaign.save();

        // Send confirmation emails
        const brandLead = campaign.brandLeadId ? await BrandLead.findById(campaign.brandLeadId) : null;
        if (brandLead && brandLead.email) {
          // Send to brand
          emailService.sendEmail(
            brandLead.email,
            `✅ Payment Received — Campaign "${campaign.campaignName}" is Now Active!`,
            `<p>Hi ${brandLead.brandName},</p><p>Your payment of <strong>₹${campaign.budget?.toLocaleString?.() || campaign.budget}</strong> has been received.</p><p>Your campaign is now <strong>ACTIVE</strong> and creators will start posting soon!</p><p>Campaign Dashboard: <a href="${process.env.FRONTEND_URL || 'https://fff-media.vercel.app'}/brand-portal/campaigns/${campaign._id}">View Campaign</a></p>`,
            `Hi ${brandLead.brandName}, Your payment of ₹${campaign.budget} has been received. Your campaign "${campaign.campaignName}" is now ACTIVE!`
          ).catch(err => logger.warn('Brand payment confirmation email failed', { error: err.message }));
        }

        // Send to admin
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@triplef.com';
        emailService.sendEmail(
          adminEmail,
          `💰 Brand Payment Received — ${campaign.campaignName}`,
          `<p>Brand payment received for campaign <strong>${campaign.campaignName}</strong>.</p><p>Brand: ${campaign.brandName}</p><p>Amount: ₹${campaign.budget?.toLocaleString?.() || campaign.budget}</p><p>Campaign is now <strong>ACTIVE</strong>.</p>`,
          `Brand payment received: ${campaign.campaignName} — ₹${campaign.budget} from ${campaign.brandName}`
        ).catch(err => logger.warn('Admin payment notification failed', { error: err.message }));

        logger.info('Campaign activated after brand payment', {
          campaignId: campaign._id.toString(),
          amount: campaign.budget,
          paymentId,
        });
      }
    } catch (campaignError) {
      logger.error('Failed to activate campaign after payment', {
        campaignId,
        error: campaignError.message,
      });
      // Don't fail the verification, just log the error
    }
  }

  sendSuccess(res, 200, { verified: true, campaignActivated: !!campaignId });
});
