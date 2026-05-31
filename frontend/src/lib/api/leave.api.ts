import { get, getList, post, put, patch } from './client';

export interface LeaveType {
  publicId: string;
  name: string;
  code: string;
  isCarryForward: boolean;
  maxCarryForwardDays?: number;
  isEncashable: boolean;
  isPaidLeave: boolean;
  requiresDocument: boolean;
  minDaysNotice?: number;
  maxConsecutiveDays?: number;
  isActive: boolean;
}

export interface LeaveApplication {
  publicId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay: boolean;
  halfDayType?: 'start_half' | 'end_half';
  reason?: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'cancelled' | 'revoked';
  appliedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  revokedBy?: string;
  revokedAt?: string;
  revocationReason?: string;
  createdAt: string;
}

export interface LeaveBalance {
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
}

export interface Holiday {
  publicId: string;
  holidayListId: string;
  name: string;
  date: string;
  type: 'national' | 'regional' | 'optional' | 'restricted';
  description?: string;
}

export interface ApplyLeaveDto {
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  reason?: string;
  isHalfDay?: boolean;
  halfDayType?: 'start_half' | 'end_half';
}

export const leaveApi = {
  // Leave types
  listTypes: () => get<LeaveType[]>('/leave/types'),
  createType: (dto: Partial<LeaveType>) => post<LeaveType>('/leave/types', dto),
  updateType: (publicId: string, dto: Partial<LeaveType>) =>
    put<LeaveType>(`/leave/types/${publicId}`, dto),

  // Applications
  listApplications: (params?: Record<string, string>) =>
    getList<LeaveApplication>('/leave/applications', { params }),

  getApplication: (publicId: string) =>
    get<LeaveApplication>(`/leave/applications/${publicId}`),

  apply: (dto: ApplyLeaveDto) =>
    post<LeaveApplication>('/leave/applications', dto),

  approve: (publicId: string) =>
    patch<LeaveApplication>(`/leave/applications/${publicId}/approve`),

  reject: (publicId: string, reason: string) =>
    patch<LeaveApplication>(`/leave/applications/${publicId}/reject`, { reason }),

  cancel: (publicId: string) =>
    patch<LeaveApplication>(`/leave/applications/${publicId}/cancel`),

  revoke: (publicId: string, reason: string) =>
    patch<LeaveApplication>(`/leave/applications/${publicId}/revoke`, { reason }),

  // Balances
  getMyBalance: () => get<LeaveBalance[]>('/leave/balances'),

  getBalance: (employeeCode: string, year?: number) =>
    get<LeaveBalance[]>(`/leave/balances/${employeeCode}`, { params: year ? { year } : undefined }),

  adjustBalance: (employeeCode: string, dto: {
    leaveTypeCode: string;
    days: number;
    field: 'granted' | 'accrued' | 'opening';
    reason?: string;
  }) => put<void>(`/leave/balances/${employeeCode}/adjust`, dto),

  // Calendar
  getCalendar: (companyId: string, month: number, year: number) =>
    get<{ date: string; type: string; label: string }[]>('/leave/calendar', {
      params: { companyId, month, year },
    }),

  // Holidays
  listHolidays: (params?: { holidayListId?: string }) =>
    get<Holiday[]>('/leave/holidays', { params }),

  createHoliday: (dto: Partial<Holiday>) => post<Holiday>('/leave/holidays', dto),
};
