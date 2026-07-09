import { validationResult } from 'express-validator';

export const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const validationErrors = errors.array();

    return res.status(400).json({
      message: validationErrors[0]?.msg || 'Invalid request',
      errors: validationErrors
    });
  }

  next();
};
