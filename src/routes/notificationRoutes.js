import { Router } from 'express';

import { listFailedNotifications, retryEmailNotification, retryWhatsappNotification } from '../controllers/notificationController.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/roleCheck.js';
import { USER_ROLES } from '../utils/constants.js';

const router = Router();

router.use(auth);
router.post('/retry-whatsapp/:id', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), retryWhatsappNotification);
router.post('/retry-email/:id', requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), retryEmailNotification);
router.get('/failed', requireRole([USER_ROLES.SUPER_ADMIN]), listFailedNotifications);

export default router;
