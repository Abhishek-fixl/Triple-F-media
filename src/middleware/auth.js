import jwt from 'jsonwebtoken';

import User from '../models/User.js';
import { ApiError, asyncHandler } from '../utils/helpers.js';

const extractToken = (req) => {
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }

  return req.cookies?.token || null;
};

const auth = asyncHandler(async (req, _res, next) => {
  const token = extractToken(req);

  if (!token) {
    throw new ApiError(401, 'Authentication required', 'AUTH_REQUIRED');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired token', 'INVALID_TOKEN');
  }

  const user = await User.findById(payload.sub).select('+passwordHash');
  if (!user || !user.isActive) {
    throw new ApiError(401, 'User account is inactive or missing', 'USER_UNAUTHORIZED');
  }

  req.user = user;
  next();
});

export default auth;
