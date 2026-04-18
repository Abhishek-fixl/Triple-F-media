import bcrypt from 'bcryptjs';

import BrandAccount from '../models/BrandAccount.js';
import BrandLead from '../models/BrandLead.js';
import Campaign from '../models/Campaign.js';
import CampaignCreator from '../models/CampaignCreator.js';
import Creator from '../models/Creator.js';
import Invoice from '../models/Invoice.js';
import { ApiError, asyncHandler, buildPagination, sendSuccess, signScopedJwtToken } from '../utils/helpers.js';

export const registerBrand = asyncHandler(async (req, res) => {
  const existing = await BrandAccount.findOne({ email: req.body.email.toLowerCase() });
  if (existing) throw new ApiError(409, 'Brand account already exists', 'BRAND_EXISTS');

  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const brand = await BrandAccount.create({
    brandName: req.body.brandName,
    contactName: req.body.contactName,
    email: req.body.email.toLowerCase(),
    passwordHash,
    phone: req.body.phone,
    companyWebsite: req.body.companyWebsite,
  });

  sendSuccess(res, 201, { brand: { id: brand._id, brandName: brand.brandName, email: brand.email } }, 'Brand registered successfully');
});

export const loginBrand = asyncHandler(async (req, res) => {
  const brand = await BrandAccount.findOne({ email: req.body.email.toLowerCase() }).select('+passwordHash');
  if (!brand || !brand.isActive) throw new ApiError(401, 'Invalid email or password', 'INVALID_BRAND_CREDENTIALS');

  const ok = await bcrypt.compare(req.body.password, brand.passwordHash);
  if (!ok) throw new ApiError(401, 'Invalid email or password', 'INVALID_BRAND_CREDENTIALS');

  brand.lastLogin = new Date();
  await brand.save();

  const token = signScopedJwtToken({ sub: brand._id.toString(), email: brand.email, scope: 'brand' });
  sendSuccess(res, 200, { token, brand: { id: brand._id, brandName: brand.brandName, email: brand.email } }, 'Brand login successful');
});

export const getBrandDashboard = asyncHandler(async (req, res) => {
  const campaigns = await Campaign.find({ brandName: req.brand.brandName });
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === 'active').length;
  const completedCampaigns = campaigns.filter((campaign) => campaign.status === 'completed').length;
  const totalBudget = campaigns.reduce((sum, campaign) => sum + (campaign.budget || 0), 0);

  sendSuccess(res, 200, {
    brand: { id: req.brand._id, brandName: req.brand.brandName, email: req.brand.email },
    stats: { activeCampaigns, completedCampaigns, totalBudget, totalCampaigns: campaigns.length },
  });
});

export const listBrandCampaigns = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const filter = { brandName: req.brand.brandName };
  if (req.query.status) filter.status = req.query.status;

  const sort = {};
  sort[sortBy] = sortOrder;

  const [campaigns, total] = await Promise.all([
    Campaign.find(filter).sort(sort).skip(skip).limit(limit),
    Campaign.countDocuments(filter),
  ]);

  sendSuccess(res, 200, { campaigns, pagination: buildPagination({ page, limit, total }) });
});

export const getBrandCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findOne({ _id: req.params.id, brandName: req.brand.brandName });
  if (!campaign) throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');
  const assignments = await CampaignCreator.find({ campaignId: campaign._id });
  sendSuccess(res, 200, { campaign, assignments });
});

export const getBrandCampaignPerformance = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findOne({ _id: req.params.id, brandName: req.brand.brandName });
  if (!campaign) throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');
  const assignments = await CampaignCreator.find({ campaignId: campaign._id });
  sendSuccess(res, 200, { performance: campaign.performanceData, creators: assignments });
});

export const submitBrandBriefAuthenticated = asyncHandler(async (req, res) => {
  const brandLead = await BrandLead.create({
    brandName: req.brand.brandName,
    contactName: req.brand.contactName,
    email: req.brand.email,
    phone: req.brand.phone || req.body.phone || '',
    campaignGoal: req.body.campaignGoal,
    targetAudience: req.body.targetAudience,
    budget: req.body.budget,
    timeline: req.body.timeline,
    notes: req.body.notes,
    status: 'new',
  });

  sendSuccess(res, 201, { brandLead }, 'Brand brief submitted successfully');
});

export const listBrandInvoices = asyncHandler(async (req, res) => {
  const campaigns = await Campaign.find({ brandName: req.brand.brandName }).select('_id campaignName brandPaymentAmount status');
  const invoices = campaigns.map((campaign) => ({
    campaignId: campaign._id,
    campaignName: campaign.campaignName,
    amount: campaign.brandPaymentAmount || campaign.budget || 0,
    status: campaign.status,
  }));
  sendSuccess(res, 200, { invoices });
});

export const shortlistCreators = asyncHandler(async (req, res) => {
  const filter = { status: { $in: ['active', 'priority'] } };
  if (req.query.niche) filter.niche = req.query.niche;
  if (req.query.city) filter.city = new RegExp(req.query.city, 'i');
  if (req.query.minFollowers || req.query.maxFollowers) {
    filter.followers = {};
    if (req.query.minFollowers) filter.followers.$gte = Number(req.query.minFollowers);
    if (req.query.maxFollowers) filter.followers.$lte = Number(req.query.maxFollowers);
  }
  if (req.query.minEngagement) filter.engagementRate = { $gte: Number(req.query.minEngagement) };

  const creators = await Creator.find(filter).sort({ engagementRate: -1, followers: -1 }).limit(20);
  sendSuccess(res, 200, { creators });
});

export const patchBrandCampaignStatus = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findOne({ _id: req.params.id, brandName: req.brand.brandName });
  if (!campaign) throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');
  campaign.status = req.body.status;
  await campaign.save();
  sendSuccess(res, 200, { campaign }, 'Brand campaign status updated');
});

export const getBrandAnalytics = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findOne({ _id: req.params.id, brandName: req.brand.brandName });
  if (!campaign) throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');
  const roi = campaign.brandPaymentAmount ? Number(((campaign.performanceData?.linkClicks || 0) / campaign.brandPaymentAmount).toFixed(4)) : 0;
  sendSuccess(res, 200, { campaignId: campaign._id, performance: campaign.performanceData, roi });
});
