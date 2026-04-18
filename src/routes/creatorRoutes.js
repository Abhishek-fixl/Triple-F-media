import { Router } from 'express';

import { applyForCreator, calculateEarnings } from '../controllers/creatorController.js';
import validate from '../middleware/validation.js';
import { calculatorValidation, creatorApplicationValidation } from '../validators/creatorValidator.js';

const router = Router();

// ============================================
// PHASE 3: CREATOR PORTAL (DISABLED FOR NOW)
// These routes will be enabled when creator portal is built
// ============================================
// router.post('/creator/signup', creatorController.signup);
// router.post('/creator/login', creatorController.login);
// router.post('/creator/forgot-password', creatorController.forgotPassword);
// ============================================

router.post('/apply', creatorApplicationValidation, validate, applyForCreator);
router.get('/calculator', calculatorValidation, validate, calculateEarnings);

export default router;
