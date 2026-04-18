import fs from 'fs/promises';
import path from 'path';
import { Readable } from 'stream';

import cloudinary, { isCloudinaryConfigured } from '../config/cloudinary.js';
import logger from '../utils/logger.js';
import { getGeneratedFilePath, getPublicGeneratedUrl } from '../utils/helpers.js';

const uploadFile = async (buffer, folder, fileName, mimeType = 'application/octet-stream') => {
  if (isCloudinaryConfigured) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: path.parse(fileName).name,
          resource_type: mimeType.startsWith('video/') ? 'video' : 'auto',
        },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            bytes: result.bytes,
          });
        },
      );

      Readable.from(buffer).pipe(uploadStream);
    });
  }

  const relativePath = `${folder.replace(/[\\/]/g, '_')}_${fileName}`;
  const filePath = getGeneratedFilePath(relativePath);
  await fs.writeFile(filePath, buffer);

  logger.warn('Cloudinary not configured, file stored locally', { filePath });

  return {
    url: getPublicGeneratedUrl(relativePath),
    publicId: relativePath,
    bytes: buffer.length,
  };
};

const deleteFile = async (publicId) => {
  if (isCloudinaryConfigured) {
    return cloudinary.uploader.destroy(publicId, { resource_type: 'auto' });
  }

  const filePath = getGeneratedFilePath(publicId);
  await fs.rm(filePath, { force: true });
  return { result: 'ok' };
};

const getOptimizedUrl = (publicId, options = {}) => {
  if (isCloudinaryConfigured) {
    return cloudinary.url(publicId, {
      secure: true,
      fetch_format: 'auto',
      quality: 'auto',
      ...options,
    });
  }

  return getPublicGeneratedUrl(publicId);
};

export default {
  uploadFile,
  deleteFile,
  getOptimizedUrl,
};
