import mongoose from 'mongoose';

import { BRAND_LEAD_STATUSES } from '../utils/constants.js';

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
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

brandLeadSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('BrandLead', brandLeadSchema);
