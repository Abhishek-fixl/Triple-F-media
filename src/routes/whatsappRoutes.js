import { Router } from 'express';
import { body } from 'express-validator';

import { testWhatsApp } from '../controllers/whatsappController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/roleCheck.js';
import validate from '../middleware/validation.js';
import { USER_ROLES } from '../utils/constants.js';

const router = Router();

router.use(auth);
router.use(requireRole([USER_ROLES.SUPER_ADMIN]));

router.post(
  '/test',
  [
    body('to').trim().notEmpty().withMessage('Recipient number is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
    validate,
  ],
  testWhatsApp,
);

export default router;
