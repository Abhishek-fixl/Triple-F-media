import jwt from 'jsonwebtoken';

import Creator from '../models/Creator.js';
import { ApiError, asyncHandler } from '../utils/helpers.js';

const creatorAuth = asyncHandler(async (req, _res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : req.cookies?.creatorToken;

  if (!token) {
    throw new ApiError(401, 'Creator authentication required', 'CREATOR_AUTH_REQUIRED');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired creator token', 'INVALID_CREATOR_TOKEN');
  }

  if (payload.scope !== 'creator') {
    throw new ApiError(403, 'Invalid creator token scope', 'INVALID_CREATOR_SCOPE');
  }

  const creator = await Creator.findById(payload.sub).select('+passwordHash');
  if (!creator || creator.status === 'inactive') {
    throw new ApiError(401, 'Creator account is unavailable', 'CREATOR_UNAVAILABLE');
  }

  req.creator = creator;
  next();
});

export default creatorAuth;
