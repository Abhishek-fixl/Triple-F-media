import { Router } from 'express';
import { body } from 'express-validator';

import { bulkProcessPayments, deletePayment, getPayment, listPayments, processPayments } from '../controllers/paymentController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/roleCheck.js';
import validate from '../middleware/validation.js';
import { USER_ROLES } from '../utils/constants.js';

const router = Router();

router.use(auth);
router.use(requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.FINANCE_MANAGER]));

router.get('/', listPayments);
router.get('/:id', getPayment);
router.post(
  '/process',
  [body('assignmentIds').isArray({ min: 1 }).withMessage('assignmentIds must be a non-empty array'), validate],
  processPayments,
);
router.post(
  '/bulk-process',
  [body('assignmentIds').isArray({ min: 1 }).withMessage('assignmentIds must be a non-empty array'), validate],
  bulkProcessPayments,
);
router.delete('/:id', deletePayment);

export default router;
