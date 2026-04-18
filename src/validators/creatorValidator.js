import { query, body } from 'express-validator';

import { CREATOR_NICHES, CREATOR_PLATFORMS, FOLLOWER_BUCKETS } from '../utils/constants.js';

// Relaxed validation - accepts any non-empty values
export const creatorApplicationValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('age').isInt({ min: 18 }).withMessage('Age must be at least 18'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('platform').trim().notEmpty().withMessage('Platform is required'),
  body('followers').trim().notEmpty().withMessage('Followers is required'),
  body('niche').trim().notEmpty().withMessage('Niche is required'),
  body('profileLink').trim().isURL().withMessage('Valid profile link is required'),
  body('whatsapp').trim().notEmpty().withMessage('WhatsApp number is required'),
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('referral').optional().trim(),
];

export const calculatorValidation = [
  query('platform').isIn(CREATOR_PLATFORMS).withMessage('Invalid platform'),
  query('followers').isFloat({ min: 5000 }).withMessage('Followers must be at least 5000'),
  query('niche').isIn(CREATOR_NICHES).withMessage('Invalid niche'),
  query('frequency').isIn(['5-7x/week', '3-4x/week', '1-2x/week', 'occasional']).withMessage('Invalid posting frequency'),
  query('engagement').isIn(['high', 'good', 'average', 'low']).withMessage('Invalid engagement level'),
  query('city').trim().notEmpty().withMessage('City is required'),
];
