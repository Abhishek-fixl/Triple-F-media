import mongoose from 'mongoose';

import { BRAND_PAYMENT_STATUSES, CAMPAIGN_STATUSES, CAMPAIGN_TYPES } from '../utils/constants.js';

const performanceSchema = new mongoose.Schema(
  {
    totalReach: { type: Number, default: 0 },
    totalImpressions: { type: Number, default: 0 },
    totalEngagement: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
    linkClicks: { type: Number, default: 0 },
  },
  { _id: false },
);

const campaignSchema = new mongoose.Schema(
  {
    campaignName: { type: String, required: true, trim: true, index: true },
    brandName: { type: String, required: true, trim: true, index: true },
    brandLeadId: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandLead', index: true },
    type: { type: String, enum: CAMPAIGN_TYPES, required: true, index: true },
    budget: { type: Number, required: true, min: 0 },
    creatorCount: { type: Number, required: true, min: 1 },
    briefPdfUrl: { type: String, trim: true },
    status: { type: String, enum: CAMPAIGN_STATUSES, default: 'draft', index: true },
    timelineStart: Date,
    timelineEnd: Date,
    brandPaymentStatus: { type: String, enum: BRAND_PAYMENT_STATUSES, default: 'pending', index: true },
    brandPaymentAmount: { type: Number, default: 0 },
    brandPaymentReceivedAt: Date,
    totalCreatorCost: { type: Number, default: 0 },
    triplefFee: { type: Number, default: 0 },
    performanceData: { type: performanceSchema, default: () => ({}) },
    completedAt: Date,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

campaignSchema.index({ status: 1, timelineStart: 1 });

export default mongoose.model('Campaign', campaignSchema);
