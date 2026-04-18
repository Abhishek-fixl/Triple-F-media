import { Router } from 'express';

import { submitBrandBrief } from '../controllers/brandController.js';
import validate from '../middleware/validation.js';
import { brandBriefValidation } from '../validators/brandValidator.js';

const router = Router();

// ============================================
// PHASE 3: BRAND PORTAL (DISABLED FOR NOW)
// These routes will be enabled when brand portal is built
// ============================================
// router.post('/brand/signup', brandController.signup);
// router.post('/brand/login', brandController.login);
// router.post('/brand/forgot-password', brandController.forgotPassword);
// ============================================

router.post('/submit-brief', brandBriefValidation, validate, submitBrandBrief);
router.post('/brief', brandBriefValidation, validate, submitBrandBrief);

export default router;
