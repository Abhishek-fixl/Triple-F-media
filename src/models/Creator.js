import mongoose from 'mongoose';

import { CREATOR_PLATFORMS, CREATOR_NICHES, CREATOR_STATUSES } from '../utils/constants.js';

const creatorSchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, index: true, sparse: true },
    passwordHash: { type: String, select: false },
    handle: { type: String, required: true, trim: true, index: true },
    platform: { type: String, enum: CREATOR_PLATFORMS, required: true, index: true },
    followers: { type: Number, required: true, min: 0, index: true },
    followersLastUpdated: Date,
    niche: { type: String, enum: CREATOR_NICHES, required: true, index: true },
    city: { type: String, required: true, trim: true },
    engagementRate: { type: Number, default: 0, min: 0 },
    whatsapp: { type: String, required: true, trim: true, index: true },
    upiId: { type: String, trim: true },
    panNumber: { type: String, trim: true },
    totalEarnings: { type: Number, default: 0, min: 0 },
    totalCampaigns: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: CREATOR_STATUSES, default: 'active', index: true },
    tags: [{ type: String, trim: true }],
    internalNotes: { type: String, trim: true },
    lastLogin: Date,
  },
  {
    timestamps: true,
  },
);

creatorSchema.index({ platform: 1, niche: 1, status: 1 });
creatorSchema.index({ totalEarnings: -1 });
creatorSchema.index({ email: 1, status: 1 });

export default mongoose.model('Creator', creatorSchema);
