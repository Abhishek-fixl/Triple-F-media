import mongoose from 'mongoose';

import {
  CAMPAIGN_CREATOR_STATUSES,
  CONTENT_STATUSES,
  PAYMENT_STATUSES,
  POST_STATUSES,
} from '../utils/constants.js';

const campaignCreatorSchema = new mongoose.Schema(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true, index: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true, index: true },
    creatorName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    briefSent: { type: Boolean, default: false },
    briefSentAt: Date,
    status: { type: String, enum: CAMPAIGN_CREATOR_STATUSES, default: 'invited', index: true },
    contentStatus: { type: String, enum: CONTENT_STATUSES, default: 'pending', index: true },
    contentSubmittedAt: Date,
    contentUrl: { type: String, trim: true },
    reviewFeedback: { type: String, trim: true },
    approvedAt: Date,
    postStatus: { type: String, enum: POST_STATUSES, default: 'pending', index: true },
    postUrl: { type: String, trim: true },
    liveAt: Date,
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'pending', index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    paidAt: Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

campaignCreatorSchema.index({ campaignId: 1, creatorId: 1 }, { unique: true });
campaignCreatorSchema.index({ campaignId: 1, paymentStatus: 1 });

export default mongoose.model('CampaignCreator', campaignCreatorSchema);
