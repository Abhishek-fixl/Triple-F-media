import mongoose from 'mongoose';

const chatLeadSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      sparse: true,
    },
    whatsapp: {
      type: String,
      trim: true,
      index: true,
      sparse: true,
    },
    userType: {
      type: String,
      enum: ['creator', 'brand', 'unknown'],
      default: 'unknown',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    capturedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    converted: {
      type: Boolean,
      default: false,
      index: true,
    },
    convertedAt: Date,
  },
  {
    timestamps: false,
  },
);

chatLeadSchema.index({ userType: 1, capturedAt: -1 });

export default mongoose.model('ChatLead', chatLeadSchema);
