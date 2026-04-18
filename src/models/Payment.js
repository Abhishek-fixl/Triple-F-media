import mongoose from 'mongoose';

import { PAYMENT_STATUSES } from '../utils/constants.js';

const paymentSchema = new mongoose.Schema(
  {
    campaignCreatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'CampaignCreator', required: true, index: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true, index: true },
    creatorName: { type: String, required: true, trim: true },
    campaignName: { type: String, required: true, trim: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    upiId: { type: String, required: true, trim: true },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'pending', index: true },
    razorpayPaymentId: { type: String, trim: true },
    razorpayOrderId: { type: String, trim: true },
    tdsDeducted: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    invoiceUrl: { type: String, trim: true },
    paidAt: Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

paymentSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Payment', paymentSchema);
