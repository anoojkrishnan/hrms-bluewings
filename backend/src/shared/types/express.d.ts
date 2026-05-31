declare global {
  namespace Express {
    interface Request {
      user: import('./common').AuthUser;
      requestId: string;
      tenantSettings?: import('../../modules/tenant/tenant.types').TenantSettings;
    }
  }
}

export {};
