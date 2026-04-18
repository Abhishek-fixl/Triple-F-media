import mongoose from 'mongoose';

const chatLogSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    userType: {
      type: String,
      enum: ['creator', 'brand', 'unknown'],
      default: 'unknown',
      index: true,
    },
    userMessage: {
      type: String,
      required: true,
      trim: true,
    },
    aiResponse: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false,
  },
);

chatLogSchema.index({ sessionId: 1, timestamp: -1 });

export default mongoose.model('ChatLog', chatLogSchema);
