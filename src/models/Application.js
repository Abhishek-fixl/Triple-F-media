import mongoose from 'mongoose';

import { APPLICATION_STATUSES } from '../utils/constants.js';

const applicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 18 },
    city: { type: String, required: true, trim: true },
    platform: { type: String, required: true, index: true },
    followers: { type: String, required: true, index: true },
    niche: { type: String, required: true, index: true },
    profileLink: { 
      type: String, 
      required: true, 
      trim: true, 
      validate: {
        validator: (v) => {
          return v.startsWith('http://') || v.startsWith('https://');
        },
        message: 'Valid profile link is required'
      }
    },
    whatsapp: { 
      type: String, 
      required: true, 
      trim: true, 
      validate: {
        validator: (v) => {
          return v.length > 0;
        },
        message: 'WhatsApp number is required'
      },
      index: true 
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
      index: true,
    },
    referral: { type: String, trim: true },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'pending', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    approvedAt: Date,
    rejectionType: {
      type: String,
      enum: [
        'content_quality',
        'engagement_rate_low',
        'niche_not_in_demand',
        'followers_below_5k',
        'fake_followers',
        'incomplete_application',
        'location_not_serviceable',
        'custom',
      ],
    },
    rejectionReason: { type: String, trim: true },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: Date,
    internalNotes: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

applicationSchema.index({ status: 1, createdAt: -1 });
applicationSchema.index({ platform: 1, niche: 1 });

export default mongoose.model('Application', applicationSchema);
