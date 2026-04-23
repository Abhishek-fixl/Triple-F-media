import { Router } from 'express';
import { body } from 'express-validator';

import auth from '../middleware/auth.js';
import requireRole from '../middleware/roleCheck.js';
import validate from '../middleware/validation.js';
import {
  listBrands,
  createBrand,
  getBrand,
  updateBrand,
  patchBrandStatus,
  deleteBrand,
  addCommunication,
  addInternalNote,
  deleteInternalNote,
  getBrandCampaigns,
  getBrandLeadsForBrand,
  getBrandBilling,
} from '../controllers/brandMgmtController.js';
import { BRAND_STATUSES, USER_ROLES } from '../utils/constants.js';

const router = Router();

router.use(auth);

router.get(
  '/',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  listBrands,
);

router.post(
  '/',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  [
    body('brandName').trim().notEmpty().withMessage('Brand name is required'),
    body('contactName').trim().notEmpty().withMessage('Contact name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    validate,
  ],
  createBrand,
);

router.get(
  '/:id',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER, USER_ROLES.FINANCE_MANAGER]),
  getBrand,
);

router.put(
  '/:id',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  [
    body('email').optional().trim().isEmail().withMessage('Valid email is required'),
    validate,
  ],
  updateBrand,
);

router.patch(
  '/:id/status',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  [body('status').isIn(BRAND_STATUSES).withMessage('Invalid brand status'), validate],
  patchBrandStatus,
);

router.delete(
  '/:id',
  requireRole([USER_ROLES.SUPER_ADMIN]),
  deleteBrand,
);

// Phase 16: Relations routes
router.post(
  '/:id/communications',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  [body('type').isIn(['email', 'call', 'meeting', 'whatsapp']).withMessage('Invalid communication type'), validate],
  addCommunication,
);

router.post(
  '/:id/notes',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  [body('text').trim().notEmpty().withMessage('Note text is required'), validate],
  addInternalNote,
);

router.delete(
  '/:id/notes/:noteId',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]),
  deleteInternalNote,
);

// Phase 28: Relations
router.get('/:id/campaigns', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER, USER_ROLES.FINANCE_MANAGER]), getBrandCampaigns);
router.get('/:id/leads', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), getBrandLeadsForBrand);
router.get('/:id/billing', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE_MANAGER]), getBrandBilling);

export default router;
