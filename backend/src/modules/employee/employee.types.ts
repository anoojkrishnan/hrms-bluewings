import type { BaseDocument } from '@/shared/types/common';

export enum EmployeeStatus {
  CANDIDATE = 'candidate',
  PRE_ONBOARDING = 'pre_onboarding',
  ONBOARDING = 'onboarding',
  ACTIVE = 'active',
  PROBATION = 'probation',
  CONFIRMED = 'confirmed',
  CONTRACT = 'contract',
  INTERN = 'intern',
  SUSPENDED = 'suspended',
  NOTICE_PERIOD = 'notice_period',
  SEPARATED = 'separated',
  ALUMNI = 'alumni',
  REHIRED = 'rehired',
}

export enum EmploymentType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern',
  CONSULTANT = 'consultant',
}

export interface Employee extends BaseDocument {
  employeeCode: string;
  companyId: string;
  firstName?: string;
  lastName?: string;
  workEmail?: string;        // work email — used for ESS login invite
  userId?: string;           // publicId of linked user account once ESS is activated
  status: EmployeeStatus;
  joiningDate: Date;
  lastWorkingDate?: Date;
  departmentId?: string;
  designationId?: string;
  gradeId?: string;
  locationId?: string;
  costCenterId?: string;
  businessUnitId?: string;
  reportingManagerId?: string;
  employmentType: EmploymentType;
  probationEndDate?: Date;
  confirmationDate?: Date;
  noticePeriodDays: number;
  essEnabled: boolean;
  essInvitedAt?: Date;
}

export interface EmployeePersonalDetails {
  tenantId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: Date;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  bloodGroup?: string;
  panNumber?: string;      // encrypted
  aadhaarNumber?: string;  // encrypted
  updatedBy: string;
  updatedAt: Date;
}

export interface EmployeeBankDetails {
  tenantId: string;
  employeeId: string;
  accountNumber: string;   // encrypted
  ifscCode: string;
  bankName: string;
  branchName?: string;
  accountType: 'savings' | 'current';
  isPrimary: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
}

export interface EmployeeDocument extends BaseDocument {
  employeeId: string;
  documentType: string;
  documentName: string;
  s3Key: string;           // NEVER expose in API responses
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  expiryDate?: Date;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedBy?: string;
  verifiedAt?: Date;
  version: number;
  uploadedBy: string;
}

export interface EmployeeStatusHistory {
  tenantId: string;
  employeeId: string;
  fromStatus: EmployeeStatus;
  toStatus: EmployeeStatus;
  changedAt: Date;
  changedBy: string;
  reason?: string;
}

// DTOs

export interface CreateEmployeeDto {
  companyId: string;
  workEmail?: string;
  status?: EmployeeStatus;
  joiningDate: string;
  departmentId?: string;
  designationId?: string;
  gradeId?: string;
  locationId?: string;
  reportingManagerId?: string;
  employmentType: EmploymentType;
  probationEndDate?: string;
  noticePeriodDays?: number;
}

export interface UpdateEmployeeDto {
  workEmail?: string;
  departmentId?: string;
  designationId?: string;
  gradeId?: string;
  locationId?: string;
  costCenterId?: string;
  businessUnitId?: string;
  reportingManagerId?: string;
  employmentType?: EmploymentType;
  probationEndDate?: string;
  noticePeriodDays?: number;
}

export interface ChangeStatusDto {
  status: EmployeeStatus;
  reason?: string;
}

export interface UpdatePersonalDetailsDto {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  nationality?: string;
  bloodGroup?: string;
  panNumber?: string;
  aadhaarNumber?: string;
}

export interface UpsertBankDetailsDto {
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName?: string;
  accountType: 'savings' | 'current';
  isPrimary?: boolean;
}

export interface ConfirmDocumentUploadDto {
  documentType: string;
  documentName: string;
  s3Key: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  expiryDate?: string;
}

// Valid status transitions
export const VALID_STATUS_TRANSITIONS: Record<EmployeeStatus, EmployeeStatus[]> = {
  [EmployeeStatus.CANDIDATE]: [EmployeeStatus.PRE_ONBOARDING, EmployeeStatus.SEPARATED],
  [EmployeeStatus.PRE_ONBOARDING]: [EmployeeStatus.ONBOARDING, EmployeeStatus.SEPARATED],
  [EmployeeStatus.ONBOARDING]: [EmployeeStatus.ACTIVE, EmployeeStatus.PROBATION, EmployeeStatus.SEPARATED],
  [EmployeeStatus.ACTIVE]: [EmployeeStatus.PROBATION, EmployeeStatus.CONFIRMED, EmployeeStatus.SUSPENDED, EmployeeStatus.NOTICE_PERIOD, EmployeeStatus.SEPARATED],
  [EmployeeStatus.PROBATION]: [EmployeeStatus.ACTIVE, EmployeeStatus.CONFIRMED, EmployeeStatus.SUSPENDED, EmployeeStatus.NOTICE_PERIOD, EmployeeStatus.SEPARATED],
  [EmployeeStatus.CONFIRMED]: [EmployeeStatus.SUSPENDED, EmployeeStatus.NOTICE_PERIOD, EmployeeStatus.SEPARATED],
  [EmployeeStatus.CONTRACT]: [EmployeeStatus.ACTIVE, EmployeeStatus.NOTICE_PERIOD, EmployeeStatus.SEPARATED],
  [EmployeeStatus.INTERN]: [EmployeeStatus.ACTIVE, EmployeeStatus.SEPARATED],
  [EmployeeStatus.SUSPENDED]: [EmployeeStatus.ACTIVE, EmployeeStatus.NOTICE_PERIOD, EmployeeStatus.SEPARATED],
  [EmployeeStatus.NOTICE_PERIOD]: [EmployeeStatus.SEPARATED],
  [EmployeeStatus.SEPARATED]: [EmployeeStatus.ALUMNI, EmployeeStatus.REHIRED],
  [EmployeeStatus.ALUMNI]: [EmployeeStatus.REHIRED],
  [EmployeeStatus.REHIRED]: [EmployeeStatus.ACTIVE, EmployeeStatus.PROBATION],
};
