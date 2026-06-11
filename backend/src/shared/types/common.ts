import { Types } from 'mongoose';

export interface BaseDocument {
  _id: Types.ObjectId;
  publicId: string;
  tenantId: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  deletedAt: Date | null;
  deletedBy?: string;
  deletionReason?: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export enum DataScope {
  SELF = 'self',
  DIRECT_REPORTS = 'direct_reports',
  DIRECT_AND_INDIRECT_REPORTS = 'direct_and_indirect_reports',
  DEPARTMENT = 'department',
  LOCATION = 'location',
  BUSINESS_UNIT = 'business_unit',
  COST_CENTER = 'cost_center',
  COMPANY = 'company',
  ORGANIZATION = 'organization',
  PROJECT_TEAM = 'project_team',
  PLATFORM = 'platform',
}

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
  dataScope: DataScope;
  isImpersonating: boolean;
  impersonatedBy?: string;
  departmentId?: string;
  locationId?: string;
  companyId?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AsyncJobResponse {
  jobId: string;
  status: 'queued';
}

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiListResponse<T> = {
  success: true;
  data: T[];
  meta: PaginationMeta;
};

export type ApiErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
