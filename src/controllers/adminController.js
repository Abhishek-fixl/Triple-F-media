import bcrypt from 'bcryptjs';

import Application from '../models/Application.js';
import AuditLog from '../models/AuditLog.js';
import BrandLead from '../models/BrandLead.js';
import Campaign from '../models/Campaign.js';
import CampaignCreator from '../models/CampaignCreator.js';
import Creator from '../models/Creator.js';
import Lead from '../models/Lead.js';
import NotificationLog from '../models/NotificationLog.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import emailService from '../services/emailService.js';
import whatsappService from '../services/whatsappService.js';
import logger from '../utils/logger.js';
import {
  ApiError,
  asyncHandler,
  buildPagination,
  createAuditLog,
  parseFollowerBucketToNumber,
  pick,
  sanitizeUser,
  sendSuccess,
} from '../utils/helpers.js';

const allowedCreatorFields = [
  'name',
  'handle',
  'platform',
  'followers',
  'followersLastUpdated',
  'niche',
  'city',
  'engagementRate',
  'whatsapp',
  'upiId',
  'panNumber',
  'status',
  'internalNotes',
  // Phase 3
  'bio',
  'primaryNiche',
  'secondaryNiche',
  // Phase 4
  'availabilityStatus',
  'availabilityNote',
  'onTimeStreak',
  // Phase 5
  'contentFormats',
  'contentStyles',
  'languages',
  'regions',
  // Phase 6
  'audienceAgeGroup',
  'audienceGender',
  'audienceTopCities',
  'portfolioLinks',
  'pastCollaborations',
  // Phase 7
  'paymentMethod',
  'bankAccount',
  'minimumPayout',
  'panVerified',
  'aadhaarVerified',
  'platformVerified',
  'profileVisible',
  // Phase 8
  'instagramUrl',
  'youtubeUrl',
  'linkedinUrl',
  'twitterUrl',
  'mojUrl',
  'joshUrl',
];

export const listApplications = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const skip = (page - 1) * limit;
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.platform) filter.platform = req.query.platform;
  if (req.query.niche) filter.niche = req.query.niche;

  const [applications, total] = await Promise.all([
    Application.find(filter).populate('reviewedBy', 'name email role').sort({ createdAt: -1 }).skip(skip).limit(limit),
    Application.countDocuments(filter),
  ]);

  sendSuccess(res, 200, {
    applications,
    pagination: buildPagination({ page, limit, total }),
  });
});

export const getApplication = asyncHandler(async (req, res) => {
  // Phase 20: populate both reviewedBy and rejectedBy
  const application = await Application.findById(req.params.id)
    .populate('reviewedBy', 'name email role')
    .populate('rejectedBy', 'name email role');

  if (!application) throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');

  // Format WhatsApp number for click-to-chat link
  const whatsappNumber = application.whatsapp?.replace(/\D/g, '');
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : null;

  // Phase 20: computed reviewTime (minutes between submission and review)
  let reviewTime = null;
  if (application.reviewedAt && application.createdAt) {
    const diffMs = new Date(application.reviewedAt) - new Date(application.createdAt);
    reviewTime = Math.round(diffMs / 60000); // minutes
  }

  // Phase 20: if approved, fetch linked creator info
  let creatorInfo = null;
  if (application.status === 'approved') {
    const creator = await Creator.findOne({ applicationId: application._id })
      .select('_id name handle platform status totalEarnings totalCampaigns memberSince');
    if (creator) {
      creatorInfo = {
        creatorId:      creator._id,
        name:           creator.name,
        handle:         creator.handle,
        platform:       creator.platform,
        status:         creator.status,
        totalEarnings:  creator.totalEarnings,
        totalCampaigns: creator.totalCampaigns,
        memberSince:    creator.memberSince,
      };
    }
  }

  sendSuccess(res, 200, {
    application,
    whatsappLink,
    reviewTime,   // minutes, null if not yet reviewed
    creatorInfo,  // null if not approved or creator not found
  });
});

export const approveApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  if (application.status === 'approved') {
    throw new ApiError(400, 'Application is already approved', 'APPLICATION_ALREADY_APPROVED');
  }

  application.status = 'approved';
  application.reviewedBy = req.user._id;
  application.reviewedAt = new Date();
  application.approvedAt = new Date();
  application.internalNotes = req.body.internalNotes || application.internalNotes;
  await application.save();

  let creator = await Creator.findOne({ applicationId: application._id });
  if (!creator) {
    creator = await Creator.create({
        applicationId: application._id,
        name: application.name,
        email: application.email,
        handle: req.body.handle || application.name.toLowerCase().replace(/\s+/g, ''),
      platform: application.platform,
      followers: parseFollowerBucketToNumber(application.followers),
      followersDisplay: application.followers,  // Store original format e.g., "10K-50K"
      followersLastUpdated: new Date(),
      niche: application.niche,
      primaryNiche: application.niche,  // Set primary niche from application
      city: application.city,
      whatsapp: application.whatsapp,
      upiId: req.body.upiId,
      panNumber: req.body.panNumber,
      engagementRate: Number(req.body.engagementRate || 0),
      status: 'active',
      tags: req.body.tags || [],
      internalNotes: req.body.internalNotes,
      // Phase 3: Profile Fields
      bio: application.bio,  // From application (Phase 2)
      memberSince: new Date(),  // Set join date when approved
    });
  }

  sendSuccess(res, 200, { application, creator }, 'Application approved successfully');

  // Send notifications asynchronously (fire and forget)
  (async () => {
    try {
      await whatsappService.sendWelcomeMessage(creator);
    } catch (error) {
      logger.warn('Creator approved but welcome WhatsApp failed', {
        creatorId: creator._id.toString(),
        whatsapp: creator.whatsapp,
        error: error.message,
      });
    }

    try {
      const response = await emailService.sendCreatorApprovalEmail(
        application.email,
        application.name,
        creator._id,
        creator.handle,
      );
      await NotificationLog.create({
        channel: 'email',
        recipient: application.email,
        subject: 'Welcome to Triple F Media — Your Profile is Approved! 🎉',
        message: 'Creator approval welcome email with Creator ID and handle',
        status: response?.skipped ? 'failed' : 'sent',
        provider: response?.provider || null,
        providerMessageId: response?.id || null,
        module: 'applications',
        referenceId: application._id,
        metadata: response,
      });
    } catch (error) {
      await NotificationLog.create({
        channel: 'email',
        recipient: application.email,
        subject: 'Welcome to Triple F Media — Your Profile is Approved! 🎉',
        message: 'Creator approval welcome email',
        status: 'failed',
        error: error.message,
        module: 'applications',
        referenceId: application._id,
      });
    }
  })();
});

export const rejectApplication = asyncHandler(async (req, res) => {
  const { rejectionType, rejectionReason, customReason, internalNotes } = req.body;

  // Validate rejection type
  const validRejectionTypes = [
    'content_quality',
    'engagement_rate_low',
    'niche_not_in_demand',
    'followers_below_5k',
    'fake_followers',
    'incomplete_application',
    'location_not_serviceable',
    'custom',
  ];

  if (!rejectionType || !validRejectionTypes.includes(rejectionType)) {
    throw new ApiError(400, 'Valid rejection type is required', 'INVALID_REJECTION_TYPE');
  }

  // Validate custom reason if type is custom
  if (rejectionType === 'custom' && (!customReason || !customReason.trim())) {
    throw new ApiError(400, 'Custom reason is required when rejection type is custom', 'MISSING_CUSTOM_REASON');
  }

  const application = await Application.findById(req.params.id);
  if (!application) throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');

  // Determine final rejection reason
  const finalReason = rejectionType === 'custom' ? customReason.trim() : rejectionReason;

  application.status = 'rejected';
  application.reviewedBy = req.user._id;
  application.reviewedAt = new Date();
  application.rejectedBy = req.user._id;
  application.rejectedAt = new Date();
  application.rejectionType = rejectionType;
  application.rejectionReason = finalReason;
  application.internalNotes = internalNotes || application.internalNotes;
  await application.save();

  await createAuditLog({
    req,
    user: req.user,
    action: 'reject_application',
    module: 'applications',
    recordId: application._id,
    details: { rejectionType, rejectionReason: finalReason },
  });

  sendSuccess(res, 200, { application }, 'Application rejected successfully');

  // Send rejection email asynchronously (fire and forget)
  if (application.email) {
    (async () => {
      try {
        const response = await emailService.sendCreatorRejectionEmail(
          application.email,
          application.name,
          finalReason,
          rejectionType,
        );
        await NotificationLog.create({
          channel: 'email',
          recipient: application.email,
          subject: 'Regarding Your Triple F Media Application',
          message: 'Creator application rejection email with reason',
          status: response?.skipped ? 'failed' : 'sent',
          provider: response?.provider || null,
          providerMessageId: response?.id || null,
          module: 'applications',
          referenceId: application._id,
        });
      } catch (error) {
        await NotificationLog.create({
          channel: 'email',
          recipient: application.email,
          subject: 'Regarding Your Triple F Media Application',
          message: 'Application rejection email',
          status: 'failed',
          error: error.message,
          module: 'applications',
          referenceId: application._id,
        });
      }
    })();
  }
});

export const addInternalNotes = asyncHandler(async (req, res) => {
  const { internalNotes } = req.body;
  
  const application = await Application.findById(req.params.id);
  if (!application) throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  
  application.internalNotes = internalNotes;
  await application.save();
  
  await createAuditLog({
    req,
    user: req.user,
    action: 'add_internal_notes',
    module: 'applications',
    recordId: application._id,
    details: { internalNotes },
  });
  
  sendSuccess(res, 200, { application }, 'Internal notes added successfully');
});

export const listCreators = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.platform) filter.platform = req.query.platform;
  if (req.query.niche) filter.niche = req.query.niche;
  if (req.query.city) filter.city = new RegExp(req.query.city, 'i');
  if (req.query.tags) filter.tags = { $in: String(req.query.tags).split(',').map((item) => item.trim()) };

  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const skip = (page - 1) * limit;
  const sort = {};
  if (req.query.sortBy === 'followers') sort.followers = req.query.order === 'asc' ? 1 : -1;
  else if (req.query.sortBy === 'engagementRate') sort.engagementRate = req.query.order === 'asc' ? 1 : -1;
  else if (req.query.sortBy === 'earnings') sort.totalEarnings = req.query.order === 'asc' ? 1 : -1;
  else sort.createdAt = -1;

  const [creators, total] = await Promise.all([
    Creator.find(filter).sort(sort).skip(skip).limit(limit),
    Creator.countDocuments(filter),
  ]);
  sendSuccess(res, 200, { creators, pagination: buildPagination({ page, limit, total }) });
});

export const getCreator = asyncHandler(async (req, res) => {
  const creator = await Creator.findById(req.params.id)
    .populate('applicationId', 'name bio contentType avgLikes avgComments referral createdAt');
  if (!creator) throw new ApiError(404, 'Creator not found', 'CREATOR_NOT_FOUND');

  // Phase 21: Computed stats from CampaignCreator + Payment
  const [activeCampaigns, completedCampaigns, pendingPayments] = await Promise.all([
    CampaignCreator.countDocuments({
      creatorId: creator._id,
      status: { $in: ['invited', 'accepted', 'confirmed'] },
    }),
    CampaignCreator.countDocuments({
      creatorId: creator._id,
      contentStatus: 'approved',
    }),
    Payment.countDocuments({
      creatorId: creator._id,
      status: { $in: ['pending', 'processing'] },
    }),
  ]);

  sendSuccess(res, 200, {
    creator,
    computedStats: {
      activeCampaigns,
      completedCampaigns,
      pendingPayments,
    },
  });
});

export const updateCreator = asyncHandler(async (req, res) => {
  const creator = await Creator.findById(req.params.id);
  if (!creator) throw new ApiError(404, 'Creator not found', 'CREATOR_NOT_FOUND');

  Object.assign(creator, pick(req.body, allowedCreatorFields));
  await creator.save();

  await createAuditLog({
    req,
    user: req.user,
    action: 'update_creator',
    module: 'creators',
    recordId: creator._id,
    details: { updatedFields: Object.keys(req.body) },
  });

  sendSuccess(res, 200, { creator }, 'Creator updated successfully');
});

export const updateCreatorTags = asyncHandler(async (req, res) => {
  const creator = await Creator.findById(req.params.id);
  if (!creator) throw new ApiError(404, 'Creator not found', 'CREATOR_NOT_FOUND');

  const tags = Array.isArray(req.body.tags) ? req.body.tags : [];
  creator.tags = [...new Set(tags.map((tag) => String(tag).trim()).filter(Boolean))];
  await creator.save();

  await createAuditLog({
    req,
    user: req.user,
    action: 'update_creator_tags',
    module: 'creators',
    recordId: creator._id,
    details: { tags: creator.tags },
  });

  sendSuccess(res, 200, { creator }, 'Creator tags updated successfully');
});

export const deleteApplication = asyncHandler(async (req, res) => {
  const application = await Application.findById(req.params.id);
  if (!application) throw new ApiError(404, 'Application not found', 'APPLICATION_NOT_FOUND');
  if (application.status !== 'rejected') {
    throw new ApiError(400, 'Only rejected applications can be deleted', 'APPLICATION_DELETE_NOT_ALLOWED');
  }
  await application.deleteOne();
  sendSuccess(res, 200, { id: req.params.id }, 'Application deleted successfully');
});

export const deleteCreator = asyncHandler(async (req, res) => {
  const creator = await Creator.findById(req.params.id);
  if (!creator) throw new ApiError(404, 'Creator not found', 'CREATOR_NOT_FOUND');
  creator.status = 'inactive';
  await creator.save();
  sendSuccess(res, 200, { creator }, 'Creator deactivated successfully');
});

export const patchCreatorStatus = asyncHandler(async (req, res) => {
  const creator = await Creator.findById(req.params.id);
  if (!creator) throw new ApiError(404, 'Creator not found', 'CREATOR_NOT_FOUND');
  creator.status = req.body.status;
  await creator.save();
  sendSuccess(res, 200, { creator }, 'Creator status updated');
});

export const bulkApproveApplications = asyncHandler(async (req, res) => {
  const approved = [];
  for (const id of req.body.applicationIds || []) {
    const application = await Application.findById(id);
    if (!application || application.status === 'approved') continue;
    application.status = 'approved';
    application.reviewedBy = req.user._id;
    application.reviewedAt = new Date();
    await application.save();
    const existingCreator = await Creator.findOne({ applicationId: application._id });
    const creator =
      existingCreator ||
      (await Creator.create({
        applicationId: application._id,
        name: application.name,
        email: application.email,
        handle: application.name.toLowerCase().replace(/\s+/g, ''),
        platform: application.platform,
        followers: parseFollowerBucketToNumber(application.followers),
        followersLastUpdated: new Date(),
        niche: application.niche,
        city: application.city,
        whatsapp: application.whatsapp,
      }));
    approved.push({ applicationId: application._id, creatorId: creator._id });
  }
  sendSuccess(res, 200, { approved }, 'Applications approved successfully');
});

export const bulkTagCreators = asyncHandler(async (req, res) => {
  const creators = await Creator.find({ _id: { $in: req.body.creatorIds || [] } });
  for (const creator of creators) {
    creator.tags = [...new Set([...(creator.tags || []), ...((req.body.tags || []).map((tag) => String(tag).trim()))])];
    await creator.save();
  }
  sendSuccess(res, 200, { updated: creators.length }, 'Creator tags updated in bulk');
});

export const deleteAdminUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'Admin user not found', 'USER_NOT_FOUND');
  await user.deleteOne();
  sendSuccess(res, 200, { id: req.params.id }, 'Admin user deleted successfully');
});

export const deleteBrandLead = asyncHandler(async (req, res) => {
  const brandLead = await BrandLead.findById(req.params.id);
  if (!brandLead) throw new ApiError(404, 'Brand lead not found', 'BRAND_LEAD_NOT_FOUND');
  await brandLead.deleteOne();
  sendSuccess(res, 200, { id: req.params.id }, 'Brand lead deleted successfully');
});

export const listBrandLeads = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const skip = (page - 1) * limit;
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.priority) filter.priority = req.query.priority;

  const [brandLeads, total] = await Promise.all([
    BrandLead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    BrandLead.countDocuments(filter),
  ]);

  sendSuccess(res, 200, { brandLeads, pagination: buildPagination({ page, limit, total }) });
});

export const updateBrandLead = asyncHandler(async (req, res) => {
  const brandLead = await BrandLead.findById(req.params.id);
  if (!brandLead) throw new ApiError(404, 'Brand lead not found', 'BRAND_LEAD_NOT_FOUND');

  // Phase 26: Status progression guard — no going back, terminal states locked
  if (req.body.status && req.body.status !== brandLead.status) {
    const PIPELINE_ORDER = ['new', 'contacted', 'qualified', 'proposal_sent', 'converted', 'lost'];
    const currentIdx = PIPELINE_ORDER.indexOf(brandLead.status);
    const newIdx = PIPELINE_ORDER.indexOf(req.body.status);

    // Block if current status is terminal
    if (['converted', 'lost'].includes(brandLead.status)) {
      throw new ApiError(400, `Cannot change status of a ${brandLead.status} lead`, 'INVALID_STATUS_TRANSITION');
    }
    // Block backward movement
    if (newIdx !== -1 && newIdx < currentIdx) {
      throw new ApiError(400, `Cannot move lead back from '${brandLead.status}' to '${req.body.status}'`, 'INVALID_STATUS_TRANSITION');
    }
  }

  const allowed = [
    'status', 'priority', 'followUpDate', 'assignedTo', 'notes',
    'convertedCampaignId', 'convertedAt', 'convertedBy',
    'lostReason', 'lostAt', 'lostBy', 'source',
  ];
  allowed.forEach(f => { if (req.body[f] !== undefined) brandLead[f] = req.body[f]; });

  // Auto-set timestamps on status change
  if (req.body.status === 'converted' && !brandLead.convertedAt) {
    brandLead.convertedAt = new Date();
    brandLead.convertedBy = req.user._id;
  }
  if (req.body.status === 'lost' && !brandLead.lostAt) {
    brandLead.lostAt = new Date();
    brandLead.lostBy = req.user._id;
  }

  await brandLead.save();

  await createAuditLog({
    req,
    user: req.user,
    action: 'update_brand_lead',
    module: 'brand_leads',
    recordId: brandLead._id,
    details: { updatedFields: Object.keys(req.body) },
  });

  sendSuccess(res, 200, { brandLead }, 'Brand lead updated successfully');
});

// Phase 13: Get single brand lead with interactions
export const getBrandLead = asyncHandler(async (req, res) => {
  const brandLead = await BrandLead.findById(req.params.id)
    .populate('assignedTo', 'name email role')
    .populate('convertedCampaignId', 'campaignName brandName');
  if (!brandLead) throw new ApiError(404, 'Brand lead not found', 'BRAND_LEAD_NOT_FOUND');
  sendSuccess(res, 200, { brandLead });
});

// Phase 13: Add interaction to brand lead
export const addBrandLeadInteraction = asyncHandler(async (req, res) => {
  const brandLead = await BrandLead.findById(req.params.id);
  if (!brandLead) throw new ApiError(404, 'Brand lead not found', 'BRAND_LEAD_NOT_FOUND');

  const { channel, note, outcome } = req.body;
  if (!note?.trim()) throw new ApiError(400, 'Note is required', 'VALIDATION_ERROR');

  const interaction = {
    id: `int_${Date.now()}`,
    channel: channel || 'Note',
    note: note.trim(),
    author: req.user.name,
    authorId: req.user._id,
    date: new Date(),
    outcome: outcome || 'neutral',
  };

  brandLead.interactions.push(interaction);
  brandLead.lastInteractionAt = new Date();
  brandLead.interactionCount = brandLead.interactions.length;
  await brandLead.save();

  sendSuccess(res, 201, { interaction, interactions: brandLead.interactions }, 'Interaction added');
});

// Phase 13: Delete interaction from brand lead
export const deleteBrandLeadInteraction = asyncHandler(async (req, res) => {
  const brandLead = await BrandLead.findById(req.params.id);
  if (!brandLead) throw new ApiError(404, 'Brand lead not found', 'BRAND_LEAD_NOT_FOUND');

  const idx = brandLead.interactions.findIndex(
    i => i.id === req.params.interactionId || i._id?.toString() === req.params.interactionId
  );
  if (idx === -1) throw new ApiError(404, 'Interaction not found', 'NOT_FOUND');

  brandLead.interactions.splice(idx, 1);
  brandLead.interactionCount = brandLead.interactions.length;
  await brandLead.save();

  sendSuccess(res, 200, { interactions: brandLead.interactions }, 'Interaction deleted');
});

// Phase 26: Convert lead to campaign
export const convertBrandLead = asyncHandler(async (req, res) => {
  const brandLead = await BrandLead.findById(req.params.id);
  if (!brandLead) throw new ApiError(404, 'Brand lead not found', 'BRAND_LEAD_NOT_FOUND');

  if (brandLead.status === 'lost') throw new ApiError(400, 'Cannot convert a lost lead', 'INVALID_STATUS');
  if (brandLead.status === 'converted') throw new ApiError(400, 'Lead is already converted', 'INVALID_STATUS');

  const { campaignId, notes } = req.body;

  brandLead.status = 'converted';
  brandLead.convertedAt = new Date();
  brandLead.convertedBy = req.user._id;
  if (campaignId) brandLead.convertedCampaignId = campaignId;

  // Add system interaction
  brandLead.interactions.push({
    id: `int_${Date.now()}`,
    channel: 'Note',
    note: notes ? `Converted to campaign. Notes: ${notes}` : 'Lead converted to campaign.',
    author: req.user.name,
    authorId: req.user._id,
    date: new Date(),
    outcome: 'positive',
  });
  brandLead.lastInteractionAt = new Date();
  brandLead.interactionCount = brandLead.interactions.length;

  await brandLead.save();

  await createAuditLog({
    req,
    user: req.user,
    action: 'convert_brand_lead',
    module: 'brand_leads',
    recordId: brandLead._id,
    details: { campaignId, notes },
  });

  // Re-fetch with populated fields for response
  const populated = await BrandLead.findById(brandLead._id)
    .populate('assignedTo', 'name email role')
    .populate('convertedCampaignId', 'campaignName brandName');

  sendSuccess(res, 200, { brandLead: populated }, 'Lead converted successfully');
});

// Phase 26: Mark lead as lost
export const loseBrandLead = asyncHandler(async (req, res) => {
  const brandLead = await BrandLead.findById(req.params.id);
  if (!brandLead) throw new ApiError(404, 'Brand lead not found', 'BRAND_LEAD_NOT_FOUND');

  if (brandLead.status === 'converted') throw new ApiError(400, 'Cannot lose a converted lead', 'INVALID_STATUS');
  if (brandLead.status === 'lost') throw new ApiError(400, 'Lead is already marked as lost', 'INVALID_STATUS');

  const { reason, notes } = req.body;
  if (!reason?.trim()) throw new ApiError(400, 'Reason is required', 'VALIDATION_ERROR');

  brandLead.status = 'lost';
  brandLead.lostReason = reason.trim();
  brandLead.lostAt = new Date();
  brandLead.lostBy = req.user._id;
  // Schedule re-engage in 90 days
  brandLead.followUpDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  // Add system interaction
  brandLead.interactions.push({
    id: `int_${Date.now()}`,
    channel: 'Note',
    note: notes ? `Marked as lost. Reason: ${reason}. Notes: ${notes}` : `Marked as lost. Reason: ${reason}`,
    author: req.user.name,
    authorId: req.user._id,
    date: new Date(),
    outcome: 'negative',
  });
  brandLead.lastInteractionAt = new Date();
  brandLead.interactionCount = brandLead.interactions.length;

  await brandLead.save();

  await createAuditLog({
    req,
    user: req.user,
    action: 'lose_brand_lead',
    module: 'brand_leads',
    recordId: brandLead._id,
    details: { reason, notes },
  });

  sendSuccess(res, 200, { brandLead }, 'Lead marked as lost');
});

// Phase 6: Portfolio Endpoints
export const addPortfolioLink = asyncHandler(async (req, res) => {
  const creator = await Creator.findById(req.params.id);
  if (!creator) throw new ApiError(404, 'Creator not found', 'CREATOR_NOT_FOUND');

  const { url, title, thumbnail, platform } = req.body;
  if (!url) throw new ApiError(400, 'URL is required', 'VALIDATION_ERROR');

  creator.portfolioLinks.push({ url, title, thumbnail, platform, addedAt: new Date() });
  await creator.save();

  sendSuccess(res, 201, { portfolioLinks: creator.portfolioLinks }, 'Portfolio link added');
});

export const deletePortfolioLink = asyncHandler(async (req, res) => {
  const creator = await Creator.findById(req.params.id);
  if (!creator) throw new ApiError(404, 'Creator not found', 'CREATOR_NOT_FOUND');

  const linkIndex = creator.portfolioLinks.findIndex(
    (l) => l._id.toString() === req.params.portfolioId
  );
  if (linkIndex === -1) throw new ApiError(404, 'Portfolio link not found', 'NOT_FOUND');

  creator.portfolioLinks.splice(linkIndex, 1);
  await creator.save();

  sendSuccess(res, 200, { portfolioLinks: creator.portfolioLinks }, 'Portfolio link removed');
});

export const addCollaboration = asyncHandler(async (req, res) => {
  const creator = await Creator.findById(req.params.id);
  if (!creator) throw new ApiError(404, 'Creator not found', 'CREATOR_NOT_FOUND');

  const { brand, campaign, date, description } = req.body;
  if (!brand) throw new ApiError(400, 'Brand name is required', 'VALIDATION_ERROR');

  creator.pastCollaborations.push({ brand, campaign, date, description });
  await creator.save();

  sendSuccess(res, 201, { pastCollaborations: creator.pastCollaborations }, 'Collaboration added');
});

export const deleteCollaboration = asyncHandler(async (req, res) => {
  const creator = await Creator.findById(req.params.id);
  if (!creator) throw new ApiError(404, 'Creator not found', 'CREATOR_NOT_FOUND');

  const collabIndex = creator.pastCollaborations.findIndex(
    (c) => c._id.toString() === req.params.collabId
  );
  if (collabIndex === -1) throw new ApiError(404, 'Collaboration not found', 'NOT_FOUND');

  creator.pastCollaborations.splice(collabIndex, 1);
  await creator.save();

  sendSuccess(res, 200, { pastCollaborations: creator.pastCollaborations }, 'Collaboration removed');
});

export const getDashboard = asyncHandler(async (req, res) => {
  const [
    applicationCounts,
    creatorCounts,
    campaignCounts,
    paymentCounts,
    leadCounts,
    totalRevenue,
  ] = await Promise.all([
    Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Creator.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Campaign.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Payment.aggregate([{ $group: { _id: '$status', amount: { $sum: '$netAmount' }, count: { $sum: 1 } } }]),
    Lead.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Campaign.aggregate([{ $group: { _id: null, totalBudget: { $sum: '$budget' } } }]),
  ]);

  const roleView = {
    role: req.user.role,
    applications: applicationCounts,
    creators: creatorCounts,
    campaigns: campaignCounts,
    payments: paymentCounts,
    leads: leadCounts,
    totalRevenue: totalRevenue[0]?.totalBudget || 0,
  };

  if (req.user.role === 'super_admin') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    roleView.activeCreators = await Creator.countDocuments({ status: { $in: ['active', 'priority'] } });
    roleView.campaignsThisMonth = await Campaign.countDocuments({ createdAt: { $gte: startOfMonth } });
    roleView.totalEarningsThisMonth = await Payment.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$netAmount' } } },
    ]);

    roleView.topEarnersThisMonth = await Creator.find({ status: { $in: ['active', 'priority'] } })
      .sort({ totalEarnings: -1 })
      .limit(5)
      .select('name totalEarnings profileImage');

    roleView.recentActivity = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name email role');
  }

  if (req.user.role === 'finance_manager') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const pendingPayments = await Payment.aggregate([
      { $match: { status: { $in: ['pending', 'processing'] } } },
      { $group: { _id: null, total: { $sum: '$netAmount' }, count: { $sum: 1 } } },
    ]);

    const paidThisMonth = await Payment.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$netAmount' }, count: { $sum: 1 } } },
    ]);

    roleView.pendingPaymentsCount = pendingPayments[0]?.count || 0;
    roleView.pendingPaymentsAmount = pendingPayments[0]?.total || 0;
    roleView.totalPaidThisMonth = paidThisMonth[0]?.total || 0;
    roleView.paidThisMonthCount = paidThisMonth[0]?.count || 0;
  }

  if (req.user.role === 'campaign_manager') {
    roleView.activeCampaigns = await Campaign.countDocuments({ status: 'active' });
    roleView.pendingReview = await CampaignCreator.countDocuments({ contentStatus: 'under_review' });
    roleView.livePosts = await CampaignCreator.countDocuments({ contentStatus: 'live' });
    roleView.newBrandLeads = await BrandLead.countDocuments({ status: 'new' });
  }

  if (req.user.role === 'onboarding_specialist') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    roleView.newApplicationsToday = await Application.countDocuments({
      status: 'pending',
      createdAt: { $gte: today },
    });
    roleView.approvedThisWeek = await Application.countDocuments({
      status: 'approved',
      approvedAt: { $gte: startOfWeek },
    });
    roleView.pendingApplications = await Application.countDocuments({ status: 'pending' });
    roleView.openLeads = await Lead.countDocuments({ status: { $in: ['new', 'contacted', 'qualified'] } });
  }

  sendSuccess(res, 200, roleView);
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const filter = {};
  if (req.query.action) filter.action = req.query.action;
  if (req.query.module) filter.module = req.query.module;
  if (req.query.userId) filter.userId = req.query.userId;

  const sort = {};
  sort[sortBy] = sortOrder;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort(sort).skip(skip).limit(limit).populate('userId', 'name email role'),
    AuditLog.countDocuments(filter),
  ]);

  sendSuccess(res, 200, { logs, pagination: buildPagination({ page, limit, total }) });
});

export const listAdminUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;
  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const sort = {};
  sort[sortBy] = sortOrder;

  const [users, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  sendSuccess(res, 200, {
    users: users.map((user) => sanitizeUser(user)),
    pagination: buildPagination({ page, limit, total }),
  });
});

export const createAdminUser = asyncHandler(async (req, res) => {
  const existingUser = await User.findOne({ email: req.body.email.toLowerCase() });
  if (existingUser) {
    throw new ApiError(409, 'User already exists with this email', 'USER_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(req.body.password, 10);
  const user = await User.create({
    name: req.body.name,
    email: req.body.email.toLowerCase(),
    passwordHash,
    role: req.body.role,
    isActive: req.body.isActive ?? true,
  });

  await createAuditLog({
    req,
    user: req.user,
    action: 'create_admin_user',
    module: 'users',
    recordId: user._id,
    details: { email: user.email, role: user.role },
  });

  sendSuccess(res, 201, { user: sanitizeUser(user) }, 'Admin user created successfully');
});
