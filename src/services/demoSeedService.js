import Campaign from '../models/Campaign.js';
import CampaignCreator from '../models/CampaignCreator.js';
import Creator from '../models/Creator.js';
import logger from '../utils/logger.js';

export const ensureDemoData = async () => {
  const shouldSeed =
    process.env.SEED_DEMO_DATA === 'true' ||
    (process.env.NODE_ENV || 'development') === 'development';

  if (!shouldSeed) {
    return null;
  }

  const existingCampaigns = await Campaign.countDocuments();

  if (existingCampaigns > 0) {
    return null;
  }

  let creator = await Creator.findOne({ status: { $in: ['active', 'priority'] } }).sort({ createdAt: -1 });

  if (!creator) {
    creator = await Creator.create({
      name: 'Demo Creator',
      email: 'demo.creator@triplefmedia.com',
      handle: 'democreator',
      platform: 'instagram',
      followers: 25000,
      followersLastUpdated: new Date(),
      niche: 'beauty',
      city: 'Mumbai',
      engagementRate: 4.5,
      whatsapp: '+919999999990',
      upiId: 'demo@upi',
      totalEarnings: 0,
      totalCampaigns: 1,
      status: 'active',
      tags: ['demo', 'beauty', 'metro'],
      internalNotes: 'Auto-seeded development creator',
    });
  }

  const campaign = await Campaign.create({
    campaignName: 'Demo Glow Launch',
    brandName: 'Triple F Demo Brand',
    type: 'sponsored_post',
    budget: 75000,
    creatorCount: 1,
    status: 'active',
    timelineStart: new Date(),
    timelineEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    brandPaymentStatus: 'received',
    brandPaymentAmount: 75000,
    brandPaymentReceivedAt: new Date(),
    totalCreatorCost: 25000,
    triplefFee: 50000,
    performanceData: {
      totalReach: 125000,
      totalImpressions: 180000,
      totalEngagement: 14000,
      engagementRate: 7.8,
      linkClicks: 2200,
    },
  });

  await CampaignCreator.create({
    campaignId: campaign._id,
    creatorId: creator._id,
    creatorName: creator.name,
    amount: 25000,
    briefSent: true,
    briefSentAt: new Date(),
    status: 'accepted',
    contentStatus: 'submitted',
    contentSubmittedAt: new Date(),
    contentUrl: 'https://example.com/demo-content',
    postStatus: 'pending',
    paymentStatus: 'pending',
  });

  logger.info('Demo data seeded successfully', {
    creatorId: creator._id.toString(),
    campaignId: campaign._id.toString(),
  });

  return { creator, campaign };
};

export default { ensureDemoData };
