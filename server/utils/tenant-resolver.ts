import type { Request } from 'express';
import { storage } from '../storage';

export type TenantResolutionStrategy = 'subdomain' | 'header' | 'path' | 'default';

export interface TenantResolutionConfig {
  strategy: TenantResolutionStrategy;
  defaultTenantId?: string;
  enableFallback?: boolean;
}

/**
 * Resolves tenant ID from various sources in the request
 */
export class TenantResolver {
  private config: TenantResolutionConfig;

  constructor(config: TenantResolutionConfig = { strategy: 'default' }) {
    this.config = {
      defaultTenantId: '00000000-0000-0000-0000-000000000001', // Default "Personal" tenant
      enableFallback: true,
      ...config
    };
  }

  /**
   * Extract tenant ID from request using configured strategy
   */
  async resolveTenantId(req: Request): Promise<string | null> {
    try {
      switch (this.config.strategy) {
        case 'subdomain':
          return await this.resolveFromSubdomain(req);
        
        case 'header':
          return await this.resolveFromHeader(req);
        
        case 'path':
          return await this.resolveFromPath(req);
        
        case 'default':
        default:
          return this.config.defaultTenantId || null;
      }
    } catch (error) {
      console.error('Error resolving tenant:', error);
      return this.config.enableFallback ? this.config.defaultTenantId || null : null;
    }
  }

  /**
   * Resolve tenant from subdomain (e.g., company.mindsphere.app)
   */
  private async resolveFromSubdomain(req: Request): Promise<string | null> {
    const host = req.get('host') || req.headers.host;
    if (!host) return null;

    // Extract subdomain
    const parts = host.split('.');
    if (parts.length < 3) {
      // No subdomain, use default
      return this.config.defaultTenantId || null;
    }

    const subdomain = parts[0];
    
    // Skip common subdomains
    if (['www', 'api', 'app'].includes(subdomain)) {
      return this.config.defaultTenantId || null;
    }

    // Look up tenant by slug
    const tenant = await storage.getTenantBySlug(subdomain);
    return tenant?.id || (this.config.enableFallback ? this.config.defaultTenantId || null : null);
  }

  /**
   * Resolve tenant from X-Tenant-ID header
   */
  private async resolveFromHeader(req: Request): Promise<string | null> {
    const tenantId = req.get('X-Tenant-ID') || req.get('x-tenant-id');
    if (!tenantId) {
      return this.config.defaultTenantId || null;
    }

    // Validate tenant exists and user has access
    if (req.user?.id) {
      const hasAccess = await storage.userHasTenantAccess(req.user.id, tenantId);
      if (hasAccess) {
        return tenantId;
      }
    }

    return this.config.enableFallback ? this.config.defaultTenantId || null : null;
  }

  /**
   * Resolve tenant from URL path (e.g., /tenant/company-slug/dashboard)
   */
  private async resolveFromPath(req: Request): Promise<string | null> {
    const pathParts = req.path.split('/');
    
    // Look for /tenant/{slug} pattern
    const tenantIndex = pathParts.indexOf('tenant');
    if (tenantIndex === -1 || tenantIndex + 1 >= pathParts.length) {
      return this.config.defaultTenantId || null;
    }

    const tenantSlug = pathParts[tenantIndex + 1];
    if (!tenantSlug) {
      return this.config.defaultTenantId || null;
    }

    // Look up tenant by slug
    const tenant = await storage.getTenantBySlug(tenantSlug);
    return tenant?.id || (this.config.enableFallback ? this.config.defaultTenantId || null : null);
  }

  /**
   * Get user's role in the specified tenant
   */
  async getUserTenantRole(userId: string, tenantId: string): Promise<string | null> {
    try {
      const membership = await storage.getTenantMembership(tenantId, userId);
      return membership?.role || null;
    } catch (error) {
      console.error('Error getting user tenant role:', error);
      return null;
    }
  }

  /**
   * Validate that user has access to the tenant with minimum role
   */
  async validateTenantAccess(
    userId: string, 
    tenantId: string, 
    minRole: string = 'viewer'
  ): Promise<boolean> {
    try {
      const userRole = await this.getUserTenantRole(userId, tenantId);
      if (!userRole) return false;

      // Role hierarchy: owner > admin > member > viewer
      const roleHierarchy = ['viewer', 'member', 'admin', 'owner'];
      const userRoleLevel = roleHierarchy.indexOf(userRole);
      const minRoleLevel = roleHierarchy.indexOf(minRole);

      return userRoleLevel >= minRoleLevel;
    } catch (error) {
      console.error('Error validating tenant access:', error);
      return false;
    }
  }
}

// Default tenant resolver instance
export const tenantResolver = new TenantResolver({
  strategy: 'header', // Use header strategy for X-Tenant-ID support
  enableFallback: true
});

// Factory function for creating custom resolvers
export function createTenantResolver(config: TenantResolutionConfig): TenantResolver {
  return new TenantResolver(config);
}