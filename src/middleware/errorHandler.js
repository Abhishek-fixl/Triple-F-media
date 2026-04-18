import logger from '../utils/logger.js';

export const notFoundHandler = (req, _res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
};

const errorHandler = (error, req, res, _next) => {
  const normalizedError = error;

  let statusCode = normalizedError?.statusCode || 500;
  let code = normalizedError?.code || 'INTERNAL_SERVER_ERROR';
  let message = normalizedError?.message || 'Internal server error';

  if (normalizedError?.name === 'CastError') {
    statusCode = 404;
    code = 'RESOURCE_NOT_FOUND';
    message = 'Requested resource was not found';
  }

  logger.error('Request failed', {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code,
    error: message,
    stack: normalizedError?.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: message,
    code,
    ...(normalizedError.details ? { details: normalizedError.details } : {}),
  });
};

export default errorHandler;
