import { validationResult } from 'express-validator';

import { ApiError } from '../utils/helpers.js';

const validate = (req, _res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return next(
      new ApiError(
        400,
        'Validation failed',
        'VALIDATION_ERROR',
        errors.array().map((error) => ({
          field: error.path,
          message: error.msg,
          value: error.value,
        })),
      ),
    );
  }

  return next();
};

export default validate;
