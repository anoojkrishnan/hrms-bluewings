import { z } from 'zod';

export const createLeaveTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    code: z.string().min(1).toUpperCase(),
    defaultAnnualDays: z.number().int().min(0).optional(),
    isCarryForward: z.boolean().optional(),
    maxCarryForwardDays: z.number().int().min(0).optional(),
    isEncashable: z.boolean().optional(),
    isPaidLeave: z.boolean().optional(),
    requiresDocument: z.boolean().optional(),
    minDaysNotice: z.number().int().min(0).optional(),
    maxConsecutiveDays: z.number().int().min(1).optional(),
  }),
});

export const updateLeaveTypeSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    defaultAnnualDays: z.number().int().min(0).optional(),
    isCarryForward: z.boolean().optional(),
    maxCarryForwardDays: z.number().int().min(0).optional(),
    isEncashable: z.boolean().optional(),
    isPaidLeave: z.boolean().optional(),
    requiresDocument: z.boolean().optional(),
    minDaysNotice: z.number().int().min(0).optional(),
    maxConsecutiveDays: z.number().int().min(1).optional(),
  }),
});

export const applyLeaveSchema = z.object({
  body: z.object({
    employeeCode: z.string().min(1).optional(),
    leaveTypeCode: z.string().min(1),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    isHalfDay: z.boolean().optional(),
    halfDayType: z.enum(['start_half', 'end_half']).optional(),
    reason: z.string().optional(),
  }),
});

export const approveRejectSchema = z.object({
  body: z.object({
    reason: z.string().optional(),
  }),
});

export const revokeSchema = z.object({
  body: z.object({
    reason: z.string().min(1),
  }),
});

export const adjustBalanceSchema = z.object({
  body: z.object({
    leaveTypeCode: z.string().min(1),
    days: z.number().min(0.5),
    field: z.enum(['granted', 'accrued', 'opening']),
    reason: z.string().min(1),
  }),
});

export const createHolidayListSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    year: z.number().int().min(2020).max(2100),
    companyId: z.string().min(1),
    locationIds: z.array(z.string()).optional(),
    isDefault: z.boolean().optional(),
  }),
});

export const createHolidaySchema = z.object({
  body: z.object({
    holidayListId: z.string().min(1),
    name: z.string().min(1),
    date: z.string().datetime(),
    type: z.enum(['national', 'regional', 'optional', 'restricted']),
    description: z.string().optional(),
  }),
});

export const weekendPolicySchema = z.object({
  body: z.object({
    name: z.string().min(1),
    companyId: z.string().min(1),
    workingDays: z.array(z.number().int().min(0).max(6)).min(1),
    firstSaturdayOff: z.boolean().optional(),
    secondSaturdayOff: z.boolean().optional(),
    thirdSaturdayOff: z.boolean().optional(),
    fourthSaturdayOff: z.boolean().optional(),
  }),
});

export const bulkAdjustBalanceSchema = z.object({
  body: z.object({
    leaveTypeCode: z.string().min(1),
    days: z.number().min(0),
    field: z.enum(["opening", "granted"]),
    reason: z.string().min(1),
  }),
});
