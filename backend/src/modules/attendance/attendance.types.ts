import type { BaseDocument } from '@/shared/types/common';

export enum AttendanceSource {
  WEB_PORTAL = 'web_portal',
  MANUAL = 'manual',
  BULK_IMPORT = 'bulk_import',
  SWIPE_API = 'swipe_api',
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  HALF_DAY = 'half_day',
  ON_LEAVE = 'on_leave',
  HOLIDAY = 'holiday',
  WEEKEND = 'weekend',
  WORK_FROM_HOME = 'work_from_home',
}

export enum ExceptionType {
  LATE = 'late',
  EARLY_EXIT = 'early_exit',
  MISSED_PUNCH = 'missed_punch',
  SHORT_HOURS = 'short_hours',
}

export interface AttendanceLog extends BaseDocument {
  employeeId: string;
  companyId: string;
  date: Date;
  shiftId?: string;
  firstInTime?: Date;
  lastOutTime?: Date;
  totalHours?: number;
  status: AttendanceStatus;
  isLate: boolean;
  lateByMinutes?: number;
  isEarlyExit: boolean;
  earlyExitByMinutes?: number;
  overtimeHours?: number;
  source: AttendanceSource;
  isException: boolean;
  exceptionType?: ExceptionType;
  isLocked: boolean;
  regularizationId?: string;
}

export interface RawSwipe {
  _id?: unknown;
  tenantId: string;
  organizationId: string;
  employeeId?: string;
  swipeTime: Date;
  swipeType: 'in' | 'out' | 'unknown';
  source: AttendanceSource;
  ipAddress?: string;
  userAgent?: string;
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;
  geofenceResult?: string;
  selfieS3Key?: string;
  isProcessed: boolean;
  processedAt?: Date;
}

export interface AttendanceException extends BaseDocument {
  employeeId: string;
  companyId: string;
  date: Date;
  exceptionType: ExceptionType;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  reason?: string;
  reviewNote?: string;
}

export interface Shift extends BaseDocument {
  name: string;
  code: string;
  companyId: string;
  startTime: string;
  endTime: string;
  graceMinutesIn: number;
  graceMinutesOut: number;
  halfDayHours: number;
  fullDayHours: number;
  isNightShift: boolean;
  isFlexible: boolean;
}

// DTOs

export interface PunchDto {
  swipeType: 'in' | 'out';
  latitude?: number;
  longitude?: number;
  selfieS3Key?: string;
}

export interface ManualOverrideDto {
  employeeCode: string;
  date: string;
  inTime?: string;
  outTime?: string;
  status?: AttendanceStatus;
  reason?: string;
}

export interface RegularizeDto {
  employeeCode: string;
  date: string;
  inTime?: string;
  outTime?: string;
  reason: string;
}

export interface CreateShiftDto {
  name: string;
  code: string;
  companyId: string;
  startTime: string;
  endTime: string;
  graceMinutesIn?: number;
  graceMinutesOut?: number;
  halfDayHours?: number;
  fullDayHours?: number;
  isNightShift?: boolean;
  isFlexible?: boolean;
}

export interface UpdateShiftDto extends Partial<Omit<CreateShiftDto, 'code' | 'companyId'>> {}

// ── Overtime & Comp-Off ───────────────────────────────────────────────────────

export enum OTStatus {
  PENDING   = 'pending',
  APPROVED  = 'approved',
  REJECTED  = 'rejected',
  CONVERTED = 'converted',
}

export interface OvertimeRecord extends BaseDocument {
  employeeId:      string;
  companyId?:      string;
  date:            Date;
  overtimeHours:   number;
  reason:          string;
  status:          OTStatus;
  compOffGranted?: boolean;
  reviewedBy?:     string;
  reviewedAt?:     Date;
  rejectionNote?:  string;
}

export interface CompOffRecord extends BaseDocument {
  employeeId:    string;
  overtimeId?:   string;
  creditedDays:  number;
  expiryDate:    Date;
  usedDays:      number;
  isActive:      boolean;
}

export interface SubmitOvertimeDto {
  date:          string;
  overtimeHours: number;
  reason:        string;
  companyId?:    string;
}

export interface ApproveOvertimeDto {
  convertToCompOff?: boolean;
}

// ── Shift Assignment ─────────────────────────────────────────────────────────

export interface ShiftAssignment extends BaseDocument {
  employeeId:    string;
  shiftId:       string;
  effectiveFrom: Date;
  effectiveTo?:  Date;
}

export interface AssignShiftDto {
  employeeIds:   string[];
  effectiveFrom: string;
  effectiveTo?:  string;
}
