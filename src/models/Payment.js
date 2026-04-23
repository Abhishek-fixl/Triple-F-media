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

    // Phase 14: Finance Enhancement Fields
    // References
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', index: true },

    // Creator Info (denormalized)
    niche: { type: String, trim: true },
    platform: { type: String, trim: true },

    // Brand Info (denormalized)
    brand: { type: String, trim: true },
    campaignType: { type: String, trim: true },

    // TDS
    tdsApplicable: { type: Boolean, default: true },
    tdsPercentage: { type: Number, default: 10 },

    // Approval Flow
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    approvedAt: { type: Date },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, trim: true },

    // Transaction Details
    transactionId: { type: String, trim: true },
    paymentMethod: { type: String, enum: ['Bank Transfer', 'UPI', 'Cash', 'Cheque'], default: 'UPI' },
    bankAccount: { type: String, trim: true },

    // References
    invoiceNo: { type: String, trim: true },
    postUrl: { type: String, trim: true },

    // Finance Notes
    notes: [{
      text: { type: String, trim: true },
      author: { type: String, trim: true },
      authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      time: { type: Date, default: Date.now },
    }],

    // Compliance
    form16aStatus: { type: String, enum: ['generated', 'pending', 'not_applicable'], default: 'pending' },
    form16aUrl: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ approvalStatus: 1, status: 1 });

export default mongoose.model('Payment', paymentSchema);
