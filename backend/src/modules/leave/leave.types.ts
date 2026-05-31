import type { BaseDocument } from '@/shared/types/common';

export enum LeaveApplicationStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  REVOKED = 'revoked',
}

export interface LeaveType extends BaseDocument {
  name: string;
  code: string;
  isCarryForward: boolean;
  maxCarryForwardDays?: number;
  isEncashable: boolean;
  isPaidLeave: boolean;
  requiresDocument: boolean;
  minDaysNotice?: number;
  maxConsecutiveDays?: number;
}

export interface LeaveApplication extends BaseDocument {
  employeeId: string;
  companyId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  isHalfDay: boolean;
  halfDayType?: 'start_half' | 'end_half';
  reason?: string;
  status: LeaveApplicationStatus;
  appliedBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
  revokedBy?: string;
  revokedAt?: Date;
  revocationReason?: string;
  attachmentPublicIds: string[];
}

export interface LeaveBalance {
  tenantId: string;
  organizationId: string;
  employeeId: string;
  leaveTypeId: string;
  leaveYear: number;
  openingBalance: number;
  accrued: number;
  granted: number;
  taken: number;
  encashed: number;
  lapsed: number;
  closingBalance: number;
  lastUpdatedAt: Date;
}

// Holiday sub-module

export interface HolidayList extends BaseDocument {
  name: string;
  year: number;
  companyId: string;
  locationIds: string[];
  isDefault: boolean;
}

export interface Holiday extends BaseDocument {
  holidayListId: string;
  name: string;
  date: Date;
  type: 'national' | 'regional' | 'optional' | 'restricted';
  description?: string;
}

export interface WeekendPolicy extends BaseDocument {
  name: string;
  companyId: string;
  workingDays: number[];
  firstSaturdayOff: boolean;
  secondSaturdayOff: boolean;
  thirdSaturdayOff: boolean;
  fourthSaturdayOff: boolean;
}

// DTOs

export interface CreateLeaveTypeDto {
  name: string;
  code: string;
  isCarryForward?: boolean;
  maxCarryForwardDays?: number;
  isEncashable?: boolean;
  isPaidLeave?: boolean;
  requiresDocument?: boolean;
  minDaysNotice?: number;
  maxConsecutiveDays?: number;
}

export interface UpdateLeaveTypeDto extends Partial<CreateLeaveTypeDto> {}

export interface ApplyLeaveDto {
  employeeCode: string;
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  isHalfDay?: boolean;
  halfDayType?: 'start_half' | 'end_half';
  reason?: string;
}

export interface AdjustBalanceDto {
  leaveTypeCode: string;
  days: number;
  field: 'granted' | 'accrued' | 'opening';
  reason: string;
}

export interface CreateHolidayListDto {
  name: string;
  year: number;
  companyId: string;
  locationIds?: string[];
  isDefault?: boolean;
}

export interface CreateHolidayDto {
  holidayListId: string;
  name: string;
  date: string;
  type: 'national' | 'regional' | 'optional' | 'restricted';
  description?: string;
}

export interface UpsertWeekendPolicyDto {
  name: string;
  companyId: string;
  workingDays: number[];
  firstSaturdayOff?: boolean;
  secondSaturdayOff?: boolean;
  thirdSaturdayOff?: boolean;
  fourthSaturdayOff?: boolean;
}
