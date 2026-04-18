import bcrypt from 'bcryptjs';

import Campaign from '../models/Campaign.js';
import CampaignCreator from '../models/CampaignCreator.js';
import Creator from '../models/Creator.js';
import Payment from '../models/Payment.js';
import WithdrawalRequest from '../models/WithdrawalRequest.js';
import { ApiError, asyncHandler, buildPagination, pick, sendSuccess, signScopedJwtToken } from '../utils/helpers.js';

export const registerCreator = asyncHandler(async (req, res) => {
  let creator = await Creator.findOne({ email: req.body.email.toLowerCase() }).select('+passwordHash');

  if (!creator) {
    creator = new Creator({
      name: req.body.name,
      email: req.body.email.toLowerCase(),
      handle: req.body.handle || req.body.name.toLowerCase().replace(/\s+/g, ''),
      platform: req.body.platform || 'instagram',
      followers: Number(req.body.followers || 0),
      niche: req.body.niche || 'other',
      city: req.body.city || 'Unknown',
      whatsapp: req.body.whatsapp,
      status: 'active',
    });
  }

  if (creator.passwordHash) throw new ApiError(409, 'Creator account already registered', 'CREATOR_EXISTS');

  creator.passwordHash = await bcrypt.hash(req.body.password, 10);
  if (req.body.upiId) creator.upiId = req.body.upiId;
  await creator.save();

  sendSuccess(res, 201, { creator: { id: creator._id, name: creator.name, email: creator.email } }, 'Creator registered successfully');
});

export const loginCreator = asyncHandler(async (req, res) => {
  const creator = await Creator.findOne({ email: req.body.email.toLowerCase() }).select('+passwordHash');
  if (!creator?.passwordHash) throw new ApiError(401, 'Invalid email or password', 'INVALID_CREATOR_CREDENTIALS');
  const ok = await bcrypt.compare(req.body.password, creator.passwordHash);
  if (!ok) throw new ApiError(401, 'Invalid email or password', 'INVALID_CREATOR_CREDENTIALS');
  creator.lastLogin = new Date();
  await creator.save();

  const token = signScopedJwtToken({ sub: creator._id.toString(), email: creator.email, scope: 'creator' });
  sendSuccess(res, 200, { token, creator: { id: creator._id, name: creator.name, email: creator.email } }, 'Creator login successful');
});

export const getCreatorDashboard = asyncHandler(async (req, res) => {
  const assignments = await CampaignCreator.find({ creatorId: req.creator._id });
  const payments = await Payment.find({ creatorId: req.creator._id });
  sendSuccess(res, 200, {
    creator: {
      id: req.creator._id,
      name: req.creator.name,
      email: req.creator.email,
      totalEarnings: req.creator.totalEarnings,
      totalCampaigns: req.creator.totalCampaigns,
    },
    stats: {
      activeCampaigns: assignments.filter((item) => ['invited', 'accepted', 'confirmed'].includes(item.status)).length,
      livePosts: assignments.filter((item) => item.postStatus === 'live').length,
      paidPayments: payments.filter((item) => item.status === 'paid').length,
    },
  });
});

export const listCreatorCampaigns = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const filter = { creatorId: req.creator._id };
  if (req.query.status) filter.status = req.query.status;

  const sort = {};
  sort[sortBy] = sortOrder;

  const [assignments, total] = await Promise.all([
    CampaignCreator.find(filter).sort(sort).skip(skip).limit(limit).populate('campaignId'),
    CampaignCreator.countDocuments(filter),
  ]);

  sendSuccess(res, 200, { campaigns: assignments, pagination: buildPagination({ page, limit, total }) });
});

export const getCreatorCampaign = asyncHandler(async (req, res) => {
  const assignment = await CampaignCreator.findOne({ creatorId: req.creator._id, campaignId: req.params.id }).populate('campaignId');
  if (!assignment) throw new ApiError(404, 'Campaign assignment not found', 'ASSIGNMENT_NOT_FOUND');
  sendSuccess(res, 200, { assignment, campaign: assignment.campaignId });
});

export const submitCreatorContent = asyncHandler(async (req, res) => {
  const assignment = await CampaignCreator.findOne({ creatorId: req.creator._id, campaignId: req.params.id });
  if (!assignment) throw new ApiError(404, 'Campaign assignment not found', 'ASSIGNMENT_NOT_FOUND');
  assignment.contentUrl = req.body.contentUrl || assignment.contentUrl;
  assignment.contentSubmittedAt = new Date();
  assignment.contentStatus = 'submitted';
  await assignment.save();
  sendSuccess(res, 200, { assignment }, 'Content submitted successfully');
});

export const updateCreatorContent = asyncHandler(async (req, res) => {
  const assignment = await CampaignCreator.findOne({ creatorId: req.creator._id, campaignId: req.params.id });
  if (!assignment) throw new ApiError(404, 'Campaign assignment not found', 'ASSIGNMENT_NOT_FOUND');
  if (assignment.contentStatus === 'approved') throw new ApiError(400, 'Approved content cannot be updated', 'CONTENT_LOCKED');
  assignment.contentUrl = req.body.contentUrl || assignment.contentUrl;
  assignment.contentStatus = 'submitted';
  await assignment.save();
  sendSuccess(res, 200, { assignment }, 'Content updated successfully');
});

export const deleteCreatorContent = asyncHandler(async (req, res) => {
  const assignment = await CampaignCreator.findOne({ creatorId: req.creator._id, campaignId: req.params.id });
  if (!assignment) throw new ApiError(404, 'Campaign assignment not found', 'ASSIGNMENT_NOT_FOUND');
  if (assignment.contentStatus === 'approved') throw new ApiError(400, 'Approved content cannot be deleted', 'CONTENT_LOCKED');
  assignment.contentUrl = null;
  assignment.contentSubmittedAt = null;
  assignment.contentStatus = 'pending';
  await assignment.save();
  sendSuccess(res, 200, { assignment }, 'Content deleted successfully');
});

export const getCreatorEarnings = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ creatorId: req.creator._id }).sort({ createdAt: -1 });
  sendSuccess(res, 200, { payments });
});

export const getCreatorProfile = asyncHandler(async (req, res) => {
  sendSuccess(res, 200, { creator: req.creator });
});

export const updateCreatorProfile = asyncHandler(async (req, res) => {
  Object.assign(req.creator, pick(req.body, ['name', 'city', 'whatsapp', 'upiId', 'panNumber', 'internalNotes']));
  await req.creator.save();
  sendSuccess(res, 200, { creator: req.creator }, 'Creator profile updated');
});

export const patchCreatorUpi = asyncHandler(async (req, res) => {
  req.creator.upiId = req.body.upiId;
  await req.creator.save();
  sendSuccess(res, 200, { creator: req.creator }, 'UPI updated successfully');
});

export const requestWithdrawal = asyncHandler(async (req, res) => {
  const request = await WithdrawalRequest.create({
    creatorId: req.creator._id,
    amount: req.body.amount,
    upiId: req.body.upiId || req.creator.upiId,
    notes: req.body.notes,
  });
  sendSuccess(res, 201, { withdrawal: request }, 'Withdrawal request created');
});

export const getCreatorPerformanceAnalytics = asyncHandler(async (req, res) => {
  const assignments = await CampaignCreator.find({ creatorId: req.creator._id });
  const completed = assignments.filter((item) => item.postStatus === 'live').length;
  const approved = assignments.filter((item) => item.contentStatus === 'approved').length;
  sendSuccess(res, 200, {
    metrics: {
      totalCampaigns: assignments.length,
      livePosts: completed,
      approvedContent: approved,
      totalEarnings: req.creator.totalEarnings,
    },
  });
});
