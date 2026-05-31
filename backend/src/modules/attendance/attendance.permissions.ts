export const ATTENDANCE_PERMISSIONS = {
  LOG_VIEW: 'attendance.log.view',
  LOG_OVERRIDE: 'attendance.log.override',
  REGULARIZATION_APPROVE: 'attendance.regularization.approve',
  EXCEPTION_VIEW: 'attendance.exception.view',
  EXCEPTION_APPROVE: 'attendance.exception.approve',
  FINALIZE: 'attendance.finalize',
  LOCK: 'attendance.lock',
  BULK_IMPORT: 'attendance.bulk_import',
  SHIFT_CONFIGURE: 'attendance.shift.configure',
  SHIFT_VIEW: 'attendance.shift.view',
} as const;
