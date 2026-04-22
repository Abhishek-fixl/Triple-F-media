import { Router } from 'express';
import { body } from 'express-validator';

import {
  approveCreatorContent,
  bulkSendCampaignBriefs,
  completeCampaign,
  createCampaign,
  deleteCampaign,
  getCampaignContent,
  getCampaignDetails,
  getCampaignShortlist,
  listCampaigns,
  markPostLive,
  markShortlistReady,
  patchCampaignCreatorPaymentStatus,
  patchCampaignStatus,
  requestContentRevision,
  sendCampaignBriefs,
  suggestCampaignCreators,
  updateCampaign,
} from '../controllers/campaignController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/roleCheck.js';
import upload from '../middleware/upload.js';
import validate from '../middleware/validation.js';
import { USER_ROLES } from '../utils/constants.js';
import {
  campaignFeedbackValidation,
  campaignValidation,
  markLiveValidation,
  updateCampaignValidation,
} from '../validators/campaignValidator.js';

const router = Router();

router.use(auth);

router.post(
  '/',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  upload.single('briefPdf'),
  campaignValidation,
  validate,
  createCampaign,
);
router.get('/', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), listCampaigns);
router.get('/suggest', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), suggestCampaignCreators);
router.get('/:id', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), getCampaignDetails);
router.put(
  '/:id',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  upload.single('briefPdf'),
  updateCampaignValidation,
  validate,
  updateCampaign,
);
router.patch(
  '/:id/status',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  [body('status').notEmpty().withMessage('Status is required'), validate],
  patchCampaignStatus,
);
router.delete('/:id', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), deleteCampaign);
router.post('/:id/send-briefs', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), sendCampaignBriefs);
router.post(
  '/bulk-send-briefs',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  [body('campaignIds').isArray({ min: 1 }).withMessage('campaignIds must be a non-empty array'), validate],
  bulkSendCampaignBriefs,
);
router.post(
  '/:campaignId/creators/:creatorId/approve-content',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  approveCreatorContent,
);
router.post(
  '/:campaignId/creators/:creatorId/revision-content',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  campaignFeedbackValidation,
  validate,
  requestContentRevision,
);
router.post(
  '/:campaignId/creators/:creatorId/mark-live',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  markLiveValidation,
  validate,
  markPostLive,
);
router.patch(
  '/:campaignId/creators/:creatorId/payment-status',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE_MANAGER]),
  [body('paymentStatus').notEmpty().withMessage('paymentStatus is required'), validate],
  patchCampaignCreatorPaymentStatus,
);
router.post('/:id/complete', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), completeCampaign);

// Phase 23: Content submissions
router.get('/:id/content', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), getCampaignContent);

// Phase 24: Shortlist endpoints
router.get('/:id/shortlist', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), getCampaignShortlist);
router.put('/:id/shortlist-ready', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), markShortlistReady);

export default router;
