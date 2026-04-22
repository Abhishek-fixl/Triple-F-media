import mongoose from 'mongoose';

import { CREATOR_PLATFORMS, CREATOR_NICHES, CREATOR_STATUSES, AVAILABILITY_STATUSES, CONTENT_FORMATS, CONTENT_STYLES } from '../utils/constants.js';

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

    // Phase 3: Profile Fields (Part 1)
    // Profile
    avatar: { type: String },  // Cloudinary URL
    bio: { type: String, maxlength: 500 },
    memberSince: { type: Date, default: Date.now },

    // Enhanced Platform
    primaryNiche: { type: String },
    secondaryNiche: { type: String },
    followersDisplay: { type: String },  // "128K"

    // Phase 4: Availability & Stats (Part 2)
    availabilityStatus: { 
      type: String, 
      enum: AVAILABILITY_STATUSES, 
      default: 'available' 
    },
    availabilityNote: { type: String, maxlength: 200 },
    onTimeStreak: { type: Number, default: 0 },

    // Phase 5: Content Preferences (Part 3)
    contentFormats: [{ type: String, enum: CONTENT_FORMATS }],
    contentStyles: [{ type: String, enum: CONTENT_STYLES }],
    languages: [{ type: String }],  // ['Hindi', 'English']
    regions: [{ type: String }],    // ['North India', 'West India']

    // Phase 6: Audience & Portfolio (Part 4)
    // Audience Demographics
    audienceAgeGroup: { type: String },       // "18-28"
    audienceGender: { type: String },         // "Mostly Female"
    audienceTopCities: [{ type: String }],

    // Portfolio
    portfolioLinks: [{
      url: { type: String, trim: true },
      title: { type: String, trim: true },
      thumbnail: { type: String, trim: true },
      platform: { type: String, trim: true },
      addedAt: { type: Date, default: Date.now }
    }],

    // Past Collaborations
    pastCollaborations: [{
      brand: { type: String, trim: true },
      campaign: { type: String, trim: true },
      date: { type: Date },
      description: { type: String, trim: true }
    }],

    // Phase 7: Payment & KYC (Part 5)
    // Payment Settings
    paymentMethod: { type: String, enum: ['upi', 'bank'], default: 'upi' },
    bankAccount: {
      accountNumber: { type: String, trim: true },
      ifscCode: { type: String, trim: true },
      bankName: { type: String, trim: true },
      accountHolderName: { type: String, trim: true }
    },
    minimumPayout: { type: Number, default: 0 },

    // KYC
    panVerified: { type: Boolean, default: false },
    aadhaarVerified: { type: Boolean, default: false },
    platformVerified: { type: Boolean, default: false },

    // Settings
    profileVisible: { type: Boolean, default: true },

    // Phase 8: Social Links (Part 6)
    instagramUrl: { type: String, trim: true },
    youtubeUrl: { type: String, trim: true },
    linkedinUrl: { type: String, trim: true },
    twitterUrl: { type: String, trim: true },
    mojUrl: { type: String, trim: true },
    joshUrl: { type: String, trim: true }
  },
  {
    timestamps: true,
  },
);

creatorSchema.index({ platform: 1, niche: 1, status: 1 });
creatorSchema.index({ totalEarnings: -1 });
creatorSchema.index({ email: 1, status: 1 });

export default mongoose.model('Creator', creatorSchema);
