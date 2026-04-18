import { Router } from 'express';
import { body } from 'express-validator';

import { captureLead, getHistory, sendMessage } from '../controllers/chatController.js';
import validate from '../middleware/validation.js';

const router = Router();

router.post(
  '/send',
  [
    body('message').trim().notEmpty().withMessage('Message is required'),
    body('sessionId').optional().isString(),
    body('userType').optional().isIn(['creator', 'brand', 'unknown']),
    body('conversationHistory').optional().isArray(),
    validate,
  ],
  sendMessage,
);

router.post(
  '/capture-lead',
  [
    body('sessionId').trim().notEmpty().withMessage('sessionId is required'),
    body('name').optional().isString(),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('whatsapp').optional().isString(),
    body('userType').optional().isIn(['creator', 'brand', 'unknown']),
    validate,
  ],
  captureLead,
);

router.get('/history/:sessionId', getHistory);

export default router;
