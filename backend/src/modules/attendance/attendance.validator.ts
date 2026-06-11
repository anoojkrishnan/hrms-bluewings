import { z } from 'zod';
import { AttendanceStatus, ExceptionType } from './attendance.types';

export const punchSchema = z.object({
  body: z.object({
    swipeType: z.enum(['in', 'out']),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    selfieS3Key: z.string().optional(),
  }),
});

export const manualOverrideSchema = z.object({
  body: z.object({
    employeeCode: z.string().min(1),
    date: z.string().datetime(),
    inTime: z.string().datetime().optional(),
    outTime: z.string().datetime().optional(),
    status: z.nativeEnum(AttendanceStatus).optional(),
    reason: z.string().optional(),
  }),
});

export const regularizeSchema = z.object({
  body: z.object({
    employeeCode: z.string().min(1),
    date: z.string().datetime(),
    inTime: z.string().datetime().optional(),
    outTime: z.string().datetime().optional(),
    reason: z.string().min(1),
  }),
});

export const createExceptionSchema = z.object({
  body: z.object({
    employeeCode: z.string().min(1),
    date: z.string().datetime(),
    exceptionType: z.nativeEnum(ExceptionType),
    reason: z.string().min(1),
  }),
});

export const reviewExceptionSchema = z.object({
  body: z.object({
    note: z.string().optional(),
  }),
});

export const lockDateSchema = z.object({
  body: z.object({
    companyId: z.string().min(1),
    date: z.string().datetime(),
  }),
});

export const createShiftSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    companyId: z.string().min(1),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    graceMinutesIn: z.number().int().min(0).optional(),
    graceMinutesOut: z.number().int().min(0).optional(),
    halfDayHours: z.number().min(0).optional(),
    fullDayHours: z.number().min(0).optional(),
    isNightShift: z.boolean().optional(),
    isFlexible: z.boolean().optional(),
  }),
});

export const updateShiftSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    graceMinutesIn: z.number().int().min(0).optional(),
    graceMinutesOut: z.number().int().min(0).optional(),
    halfDayHours: z.number().min(0).optional(),
    fullDayHours: z.number().min(0).optional(),
    isNightShift: z.boolean().optional(),
    isFlexible: z.boolean().optional(),
  }),
});

// ── Overtime ─────────────────────────────────────────────────────────────────

export const submitOvertimeSchema = z.object({
  body: z.object({
    date:          z.string().datetime(),
    overtimeHours: z.number().min(0.5).max(24),
    reason:        z.string().min(5).max(500),
    companyId:     z.string().optional(),
  }),
});

export const approveOvertimeSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    convertToCompOff: z.boolean().default(false),
  }),
});

// ── Shift Assignment ──────────────────────────────────────────────────────────

export const assignShiftSchema = z.object({
  params: z.object({ publicId: z.string().min(1) }),
  body: z.object({
    employeeIds:   z.array(z.string().min(1)).min(1),
    effectiveFrom: z.string().datetime(),
    effectiveTo:   z.string().datetime().optional(),
  }),
});
