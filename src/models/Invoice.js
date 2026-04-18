import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, index: true },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Creator', required: true, index: true },
    creatorName: { type: String, required: true, trim: true },
    campaignName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    gst: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    total: { type: Number, required: true, min: 0 },
    pdfUrl: { type: String, required: true, trim: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

invoiceSchema.index({ creatorId: 1, createdAt: -1 });

export default mongoose.model('Invoice', invoiceSchema);
