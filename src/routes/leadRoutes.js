import { Router } from 'express';
import { body } from 'express-validator';

import { deleteLead, listLeads, updateLead } from '../controllers/leadController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/roleCheck.js';
import validate from '../middleware/validation.js';
import { LEAD_STATUSES, USER_ROLES } from '../utils/constants.js';

const router = Router();

router.use(auth);
router.use(requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.ONBOARDING_SPECIALIST]));

router.get('/', listLeads);
router.put(
  '/:id',
  [
    body('status').optional().isIn(LEAD_STATUSES).withMessage('Invalid lead status'),
    body('assignedTo').optional({ nullable: true }).isMongoId().withMessage('assignedTo must be a valid user id'),
    body('notes').optional().isString().withMessage('Notes must be text'),
    validate,
  ],
  updateLead,
);
router.delete('/:id', deleteLead);

export default router;
