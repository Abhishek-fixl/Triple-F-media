import { body } from 'express-validator';

import {
  BRAND_PAYMENT_STATUSES,
  CAMPAIGN_GOALS,
  CAMPAIGN_PLATFORMS,
  CAMPAIGN_STATUSES,
  CAMPAIGN_TYPES,
  USER_ROLE_VALUES,
} from '../utils/constants.js';

// Helper: parse platforms — FormData sends arrays as JSON strings
const platformsValidator = body('platforms').optional().custom((value) => {
  const arr = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(arr)) throw new Error('Platforms must be an array');
  arr.forEach((p) => {
    if (!CAMPAIGN_PLATFORMS.includes(p)) throw new Error(`Invalid platform: ${p}`);
  });
  return true;
});

export const campaignValidation = [
  body('campaignName').trim().notEmpty().withMessage('Campaign name is required'),
  body('brandName').trim().notEmpty().withMessage('Brand name is required'),
  body('type').isIn(CAMPAIGN_TYPES).withMessage('Invalid campaign type'),
  body('budget')
    .customSanitizer((value) => (typeof value === 'string' ? parseFloat(value) : value))
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number'),
  body('creatorCount')
    .customSanitizer((value) => (typeof value === 'string' ? parseInt(value, 10) : value))
    .isInt({ min: 1 })
    .withMessage('Creator count must be at least 1'),
  body('status').optional().isIn(CAMPAIGN_STATUSES).withMessage('Invalid campaign status'),
  body('brandPaymentStatus').optional().isIn(BRAND_PAYMENT_STATUSES).withMessage('Invalid brand payment status'),
  // Phase 9 fields
  body('campaignGoal').optional().isIn(CAMPAIGN_GOALS).withMessage('Invalid campaign goal'),
  platformsValidator,
  body('niche').optional().trim(),
  body('briefText').optional().trim().isLength({ max: 2000 }).withMessage('Brief text too long'),
  body('targetAudience').optional().trim().isLength({ max: 500 }).withMessage('Target audience too long'),
  body('deliverables').optional().trim().isLength({ max: 500 }).withMessage('Deliverables too long'),
  body('contentFormat').optional().trim(),
  body('brandContactEmail').optional().trim().isEmail().withMessage('Invalid brand contact email'),
  body('brandContactPhone').optional().trim(),
  body('notes').optional().trim().isLength({ max: 1000 }).withMessage('Notes too long'),
  body('creators')
    .optional()
    .custom((value) => {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(parsed)) throw new Error('Creators must be an array');
      parsed.forEach((item) => {
        if (!item.creatorId || !item.amount || Number(item.amount) < 0) {
          throw new Error('Each creator must include creatorId and valid amount');
        }
      });
      return true;
    }),
];

export const updateCampaignValidation = [
  body('campaignName').optional().trim().notEmpty().withMessage('Campaign name cannot be empty'),
  body('brandName').optional().trim().notEmpty().withMessage('Brand name cannot be empty'),
  body('type').optional().isIn(CAMPAIGN_TYPES).withMessage('Invalid campaign type'),
  body('budget')
    .optional()
    .customSanitizer((value) => (typeof value === 'string' ? parseFloat(value) : value))
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number'),
  body('creatorCount')
    .optional()
    .customSanitizer((value) => (typeof value === 'string' ? parseInt(value, 10) : value))
    .isInt({ min: 1 })
    .withMessage('Creator count must be at least 1'),
  body('status').optional().isIn(CAMPAIGN_STATUSES).withMessage('Invalid campaign status'),
  body('brandPaymentStatus').optional().isIn(BRAND_PAYMENT_STATUSES).withMessage('Invalid brand payment status'),
  // Phase 9 fields
  body('campaignGoal').optional().isIn(CAMPAIGN_GOALS).withMessage('Invalid campaign goal'),
  platformsValidator,
  body('niche').optional().trim(),
  body('briefText').optional().trim().isLength({ max: 2000 }),
  body('targetAudience').optional().trim().isLength({ max: 500 }),
  body('deliverables').optional().trim().isLength({ max: 500 }),
  body('contentFormat').optional().trim(),
  body('brandContactEmail').optional().trim().isEmail().withMessage('Invalid brand contact email'),
  body('brandContactPhone').optional().trim(),
  body('notes').optional().trim().isLength({ max: 1000 }),
  body('creators')
    .optional()
    .custom((value) => {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      if (!Array.isArray(parsed)) throw new Error('Creators must be an array');
      parsed.forEach((item) => {
        if (!item.creatorId || item.amount === undefined || Number(item.amount) < 0) {
          throw new Error('Each creator must include creatorId and valid amount');
        }
      });
      return true;
    }),
];

export const campaignFeedbackValidation = [
  body('feedback').trim().notEmpty().withMessage('Feedback is required'),
];

export const markLiveValidation = [
  body('postUrl').optional().trim().isURL().withMessage('Post URL must be valid'),
];

export const createAdminUserValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    .withMessage('Password must include uppercase, lowercase, and number'),
  body('role').isIn(USER_ROLE_VALUES).withMessage('Invalid role'),
];
