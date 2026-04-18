import BrandLead from '../models/BrandLead.js';
import Campaign from '../models/Campaign.js';
import Creator from '../models/Creator.js';
import Payment from '../models/Payment.js';
import { asyncHandler, sendSuccess } from '../utils/helpers.js';

export const getAnalyticsOverview = asyncHandler(async (_req, res) => {
  const [creators, campaigns, payments, brands] = await Promise.all([
    Creator.countDocuments(),
    Campaign.countDocuments(),
    Payment.aggregate([{ $group: { _id: null, total: { $sum: '$netAmount' } } }]),
    BrandLead.countDocuments(),
  ]);
  sendSuccess(res, 200, {
    creators,
    campaigns,
    totalPayouts: payments[0]?.total || 0,
    brands,
  });
});

export const getCreatorAnalytics = asyncHandler(async (_req, res) => {
  const creators = await Creator.find().sort({ createdAt: -1 }).limit(20);
  sendSuccess(res, 200, { creators });
});

export const getCampaignAnalytics = asyncHandler(async (_req, res) => {
  const campaigns = await Campaign.find().sort({ createdAt: -1 }).limit(50);
  sendSuccess(res, 200, { campaigns });
});

export const getRevenueAnalytics = asyncHandler(async (_req, res) => {
  const revenue = await Campaign.aggregate([
    {
      $group: {
        _id: { $substrBytes: [{ $toString: '$createdAt' }, 0, 7] },
        totalBudget: { $sum: '$budget' },
        totalBrandPayments: { $sum: '$brandPaymentAmount' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  sendSuccess(res, 200, { revenue });
});

export const getTopCreators = asyncHandler(async (_req, res) => {
  const creators = await Creator.find().sort({ totalEarnings: -1, followers: -1 }).limit(10);
  sendSuccess(res, 200, { creators });
});

export const getTopBrands = asyncHandler(async (_req, res) => {
  const brands = await Campaign.aggregate([
    { $group: { _id: '$brandName', totalSpend: { $sum: '$budget' }, campaigns: { $sum: 1 } } },
    { $sort: { totalSpend: -1 } },
    { $limit: 10 },
  ]);
  sendSuccess(res, 200, { brands });
});
