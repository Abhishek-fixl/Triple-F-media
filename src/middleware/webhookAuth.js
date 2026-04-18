import crypto from 'crypto';

import { ApiError } from '../utils/helpers.js';

export const verifyRazorpayWebhook = (req, _res, next) => {
  const signature = req.headers['x-razorpay-signature'];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret || !signature) {
    return next(new ApiError(401, 'Missing Razorpay webhook signature', 'INVALID_RAZORPAY_WEBHOOK'));
  }

  const digest = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
  if (digest !== signature) {
    return next(new ApiError(401, 'Invalid Razorpay webhook signature', 'INVALID_RAZORPAY_WEBHOOK'));
  }

  return next();
};

export const verifySimpleSecret = (headerName, envKey, code) => (req, _res, next) => {
  const headerValue = req.headers[headerName];
  const secret = process.env[envKey];

  if (!secret || headerValue !== secret) {
    return next(new ApiError(401, 'Invalid webhook signature', code));
  }

  return next();
};
