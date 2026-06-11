export interface AuthUser {
  userId: string;
  firstName?: string;
  lastName?: string;
  employeePublicId?: string;
  tenantId: string;
  organizationId: string;
  sessionId: string;
  roles: string[];
  permissions: string[];
  dataScope: string;
}

export interface LoginDto {
  email: string;
  password: string;
  totpToken?: string;
}

export interface LoginResponse {
  userId: string;
  tenantId: string;
  organizationId: string;
  expiresIn: number;
  accessToken: string;
  refreshToken: string;
}

export interface SignupDto {
  tenantName: string;
  tenantSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}
