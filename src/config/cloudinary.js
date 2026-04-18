import { v2 as cloudinary } from 'cloudinary';

const hasRealValue = (value) => Boolean(value) && !String(value).startsWith('your_');

export const isCloudinaryConfigured =
  hasRealValue(process.env.CLOUDINARY_CLOUD_NAME) &&
  hasRealValue(process.env.CLOUDINARY_API_KEY) &&
  hasRealValue(process.env.CLOUDINARY_API_SECRET);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export default cloudinary;
