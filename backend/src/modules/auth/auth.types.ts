export interface LoginDto {
  email: string;
  password: string;
  totpToken?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  userId: string;
  tenantId: string;
  organizationId: string;
  sessionId: string;
  type: 'access' | 'refresh';
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}
