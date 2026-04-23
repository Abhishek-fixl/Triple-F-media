import mongoose from 'mongoose';

import { BRAND_PAYMENT_STATUSES, CAMPAIGN_STATUSES, CAMPAIGN_TYPES, CAMPAIGN_GOALS, CAMPAIGN_PLATFORMS, CAMPAIGN_PHASES } from '../utils/constants.js';

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
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', index: true },
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

    // Phase 9: Campaign Basic Fields
    // Campaign Details
    campaignGoal: { type: String, enum: CAMPAIGN_GOALS },
    platforms: [{ type: String, enum: CAMPAIGN_PLATFORMS }],
    niche: { type: String, trim: true },

    // Brief Details
    briefText: { type: String, trim: true, maxlength: 2000 },
    targetAudience: { type: String, trim: true, maxlength: 500 },
    deliverables: { type: String, trim: true, maxlength: 500 },
    contentFormat: { type: String, trim: true },

    // Brand Contact
    brandContactEmail: { type: String, trim: true, lowercase: true },
    brandContactPhone: { type: String, trim: true },

    // Internal
    notes: { type: String, trim: true, maxlength: 1000 },

    // Phase 10: Phase Tracking
    phase: { type: String, enum: CAMPAIGN_PHASES, default: 'N/A' },
    contentPending: { type: Number, default: 0 },
    shortlistReady: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

campaignSchema.index({ status: 1, timelineStart: 1 });

export default mongoose.model('Campaign', campaignSchema);
