import { AppError } from '../lib/errors.js';

export const validate = (schema, source = 'body') => (req, res, next) => {
  const parsed = schema.safeParse(req[source]);
  if (!parsed.success) {
    return next(new AppError(
      400,
      'VALIDATION_ERROR',
      'Request validation failed',
      parsed.error.flatten(),
    ));
  }
  req[source] = parsed.data;
  return next();
};
