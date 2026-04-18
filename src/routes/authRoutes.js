import { Router } from 'express';
import { body } from 'express-validator';

import auth from '../middleware/auth.js';
import validate from '../middleware/validation.js';
import { changePassword, forgotPassword, login, logout, me, register, resetPassword } from '../controllers/authController.js';

const router = Router();

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      .withMessage('Password must include uppercase, lowercase, and number'),
    validate,
  ],
  register,
);

router.post(
  '/login',
  [
    body('email').trim().isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validate,
  ],
  login,
);
router.post('/logout', auth, logout);
router.get('/me', auth, me);

router.post(
  '/forgot-password',
  [
    body('email').trim().isEmail().withMessage('Valid email is required'),
    validate,
  ],
  forgotPassword,
);

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      .withMessage('Password must include uppercase, lowercase, and number'),
    validate,
  ],
  resetPassword,
);

router.post(
  '/change-password',
  auth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      .withMessage('New password must include uppercase, lowercase, and number'),
    validate,
  ],
  changePassword,
);

export default router;
