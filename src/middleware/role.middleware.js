/**
 * Role-based access control middleware.
 *
 * Role hierarchy (highest to lowest):
 *   super_admin > dept_manager > hr_finance > employee
 *
 * Usage:
 *   router.get('/team', authenticate, requireRole('dept_manager'), handler)
 *   router.post('/users', authenticate, requireRole('super_admin'), handler)
 */

const ROLE_LEVELS = {
  employee: 1,
  hr_finance: 2,
  dept_manager: 3,
  super_admin: 4,
};

/**
 * Require the user to have at least the given role level.
 * @param {...string} roles - One or more acceptable roles (OR logic)
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const userLevel = ROLE_LEVELS[req.user.role] || 0;
    const hasAccess = roles.some(r => {
      // Exact match OR user level is higher
      return req.user.role === r || userLevel >= ROLE_LEVELS[r];
    });

    if (!hasAccess) {
      return res.status(403).json({
        error: `Access denied. Required role: ${roles.join(' or ')}.`,
      });
    }

    next();
  };
};

/** Shorthand helpers */
export const requireManager = requireRole('dept_manager');
export const requireAdmin = requireRole('super_admin');
export const requireHR = requireRole('hr_finance');
