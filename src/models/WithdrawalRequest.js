import mongoose from 'mongoose';

const withdrawalRequestSchema = new mongoose.Schema(
  {
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    upiId: { type: String, required: true, trim: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'paid'], default: 'pending', index: true },
    notes: { type: String, trim: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
  },
  {
    timestamps: true,
  },
);

withdrawalRequestSchema.index({ creatorId: 1, createdAt: -1 });

export default mongoose.model('WithdrawalRequest', withdrawalRequestSchema);
