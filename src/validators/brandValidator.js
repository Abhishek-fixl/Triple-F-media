import { body } from 'express-validator';

export const brandBriefValidation = [
  body('brandName').trim().notEmpty().withMessage('Brand name is required'),
  body('contactName').trim().notEmpty().withMessage('Contact name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('campaignGoal').trim().notEmpty().withMessage('Campaign goal is required'),
  body('targetAudience').trim().notEmpty().withMessage('Target audience is required'),
  body('budget').trim().notEmpty().withMessage('Budget is required'),
  body('timeline').trim().notEmpty().withMessage('Timeline is required'),
  body('notes').optional().trim(),
];
