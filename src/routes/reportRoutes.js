import { Router } from 'express';

import { generateCampaignReport } from '../controllers/reportController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/roleCheck.js';
import { USER_ROLES } from '../utils/constants.js';

const router = Router();

router.use(auth);
router.get(
  '/campaign/:campaignId',
  requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER, USER_ROLES.FINANCE_MANAGER]),
  generateCampaignReport,
);

export default router;
