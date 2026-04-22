import mongoose from 'mongoose';

import { BRAND_LEAD_STATUSES, LEAD_PRIORITIES } from '../utils/constants.js';

const brandLeadSchema = new mongoose.Schema(
  {
    brandName: { type: String, required: true, trim: true, index: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true },
    campaignGoal: { type: String, required: true, index: true },
    targetAudience: { type: String, required: true, trim: true },
    budget: { type: String, required: true, index: true },
    timeline: { type: String, required: true, trim: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: BRAND_LEAD_STATUSES, default: 'new', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Phase 11: Contact Fields
    hasWebsite: { type: String, enum: ['Yes', 'No'] },
    website: { type: String, trim: true },
    industry: { type: String, trim: true },
    referral: { type: String, trim: true },
    services: [{ type: String, trim: true }],
    whatsapp: { type: String, trim: true },
    designation: { type: String, trim: true },
    city: { type: String, trim: true },

    // Phase 12: CRM Fields
    priority: { type: String, enum: LEAD_PRIORITIES, default: 'warm', index: true },
    followUpDate: { type: Date },
    source: {
      type: String,
      enum: ['Website Form', 'Instagram DM', 'LinkedIn', 'Referral', 'Cold Outreach'],
      default: 'Website Form',
    },

    // Conversion Tracking
    convertedCampaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' },
    convertedAt: { type: Date },
    convertedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Lost Tracking
    lostReason: { type: String, trim: true },
    lostAt: { type: Date },
    lostBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Phase 13: Interaction History
    interactions: [{
      id: { type: String },
      channel: {
        type: String,
        enum: ['Website Form', 'WhatsApp', 'Email', 'Call', 'Instagram DM', 'LinkedIn', 'Note'],
      },
      note: { type: String, trim: true, maxlength: 1000 },
      author: { type: String, trim: true },
      authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      date: { type: Date, default: Date.now },
      outcome: { type: String, enum: ['positive', 'neutral', 'negative', 'no_response'] },
    }],
    lastInteractionAt: { type: Date },
    interactionCount: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

brandLeadSchema.index({ status: 1, createdAt: -1 });
brandLeadSchema.index({ priority: 1, followUpDate: 1 });

export default mongoose.model('BrandLead', brandLeadSchema);
