import jwt from 'jsonwebtoken';

import BrandAccount from '../models/BrandAccount.js';
import { ApiError, asyncHandler } from '../utils/helpers.js';

const brandAuth = asyncHandler(async (req, _res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : req.cookies?.brandToken;

  if (!token) {
    throw new ApiError(401, 'Brand authentication required', 'BRAND_AUTH_REQUIRED');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired brand token', 'INVALID_BRAND_TOKEN');
  }

  if (payload.scope !== 'brand') {
    throw new ApiError(403, 'Invalid brand token scope', 'INVALID_BRAND_SCOPE');
  }

  const brand = await BrandAccount.findById(payload.sub).select('+passwordHash');
  if (!brand || !brand.isActive) {
    throw new ApiError(401, 'Brand account is unavailable', 'BRAND_UNAVAILABLE');
  }

  req.brand = brand;
  next();
});

export default brandAuth;
