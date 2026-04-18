import { ApiError } from '../utils/helpers.js';

const requireRole = (allowedRoles = []) => (req, _res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required', 'AUTH_REQUIRED'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action', 'FORBIDDEN'));
  }

  return next();
};

export default requireRole;
