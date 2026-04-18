import { Router } from 'express';
import { body } from 'express-validator';

import {
  getBrandAnalytics,
  getBrandCampaign,
  getBrandCampaignPerformance,
  getBrandDashboard,
  listBrandCampaigns,
  listBrandInvoices,
  loginBrand,
  patchBrandCampaignStatus,
  registerBrand,
  shortlistCreators,
  submitBrandBriefAuthenticated,
} from '../controllers/brandPortalController.js';
import brandAuth from '../middleware/brandAuth.js';
import validate from '../middleware/validation.js';

const router = Router();

// ============================================
// PHASE 3: BRAND PORTAL (DISABLED FOR NOW)
// These routes will be enabled when brand portal is built
// ============================================
// router.post('/auth/register', [
//   body('brandName').trim().notEmpty(),
//   body('contactName').trim().notEmpty(),
//   body('email').isEmail(),
//   body('password').isLength({ min: 8 }),
//   validate,
// ], registerBrand);
// router.post('/auth/login', [body('email').isEmail(), body('password').notEmpty(), validate], loginBrand);
// router.post('/auth/forgot-password', brandController.forgotPassword);
// ============================================

router.use(brandAuth);
router.get('/dashboard', getBrandDashboard);
router.get('/campaigns', listBrandCampaigns);
router.get('/campaigns/:id', getBrandCampaign);
router.get('/campaigns/:id/performance', getBrandCampaignPerformance);
router.patch('/campaigns/:id/status', [body('status').notEmpty(), validate], patchBrandCampaignStatus);
router.post('/brief', [
  body('campaignGoal').notEmpty(),
  body('targetAudience').notEmpty(),
  body('budget').notEmpty(),
  body('timeline').notEmpty(),
  validate,
], submitBrandBriefAuthenticated);
router.get('/invoices', listBrandInvoices);
router.get('/creators/shortlist', shortlistCreators);
router.get('/analytics/campaign/:id', getBrandAnalytics);

export default router;
