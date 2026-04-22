import { Router } from 'express';
import { body, param } from 'express-validator';

import auth from '../middleware/auth.js';
import requireRole from '../middleware/roleCheck.js';
import validate from '../middleware/validation.js';
import {
  addInternalNotes,
  approveApplication,
  bulkApproveApplications,
  bulkTagCreators,
  createAdminUser,
  deleteBrandLead,
  listBrandLeads,
  updateBrandLead,
  getBrandLead,
  addBrandLeadInteraction,
  deleteBrandLeadInteraction,
  convertBrandLead,
  loseBrandLead,
  deleteAdminUser,
  deleteApplication,
  deleteCreator,
  getApplication,
  getCreator,
  getDashboard,
  listAdminUsers,
  listApplications,
  listAuditLogs,
  listCreators,
  patchCreatorStatus,
  rejectApplication,
  updateCreator,
  updateCreatorTags,
  // Phase 6
  addPortfolioLink,
  deletePortfolioLink,
  addCollaboration,
  deleteCollaboration,
} from '../controllers/adminController.js';
import { CREATOR_STATUSES, USER_ROLES } from '../utils/constants.js';
import { createAdminUserValidation } from '../validators/campaignValidator.js';

const router = Router();

router.use(auth);

router.get(
  '/dashboard',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER, USER_ROLES.FINANCE_MANAGER, USER_ROLES.ONBOARDING_SPECIALIST]),
  getDashboard,
);

router.get(
  '/applications',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ONBOARDING_SPECIALIST]),
  listApplications,
);
router.get(
  '/applications/:id',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ONBOARDING_SPECIALIST]),
  getApplication,
);
router.post(
  '/applications/bulk-approve',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ONBOARDING_SPECIALIST]),
  [body('applicationIds').isArray({ min: 1 }).withMessage('applicationIds must be a non-empty array'), validate],
  bulkApproveApplications,
);
router.post(
  '/applications/:id/approve',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ONBOARDING_SPECIALIST]),
  [
    body('handle').trim().notEmpty().withMessage('Instagram handle is required'),
    body('engagementRate').isFloat({ min: 0, max: 100 }).withMessage('Engagement rate must be between 0 and 100'),
    body('upiId').trim().notEmpty().withMessage('UPI ID is required').matches(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/).withMessage('Invalid UPI ID format (e.g., name@okhdfcbank)'),
    body('panNumber').trim().notEmpty().withMessage('PAN Number is required').matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).withMessage('Invalid PAN format (e.g., ABCDE1234F)'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('internalNotes').optional().trim(),
    validate,
  ],
  approveApplication,
);
router.post(
  '/applications/:id/reject',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ONBOARDING_SPECIALIST]),
  [
    body('rejectionType')
      .notEmpty()
      .withMessage('Rejection type is required')
      .isIn([
        'content_quality',
        'engagement_rate_low',
        'niche_not_in_demand',
        'followers_below_5k',
        'fake_followers',
        'incomplete_application',
        'location_not_serviceable',
        'custom',
      ])
      .withMessage('Invalid rejection type'),
    body('rejectionReason').optional().trim(),
    body('customReason')
      .if(body('rejectionType').equals('custom'))
      .trim()
      .notEmpty()
      .withMessage('Custom reason is required when rejection type is custom'),
    body('internalNotes').optional().trim(),
    validate,
  ],
  rejectApplication,
);
router.put(
  '/applications/:id/notes',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ONBOARDING_SPECIALIST]),
  [body('internalNotes').trim().notEmpty().withMessage('Internal notes are required'), validate],
  addInternalNotes,
);

router.delete('/applications/:id', requireRole([USER_ROLES.SUPER_ADMIN]), deleteApplication);

router.get(
  '/creators',
  requireRole([
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.CAMPAIGN_MANAGER,
    USER_ROLES.FINANCE_MANAGER,
  ]),
  listCreators,
);
router.get(
  '/creators/:id',
  requireRole([
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.CAMPAIGN_MANAGER,
    USER_ROLES.FINANCE_MANAGER,
  ]),
  getCreator,
);
router.put(
  '/creators/:id',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  [
    body('status').optional().isIn(CREATOR_STATUSES).withMessage('Invalid creator status'),
    body('followers').optional().isInt({ min: 0 }).withMessage('Followers must be valid'),
    body('engagementRate').optional().isFloat({ min: 0 }).withMessage('Engagement rate must be valid'),
    validate,
  ],
  updateCreator,
);
router.patch(
  '/creators/:id/status',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  [body('status').isIn(CREATOR_STATUSES).withMessage('Invalid creator status'), validate],
  patchCreatorStatus,
);
router.post(
  '/creators/:id/tags',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  [body('tags').isArray().withMessage('tags must be an array'), validate],
  updateCreatorTags,
);
router.post(
  '/creators/bulk-tag',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  [body('creatorIds').isArray({ min: 1 }), body('tags').isArray({ min: 1 }), validate],
  bulkTagCreators,
);
router.delete('/creators/:id', requireRole([USER_ROLES.SUPER_ADMIN]), deleteCreator);

// Phase 6: Portfolio & Collaboration routes
router.post(
  '/creators/:id/portfolio',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  [body('url').trim().notEmpty().withMessage('URL is required'), validate],
  addPortfolioLink,
);
router.delete(
  '/creators/:id/portfolio/:portfolioId',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  deletePortfolioLink,
);
router.post(
  '/creators/:id/collaborations',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  [body('brand').trim().notEmpty().withMessage('Brand name is required'), validate],
  addCollaboration,
);
router.delete(
  '/creators/:id/collaborations/:collabId',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  deleteCollaboration,
);

router.get('/audit-logs', requireRole([USER_ROLES.SUPER_ADMIN]), listAuditLogs);
router.get('/brand-leads', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), listBrandLeads);
router.get('/brand-leads/:id', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), getBrandLead);
router.put('/brand-leads/:id', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), updateBrandLead);
router.post('/brand-leads/:id/interactions', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), addBrandLeadInteraction);
router.delete('/brand-leads/:id/interactions/:interactionId', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), deleteBrandLeadInteraction);
// Phase 26: Convert & Lose
router.post('/brand-leads/:id/convert', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), convertBrandLead);
router.post('/brand-leads/:id/lose', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), loseBrandLead);
router.delete('/brand-leads/:id', requireRole([USER_ROLES.SUPER_ADMIN]), deleteBrandLead);
router.get('/users', requireRole([USER_ROLES.SUPER_ADMIN]), listAdminUsers);
router.post('/users', requireRole([USER_ROLES.SUPER_ADMIN]), createAdminUserValidation, validate, createAdminUser);
router.delete('/users/:id', requireRole([USER_ROLES.SUPER_ADMIN]), deleteAdminUser);

export default router;
