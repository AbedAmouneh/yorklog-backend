/**
 * Role-based access control middleware.
 *
 * Role hierarchy (highest to lowest):
 *   super_admin > org_admin > dept_manager > hr_finance > employee
 *
 * Usage:
 *   router.get('/team', authenticate, requireManager, handler)
 *   router.post('/users', authenticate, requireAdmin, handler)
 *   router.get('/teams', authenticate, requireAnyOf('hr_finance', 'org_admin'), handler)
 */

const ROLE_LEVELS = {
  employee: 1,
  hr_finance: 2,
  dept_manager: 3,
  org_admin: 4,
  super_admin: 5,
};

/**
 * Require the user to have AT LEAST the given role level.
 * Passing multiple roles uses OR logic — any one match (exact or higher level) grants access.
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const userLevel = ROLE_LEVELS[req.user.role] || 0;
    const hasAccess = roles.some(r => {
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

/**
 * Require the user's role to be one of the given roles EXACTLY (no level escalation).
 * Use this when you want to grant access to specific roles without also granting to
 * everyone above them in the hierarchy (e.g. hr_finance + org_admin but not dept_manager).
 */
export const requireAnyOf = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required: ${roles.join(' or ')}.`,
      });
    }
    next();
  };
};

/** Shorthand helpers */
export const requireManager = requireRole('dept_manager');   // dept_manager, org_admin, super_admin
export const requireOrgAdmin = requireRole('org_admin');     // org_admin, super_admin
export const requireAdmin = requireRole('super_admin');      // super_admin only
export const requireHR = requireRole('hr_finance');          // hr_finance and above
