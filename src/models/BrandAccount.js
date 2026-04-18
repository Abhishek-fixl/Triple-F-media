import mongoose from 'mongoose';

const brandAccountSchema = new mongoose.Schema(
  {
    brandName: { type: String, required: true, trim: true, index: true },
    contactName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    phone: { type: String, trim: true },
    companyWebsite: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    lastLogin: Date,
  },
  {
    timestamps: true,
  },
);

brandAccountSchema.index({ brandName: 1, isActive: 1 });

export default mongoose.model('BrandAccount', brandAccountSchema);
