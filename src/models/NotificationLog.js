import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ['whatsapp', 'email'], required: true, index: true },
    recipient: { type: String, required: true, trim: true, index: true },
    subject: { type: String, trim: true },
    message: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending', index: true },
    provider: { type: String, trim: true },
    providerMessageId: { type: String, trim: true, index: true, sparse: true },
    error: { type: String, trim: true },
    module: { type: String, trim: true, index: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  },
);

notificationLogSchema.index({ status: 1, channel: 1, createdAt: -1 });

export default mongoose.model('NotificationLog', notificationLogSchema);
