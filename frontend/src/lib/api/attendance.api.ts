import { get, getList, post, put, patch } from './client';

export interface AttendanceLog {
  publicId: string;
  employeeId: string;
  date: string;
  firstInTime?: string;
  lastOutTime?: string;
  totalHours?: number;
  status: string;
  isLate: boolean;
  lateByMinutes?: number;
  isEarlyExit: boolean;
  earlyExitByMinutes?: number;
  source: string;
  isException: boolean;
  isLocked: boolean;
}

export interface AttendanceException {
  publicId: string;
  employeeId: string;
  date: string;
  exceptionType: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedBy: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reason?: string;
  reviewNote?: string;
  createdAt: string;
}

export interface Shift {
  publicId: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  graceMinutesIn: number;
  graceMinutesOut: number;
  halfDayHours: number;
  fullDayHours: number;
  isNightShift: boolean;
  isFlexible: boolean;
  isActive: boolean;
}

export const attendanceApi = {
  // Logs
  list: (params?: Record<string, string>) =>
    getList<AttendanceLog>('/attendance', { params }),

  getLog: (employeeCode: string, date: string) =>
    get<AttendanceLog>(`/attendance/${employeeCode}/${date}`),

  // Punch (ESS)
  punch: (dto: {
    swipeType: 'in' | 'out';
    latitude?: number;
    longitude?: number;
  }) => post<AttendanceLog>('/attendance/punch', dto),

  // Manual override (HR)
  override: (dto: {
    employeeCode: string;
    date: string;
    inTime?: string;
    outTime?: string;
    status?: string;
    reason?: string;
  }) => post<AttendanceLog>('/attendance/override', dto),

  // Exceptions
  listExceptions: (params?: { status?: string }) =>
    getList<AttendanceException>('/attendance/exceptions', { params }),

  approveException: (publicId: string) =>
    patch<AttendanceException>(`/attendance/exceptions/${publicId}/approve`),

  rejectException: (publicId: string, note: string) =>
    patch<AttendanceException>(`/attendance/exceptions/${publicId}/reject`, { note }),

  // Regularization
  regularize: (dto: {
    employeeCode: string;
    date: string;
    inTime?: string;
    outTime?: string;
    reason: string;
  }) => post<AttendanceException>('/attendance/regularize', dto),

  // Shifts
  listShifts: () => get<Shift[]>('/attendance/shifts'),

  createShift: (dto: Partial<Shift>) => post<Shift>('/attendance/shifts', dto),

  updateShift: (publicId: string, dto: Partial<Shift>) =>
    put<Shift>(`/attendance/shifts/${publicId}`, dto),

  // Lock
  lockDate: (companyId: string, date: string) =>
    post<void>('/attendance/lock', { companyId, date }),

  // Shift assignments
  listShiftAssignments: (shiftPublicId: string) => get<unknown[]>(`/attendance/shifts/${shiftPublicId}/assignments`),
  assignShift: (shiftPublicId: string, dto: { employeeIds: string[]; effectiveFrom: string; effectiveTo?: string }) =>
    post<unknown[]>(`/attendance/shifts/${shiftPublicId}/assign`, dto),

  // Overtime & Comp-Off
  listOvertime: (params?: Record<string, unknown>) => get<unknown[]>('/attendance/overtime', { params }),
  submitOvertime: (dto: { date: string; overtimeHours: number; reason: string; companyId?: string }) =>
    post<unknown>('/attendance/overtime', dto),
  approveOvertime: (publicId: string, convertToCompOff: boolean) =>
    patch<unknown>(`/attendance/overtime/${publicId}/approve`, { convertToCompOff }),
  rejectOvertime: (publicId: string, note?: string) =>
    patch<unknown>(`/attendance/overtime/${publicId}/reject`, { note }),
  getCompOffBalance: () => get<{ balance: number; records: unknown[] }>('/attendance/comp-off'),
};
