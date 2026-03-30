/**
 * Wraps an async Express route handler so unhandled promise rejections
 * are forwarded to Express's global error handler via next(err).
 * Required for Express 4, which does not auto-catch async errors.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
