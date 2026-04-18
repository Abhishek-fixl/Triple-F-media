import { Router } from 'express';

import { deleteManagedFile, getManagedFile, uploadBriefFile, uploadCreatorContentFile } from '../controllers/fileController.js';
import auth from '../middleware/auth.js';
import creatorAuth from '../middleware/creatorAuth.js';
import requireRole from '../middleware/roleCheck.js';
import upload from '../middleware/upload.js';
import { USER_ROLES } from '../utils/constants.js';

const router = Router();

router.post('/admin/upload/brief', auth, requireRole([USER_ROLES.SUPER_ADMIN, USER_ROLES.CAMPAIGN_MANAGER]), upload.single('briefPdf'), uploadBriefFile);
router.post('/creator/upload/content', creatorAuth, upload.single('content'), uploadCreatorContentFile);
router.delete('/admin/files/:publicId', auth, requireRole([USER_ROLES.SUPER_ADMIN]), deleteManagedFile);
router.get('/admin/files/:publicId', auth, getManagedFile);

export default router;
