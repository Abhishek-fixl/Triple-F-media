import mongoose from 'mongoose';

import { LEAD_SOURCES, LEAD_STATUSES, LEAD_TYPES } from '../utils/constants.js';

const calculatorInputsSchema = new mongoose.Schema(
  {
    platform: String,
    followers: Number,
    niche: String,
    frequency: String,
    engagement: String,
    city: String,
  },
  { _id: false },
);

const leadSchema = new mongoose.Schema(
  {
    type: { type: String, enum: LEAD_TYPES, required: true, index: true },
    source: { type: String, enum: LEAD_SOURCES, required: true, index: true },
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true, index: true, sparse: true },
    whatsapp: { type: String, trim: true, index: true, sparse: true },
    calculatorInputs: calculatorInputsSchema,
    estimatedEarning: { type: Number, default: 0 },
    status: { type: String, enum: LEAD_STATUSES, default: 'new', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

leadSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('Lead', leadSchema);
