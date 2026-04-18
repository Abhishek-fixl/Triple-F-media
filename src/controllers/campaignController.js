import Campaign from '../models/Campaign.js';
import CampaignCreator from '../models/CampaignCreator.js';
import Creator from '../models/Creator.js';
import BrandLead from '../models/BrandLead.js';
import cloudinaryService from '../services/cloudinaryService.js';
import emailService from '../services/emailService.js';
import pdfService from '../services/pdfService.js';
import whatsappService from '../services/whatsappService.js';
import logger from '../utils/logger.js';
import {
  ApiError,
  asyncHandler,
  buildPagination,
  createAuditLog,
  pick,
  sendSuccess,
} from '../utils/helpers.js';

const allowedCampaignFields = [
  'campaignName',
  'brandName',
  'brandLeadId',
  'type',
  'budget',
  'creatorCount',
  'status',
  'timelineStart',
  'timelineEnd',
  'brandPaymentStatus',
  'brandPaymentAmount',
  'brandPaymentReceivedAt',
  'totalCreatorCost',
  'triplefFee',
  'performanceData',
];

export const createCampaign = asyncHandler(async (req, res) => {
  const payload = pick(req.body, allowedCampaignFields);
  const creatorsPayload =
    typeof req.body.creators === 'string' ? JSON.parse(req.body.creators) : req.body.creators;

  if (req.file) {
    const uploadResult = await cloudinaryService.uploadFile(
      req.file.buffer,
      'triplef/briefs',
      `${Date.now()}-${req.file.originalname}`,
      req.file.mimetype,
    );
    payload.briefPdfUrl = uploadResult.url;
  }

  const campaign = await Campaign.create(payload);

  if (payload.brandLeadId) {
    await BrandLead.findByIdAndUpdate(payload.brandLeadId, { status: 'converted' });
  }

  if (Array.isArray(creatorsPayload) && creatorsPayload.length) {
    const campaignCreators = await Promise.all(
      creatorsPayload.map(async (item) => {
        const creator = await Creator.findById(item.creatorId);
        if (!creator) {
          throw new ApiError(404, `Creator not found: ${item.creatorId}`, 'CREATOR_NOT_FOUND');
        }

        return CampaignCreator.create({
          campaignId: campaign._id,
          creatorId: creator._id,
          creatorName: creator.name,
          amount: item.amount,
          status: 'invited',
        });
      }),
    );

    campaign.totalCreatorCost = campaignCreators.reduce((sum, item) => sum + item.amount, 0);
    campaign.triplefFee = Math.max(campaign.budget - campaign.totalCreatorCost, 0);
    await campaign.save();
  }

  await createAuditLog({
    req,
    user: req.user,
    action: 'create_campaign',
    module: 'campaigns',
    recordId: campaign._id,
    details: { campaignName: campaign.campaignName },
  });

  // Send campaign creation email to brand if brandLeadId exists
  if (payload.brandLeadId) {
    try {
      const brandLead = await BrandLead.findById(payload.brandLeadId);
      if (brandLead && brandLead.email) {
        // Get creator details for the proposal email
        const campaignCreators = await CampaignCreator.find({ campaignId: campaign._id }).populate('creatorId');
        const creators = campaignCreators.map((cc) => ({
          name: cc.creatorName,
          handle: cc.creatorId?.handle || '',
          platform: cc.creatorId?.platform || 'instagram',
          followers: cc.creatorId?.followers || 0,
          engagementRate: cc.creatorId?.engagementRate || 0,
          amount: cc.amount,
        }));

        // Generate payment link using Razorpay
        const frontendUrl = process.env.FRONTEND_URL || 'https://fff-media.vercel.app';
        const paymentLink = `${frontendUrl}/brand-portal/pay/${campaign._id}`;

        // Send proposal email with creator details and payment link
        await emailService.sendProposalEmail(
          brandLead.email,
          brandLead.brandName,
          campaign.campaignName,
          campaign._id,
          campaign.budget,
          creators,
          paymentLink,
        );
        logger.info('Campaign proposal email sent to brand', {
          campaignId: campaign._id.toString(),
          brandEmail: brandLead.email,
          creatorCount: creators.length,
        });
      }
    } catch (emailError) {
      logger.warn('Campaign proposal email failed', {
        campaignId: campaign._id.toString(),
        error: emailError.message,
      });
    }
  }

  sendSuccess(res, 201, { campaign }, 'Campaign created successfully');
});

export const listCampaigns = asyncHandler(async (req, res) => {
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 10);
  const skip = (page - 1) * limit;
  const filter = {};

  if (req.query.status) filter.status = req.query.status;
  if (req.query.brandName) filter.brandName = new RegExp(req.query.brandName, 'i');

  const [campaigns, total] = await Promise.all([
    Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Campaign.countDocuments(filter),
  ]);

  sendSuccess(res, 200, {
    campaigns,
    pagination: buildPagination({ page, limit, total }),
  });
});

export const suggestCampaignCreators = asyncHandler(async (req, res) => {
  const filter = { status: { $in: ['active', 'priority'] } };
  if (req.query.niche) filter.niche = req.query.niche;
  if (req.query.city) filter.city = new RegExp(req.query.city, 'i');
  if (req.query.minEngagement) filter.engagementRate = { $gte: Number(req.query.minEngagement) };
  if (req.query.minFollowers || req.query.maxFollowers) {
    filter.followers = {};
    if (req.query.minFollowers) filter.followers.$gte = Number(req.query.minFollowers);
    if (req.query.maxFollowers) filter.followers.$lte = Number(req.query.maxFollowers);
  }
  const creators = await Creator.find(filter).sort({ engagementRate: -1, followers: -1 }).limit(20);
  sendSuccess(res, 200, { creators });
});

export const getCampaignDetails = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');

  const campaignCreators = await CampaignCreator.find({ campaignId: campaign._id }).populate('creatorId paymentId');

  sendSuccess(res, 200, { campaign, campaignCreators });
});

export const updateCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');

  Object.assign(campaign, pick(req.body, allowedCampaignFields));

  if (req.file) {
    const uploadResult = await cloudinaryService.uploadFile(
      req.file.buffer,
      'triplef/briefs',
      `${Date.now()}-${req.file.originalname}`,
      req.file.mimetype,
    );
    campaign.briefPdfUrl = uploadResult.url;
  }

  const creatorsPayload =
    typeof req.body.creators === 'string' ? JSON.parse(req.body.creators) : req.body.creators;
  if (Array.isArray(creatorsPayload)) {
    await CampaignCreator.deleteMany({ campaignId: campaign._id });
    const assignments = await Promise.all(
      creatorsPayload.map(async (item) => {
        const creator = await Creator.findById(item.creatorId);
        if (!creator) {
          throw new ApiError(404, `Creator not found: ${item.creatorId}`, 'CREATOR_NOT_FOUND');
        }

        return CampaignCreator.create({
          campaignId: campaign._id,
          creatorId: creator._id,
          creatorName: creator.name,
          amount: item.amount,
          status: 'invited',
        });
      }),
    );

    campaign.totalCreatorCost = assignments.reduce((sum, item) => sum + item.amount, 0);
    campaign.triplefFee = Math.max(campaign.budget - campaign.totalCreatorCost, 0);
  }

  await campaign.save();

  await createAuditLog({
    req,
    user: req.user,
    action: 'update_campaign',
    module: 'campaigns',
    recordId: campaign._id,
    details: { updatedFields: Object.keys(req.body) },
  });

  sendSuccess(res, 200, { campaign }, 'Campaign updated successfully');
});

export const sendCampaignBriefs = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');

  const assignments = await CampaignCreator.find({ campaignId: campaign._id }).populate('creatorId');
  await Promise.all(
    assignments.map(async (assignment) => {
      try {
        await whatsappService.sendCampaignBrief(assignment.creatorId, campaign);
      } catch (error) {
        logger.warn('Campaign brief WhatsApp failed', {
          campaignId: campaign._id.toString(),
          creatorId: assignment.creatorId?._id?.toString(),
          whatsapp: assignment.creatorId?.whatsapp,
          error: error.message,
        });
      }
      assignment.briefSent = true;
      assignment.briefSentAt = new Date();
      await assignment.save();
    }),
  );

  await createAuditLog({
    req,
    user: req.user,
    action: 'send_campaign_briefs',
    module: 'campaigns',
    recordId: campaign._id,
    details: { creatorCount: assignments.length },
  });

  sendSuccess(res, 200, { count: assignments.length }, 'Campaign briefs sent successfully');
});

const getCampaignAssignment = async (campaignId, creatorId) => {
  const assignment = await CampaignCreator.findOne({ campaignId, creatorId }).populate('creatorId campaignId');
  if (!assignment) throw new ApiError(404, 'Campaign creator assignment not found', 'ASSIGNMENT_NOT_FOUND');
  return assignment;
};

export const approveCreatorContent = asyncHandler(async (req, res) => {
  const assignment = await getCampaignAssignment(req.params.campaignId, req.params.creatorId);
  assignment.contentStatus = 'approved';
  assignment.approvedAt = new Date();
  assignment.reviewFeedback = req.body.feedback || '';
  await assignment.save();

  try {
    await whatsappService.sendMessage(
      assignment.creatorId.whatsapp,
      `✅ Content approved! Your content for the "${assignment.campaignId.campaignName}" campaign has been approved. You can now post it.`,
    );
  } catch (error) {
    logger.warn('WhatsApp content approval notification failed', { assignmentId: assignment._id, error: error.message });
  }

  sendSuccess(res, 200, { assignment }, 'Creator content approved');
});

export const requestContentRevision = asyncHandler(async (req, res) => {
  const assignment = await getCampaignAssignment(req.params.campaignId, req.params.creatorId);
  assignment.contentStatus = 'revision_requested';
  assignment.reviewFeedback = req.body.feedback;
  await assignment.save();

  try {
    await whatsappService.sendMessage(
      assignment.creatorId.whatsapp,
      `🔄 Revision requested for your content in the "${assignment.campaignId.campaignName}" campaign.\n\nFeedback: ${req.body.feedback}\n\nPlease make the required changes and resubmit.`,
    );
  } catch (error) {
    logger.warn('WhatsApp revision request notification failed', { assignmentId: assignment._id, error: error.message });
  }

  sendSuccess(res, 200, { assignment }, 'Revision requested successfully');
});

export const markPostLive = asyncHandler(async (req, res) => {
  const assignment = await getCampaignAssignment(req.params.campaignId, req.params.creatorId);
  assignment.postStatus = 'live';
  assignment.liveAt = new Date();
  assignment.postUrl = req.body.postUrl || assignment.postUrl;
  assignment.paymentStatus = 'pending';
  await assignment.save();

  sendSuccess(res, 200, { assignment }, 'Post marked live');
});

export const completeCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');

  campaign.status = 'completed';
  campaign.completedAt = new Date();
  await campaign.save();

  const assignments = await CampaignCreator.find({ campaignId: campaign._id });
  const report = await pdfService.generateReport(campaign, assignments, campaign.performanceData);
  const brandLead = campaign.brandLeadId ? await BrandLead.findById(campaign.brandLeadId) : null;

  if (brandLead) {
    try {
      await emailService.sendReport(brandLead, campaign, report.url);
    } catch (error) {
      logger.warn('Campaign report email failed', { campaignId: campaign._id.toString(), error: error.message });
    }
  }

  sendSuccess(res, 200, { campaign, reportUrl: report.url }, 'Campaign marked as completed');
});

export const patchCampaignStatus = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');
  campaign.status = req.body.status;
  await campaign.save();
  sendSuccess(res, 200, { campaign }, 'Campaign status updated');
});

export const deleteCampaign = asyncHandler(async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) throw new ApiError(404, 'Campaign not found', 'CAMPAIGN_NOT_FOUND');
  if (campaign.status !== 'draft') throw new ApiError(400, 'Only draft campaigns can be deleted', 'CAMPAIGN_DELETE_NOT_ALLOWED');
  await CampaignCreator.deleteMany({ campaignId: campaign._id });
  await campaign.deleteOne();
  sendSuccess(res, 200, { id: req.params.id }, 'Campaign deleted successfully');
});

export const bulkSendCampaignBriefs = asyncHandler(async (req, res) => {
  const results = [];
  for (const campaignId of req.body.campaignIds || []) {
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) continue;
    const assignments = await CampaignCreator.find({ campaignId }).populate('creatorId');
    for (const assignment of assignments) {
      try {
        await whatsappService.sendCampaignBrief(assignment.creatorId, campaign);
        assignment.briefSent = true;
        assignment.briefSentAt = new Date();
        await assignment.save();
      } catch (error) {
        logger.warn('Bulk brief send failed', { campaignId, creatorId: assignment.creatorId?._id?.toString(), error: error.message });
      }
    }
    results.push({ campaignId, count: assignments.length });
  }
  sendSuccess(res, 200, { results }, 'Bulk brief send completed');
});

export const patchCampaignCreatorPaymentStatus = asyncHandler(async (req, res) => {
  const assignment = await CampaignCreator.findOne({ campaignId: req.params.campaignId, creatorId: req.params.creatorId });
  if (!assignment) throw new ApiError(404, 'Campaign creator assignment not found', 'ASSIGNMENT_NOT_FOUND');
  assignment.paymentStatus = req.body.paymentStatus;
  if (req.body.paymentStatus === 'paid') assignment.paidAt = new Date();
  await assignment.save();
  sendSuccess(res, 200, { assignment }, 'Payment status updated');
});
