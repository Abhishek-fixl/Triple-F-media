import mongoose from 'mongoose';

import { BRAND_STATUSES } from '../utils/constants.js';

const brandSchema = new mongoose.Schema(
  {
    // Identity
    brandId: { type: String, unique: true, index: true },
    brandName: { type: String, required: true, trim: true, index: true },
    legalName: { type: String, trim: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true },
    whatsapp: { type: String, trim: true },
    website: { type: String, trim: true },

    // Business Details
    industry: { type: String, trim: true },
    city: { type: String, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },

    // Campaign Preferences
    preferredNiches: [{ type: String, trim: true }],
    preferredFormats: [{ type: String, trim: true }],
    preferredCampaignTypes: [{ type: String, trim: true }],
    targetAgeGroup: { type: String, trim: true },
    targetGender: { type: String, trim: true },
    targetCities: [{ type: String, trim: true }],
    budgetRangeMin: { type: Number, min: 0 },
    budgetRangeMax: { type: Number, min: 0 },

    // Billing
    gstin: { type: String, trim: true },
    pan: { type: String, trim: true },
    billingContactName: { type: String, trim: true },
    billingContactEmail: { type: String, trim: true, lowercase: true },

    // Status & Metrics
    status: { type: String, enum: BRAND_STATUSES, default: 'lead', index: true },
    healthScore: { type: Number, default: 100, min: 0, max: 100 },
    totalCampaigns: { type: Number, default: 0, min: 0 },
    activeCampaigns: { type: Number, default: 0, min: 0 },
    totalSpend: { type: Number, default: 0, min: 0 },
    joinedDate: { type: Date, default: Date.now },

    // Assignment
    accountManager: {
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Tags
    tags: [{ type: String, trim: true }],
    repeatClient: { type: Boolean, default: false },

    // Phase 16: Relations
    communications: [{
      type: { type: String, enum: ['email', 'call', 'meeting', 'whatsapp'], required: true },
      direction: { type: String, enum: ['inbound', 'outbound'], default: 'outbound' },
      subject: { type: String, trim: true },
      content: { type: String, trim: true, maxlength: 2000 },
      author: { type: String, trim: true },
      authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      date: { type: Date, default: Date.now },
    }],

    internalNotes: [{
      text: { type: String, required: true, trim: true },
      author: { type: String, trim: true },
      authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      date: { type: Date, default: Date.now },
      pinned: { type: Boolean, default: false },
    }],

    activityLog: [{
      action: { type: String, trim: true },
      description: { type: String, trim: true },
      by: { type: String, trim: true },
      byId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      at: { type: Date, default: Date.now },
    }],
  },
  {
    timestamps: true,
  },
);

// Auto-generate brandId before save
brandSchema.pre('save', function (next) {
  if (!this.brandId) {
    this.brandId = `brand_${Date.now()}`;
  }
  next();
});

brandSchema.index({ status: 1, industry: 1 });
brandSchema.index({ totalSpend: -1 });
brandSchema.index({ healthScore: -1 });

export default mongoose.model('Brand', brandSchema);
