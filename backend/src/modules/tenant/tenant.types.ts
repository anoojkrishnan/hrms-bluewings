import type { BaseDocument } from '@/shared/types/common';

export enum TenantStatus {
  TRIAL = 'trial',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  ARCHIVED = 'archived',
}

export interface ContactInfo {
  name: string;
  email: string;
  phone?: string;
}

export interface TenantBranding {
  logoUrl?: string;
  primaryColor?: string;
  appName?: string;
}

export interface Tenant extends BaseDocument {
  name: string;
  slug: string;
  primaryContact: ContactInfo;
  billingContact?: ContactInfo;
  country: string;
  defaultTimezone: string;
  defaultCurrency: string;
  defaultLanguage: string;
  branding: TenantBranding;
  status: TenantStatus;
  trialEndsAt?: Date;
  employeeLimit: number;
  storageLimit: number;
}

export interface TenantSettings {
  tenantId: string;
  financialYearStart: 'apr' | 'jan';
  dateFormat: string;
  workingDaysPerWeek: number;
  makerCheckerEnabled: boolean;
  mfaRequired: boolean;
  ssoEnabled: boolean;
  ipWhitelistEnabled: boolean;
  ipWhitelist: string[];
  updatedAt: Date;
}

export interface TenantModule {
  tenantId: string;
  moduleCode: string;
  isEnabled: boolean;
  enabledAt?: Date;
  enabledBy?: string;
  disabledAt?: Date;
  disabledBy?: string;
}

export interface TenantUsageCounters {
  tenantId: string;
  activeEmployeeCount: number;
  storageUsedBytes: number;
  updatedAt: Date;
}

export interface CreateTenantDto {
  name: string;
  slug: string;
  country: string;
  defaultTimezone?: string;
  defaultCurrency?: string;
  defaultLanguage?: string;
  primaryContact: ContactInfo;
}

export interface UpdateTenantDto {
  name?: string;
  primaryContact?: ContactInfo;
  billingContact?: ContactInfo;
  defaultTimezone?: string;
  defaultCurrency?: string;
  defaultLanguage?: string;
  branding?: Partial<TenantBranding>;
}

export interface UpdateTenantSettingsDto {
  financialYearStart?: 'apr' | 'jan';
  dateFormat?: string;
  workingDaysPerWeek?: number;
  makerCheckerEnabled?: boolean;
  mfaRequired?: boolean;
  ssoEnabled?: boolean;
  ipWhitelistEnabled?: boolean;
  ipWhitelist?: string[];
}

export interface SignupDto {
  tenantName: string;
  slug: string;
  country?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface TenantDto {
  publicId: string;
  name: string;
  slug: string;
  country: string;
  defaultTimezone: string;
  defaultCurrency: string;
  defaultLanguage: string;
  branding: TenantBranding;
  status: TenantStatus;
  trialEndsAt?: Date;
  employeeLimit: number;
  storageLimit: number;
  primaryContact: ContactInfo;
  createdAt: Date;
}
