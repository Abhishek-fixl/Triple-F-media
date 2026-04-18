import { Router } from 'express';

import {
  getAnalyticsOverview,
  getCampaignAnalytics,
  getCreatorAnalytics,
  getRevenueAnalytics,
  getTopBrands,
  getTopCreators,
} from '../controllers/analyticsController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/roleCheck.js';
import { USER_ROLES } from '../utils/constants.js';

const router = Router();

router.use(auth);
router.get('/overview', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), getAnalyticsOverview);
router.get('/creators', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), getCreatorAnalytics);
router.get('/campaigns', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), getCampaignAnalytics);
router.get('/revenue', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE_MANAGER]), getRevenueAnalytics);
router.get('/top-creators', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), getTopCreators);
router.get('/top-brands', requireRole([USER_ROLES.SUPER_ADMIN]), getTopBrands);

export default router;
