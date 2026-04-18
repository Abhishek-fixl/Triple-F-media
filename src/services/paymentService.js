import crypto from 'crypto';

import razorpay, { isRazorpayConfigured } from '../config/razorpay.js';

const createOrder = async (amount, currency = 'INR', notes = {}) => {
  const amountInPaise = Math.round(Number(amount) * 100);

  if (!isRazorpayConfigured) {
    return {
      id: `manual_order_${crypto.randomUUID()}`,
      amount: amountInPaise,
      currency,
      notes,
      provider: 'manual',
    };
  }

  return razorpay.orders.create({
    amount: amountInPaise,
    currency,
    notes,
  });
};

const verifyPayment = (paymentId, orderId, signature) => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    return false;
  }

  const generated = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generated === signature;
};

const createUpiPayment = async (upiId, amount, notes = {}) => {
  const order = await createOrder(amount, 'INR', { upiId, ...notes });

  return {
    upiId,
    amount,
    orderId: order.id,
    provider: order.provider || 'razorpay',
    status: 'processing',
  };
};

export default {
  createOrder,
  verifyPayment,
  createUpiPayment,
};
