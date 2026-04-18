import multer from 'multer';

import { ApiError } from '../utils/helpers.js';

const allowedMimeTypes = ['application/pdf', 'video/mp4', 'video/quicktime', 'image/jpeg', 'image/png'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      callback(new ApiError(400, 'Unsupported file type', 'INVALID_FILE_TYPE'));
      return;
    }

    callback(null, true);
  },
});

export default upload;
