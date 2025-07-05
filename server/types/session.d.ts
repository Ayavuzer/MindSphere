import { TenantRole, AuthenticatedUser } from '@shared/schema';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    tenantId: string;
    userRole: TenantRole;
    user: AuthenticatedUser;
  }
}

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
    tenant?: {
      id: string;
      role: TenantRole;
    };
  }
}