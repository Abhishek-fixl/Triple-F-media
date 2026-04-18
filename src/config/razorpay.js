import Razorpay from 'razorpay';

const hasRealValue = (value) => Boolean(value) && !String(value).startsWith('your_');

export const isRazorpayConfigured =
  Boolean(process.env.RAZORPAY_KEY_ID) &&
  process.env.RAZORPAY_KEY_ID !== 'rzp_test_xxxx' &&
  hasRealValue(process.env.RAZORPAY_KEY_SECRET);

const razorpay = isRazorpayConfigured
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

export default razorpay;
