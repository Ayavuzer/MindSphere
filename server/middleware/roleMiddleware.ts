import type { RequestHandler } from "express";
import { storage } from "../storage";
import { GlobalRole } from "@shared/schema";

/**
 * Role-based access control middleware
 * Requires user to have minimum specified global role
 */
export function requireRole(minimumRole: GlobalRole): RequestHandler {
  return async (req: any, res, next) => {
    try {
      // Check if user is authenticated first
      if (!req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get fresh user data with role
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const userRole = user.globalRole || 'user';
      
      // Role hierarchy: user < admin < superadmin
      const roleHierarchy: Record<GlobalRole, number> = {
        'user': 1,
        'admin': 2,
        'superadmin': 3
      };

      const userRoleLevel = roleHierarchy[userRole as GlobalRole] || 0;
      const requiredRoleLevel = roleHierarchy[minimumRole];

      if (userRoleLevel < requiredRoleLevel) {
        return res.status(403).json({ 
          message: `Insufficient permissions. ${minimumRole} role required.`,
          userRole,
          requiredRole: minimumRole
        });
      }

      // Add role info to request for further use
      req.userRole = userRole;
      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({ message: 'Permission check failed' });
    }
  };
}

/**
 * Middleware specifically for admin routes
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware specifically for superadmin routes
 */
export const requireSuperAdmin = requireRole('superadmin');

/**
 * Check if user has specific role (utility function)
 */
export async function hasRole(userId: string, role: GlobalRole): Promise<boolean> {
  try {
    const user = await storage.getUser(userId);
    if (!user) return false;

    const userRole = user.globalRole || 'user';
    const roleHierarchy: Record<GlobalRole, number> = {
      'user': 1,
      'admin': 2,
      'superadmin': 3
    };

    const userRoleLevel = roleHierarchy[userRole as GlobalRole] || 0;
    const requiredRoleLevel = roleHierarchy[role];

    return userRoleLevel >= requiredRoleLevel;
  } catch (error) {
    console.error('Role check error:', error);
    return false;
  }
}

/**
 * Get user's effective permissions based on role
 */
export function getRolePermissions(role: GlobalRole): string[] {
  const permissions: Record<GlobalRole, string[]> = {
    'user': ['read_own_data', 'write_own_data'],
    'admin': ['read_own_data', 'write_own_data', 'manage_tenant', 'view_analytics'],
    'superadmin': ['read_own_data', 'write_own_data', 'manage_tenant', 'view_analytics', 'manage_users', 'system_admin']
  };

  return permissions[role] || permissions['user'];
}