import { Router } from 'express';
import { body } from 'express-validator';

import {
  deleteCreatorContent,
  getCreatorCampaign,
  getCreatorDashboard,
  getCreatorEarnings,
  getCreatorPerformanceAnalytics,
  getCreatorProfile,
  listCreatorCampaigns,
  loginCreator,
  patchCreatorUpi,
  registerCreator,
  requestWithdrawal,
  submitCreatorContent,
  updateCreatorContent,
  updateCreatorProfile,
} from '../controllers/creatorPortalController.js';
import creatorAuth from '../middleware/creatorAuth.js';
import validate from '../middleware/validation.js';

const router = Router();

// ============================================
// PHASE 3: CREATOR PORTAL (DISABLED FOR NOW)
// These routes will be enabled when creator portal is built
// ============================================
// router.post('/auth/register', [body('email').isEmail(), body('password').isLength({ min: 8 }), validate], registerCreator);
// router.post('/auth/login', [body('email').isEmail(), body('password').notEmpty(), validate], loginCreator);
// router.post('/auth/forgot-password', creatorController.forgotPassword);
// ============================================

router.use(creatorAuth);
router.get('/dashboard', getCreatorDashboard);
router.get('/campaigns', listCreatorCampaigns);
router.get('/campaigns/:id', getCreatorCampaign);
router.post('/campaigns/:id/content', [body('contentUrl').isURL(), validate], submitCreatorContent);
router.put('/campaigns/:id/content', [body('contentUrl').isURL(), validate], updateCreatorContent);
router.delete('/campaigns/:id/content', deleteCreatorContent);
router.get('/earnings', getCreatorEarnings);
router.get('/profile', getCreatorProfile);
router.put('/profile', updateCreatorProfile);
router.patch('/profile/upi', [body('upiId').trim().notEmpty(), validate], patchCreatorUpi);
router.post('/withdraw', [body('amount').isFloat({ min: 1 }), validate], requestWithdrawal);
router.get('/analytics/performance', getCreatorPerformanceAnalytics);

export default router;
