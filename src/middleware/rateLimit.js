const passthrough = (_req, _res, next) => next();

export const publicApiLimiter = passthrough;
export const adminApiLimiter = passthrough;
export const authLimiter = passthrough;
